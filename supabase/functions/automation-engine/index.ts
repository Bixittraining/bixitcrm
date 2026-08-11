// The Automation Engine — the ONLY place a CRM event is turned into
// executed actions. Nothing about workflow matching, condition checks, or
// action execution happens on the frontend; the client only ever tells
// this function "something happened" (mode: 'trigger') or "retry this one
// failed action" (mode: 'retry'), and this function decides what runs,
// using the service-role client so RLS can stay locked down without
// blocking the engine itself.
//
// CRM ACTION -> CRM EVENT (automation_events, written by src/lib/
// automation.js) -> AUTOMATION ENGINE (this file) -> TRIGGER MATCH ->
// CONDITION CHECK -> ACTION EXECUTION -> AUTOMATION LOG
// (automation_executions/automation_execution_actions) -> TIMELINE
// (lead_activities). See supabase/functions/_shared/automationLib.ts for
// the condition/action logic itself.
//
// mode: 'trigger'        — { eventId } — process one automation_events row
// mode: 'retry'          — { executionActionId } — re-run one failed action (admin/manager only, checked here server-side)
// mode: 'run_scheduled'  — {} — execute any delayed/business-hours-deferred actions whose run_at has passed

import { getAdminClient, json } from '../_shared/lib.ts'
import { actionLabel, evaluateConditions, isWithinBusinessHours, logActivity, runAction } from '../_shared/automationLib.ts'

// deno-lint-ignore no-explicit-any
async function handleTrigger(admin: any, body: { eventId?: number }) {
  const { eventId } = body
  if (!eventId) return json({ error: 'eventId is required' }, 400)

  const { data: event, error: eventErr } = await admin.from('automation_events').select('*').eq('id', eventId).maybeSingle()
  if (eventErr) return json({ error: eventErr.message }, 500)
  if (!event) return json({ error: 'Event not found' }, 404)

  // Every trigger this phase supports is a lead-lifecycle event — other
  // entity types (student/staff attendance) simply match zero workflows
  // today, so there's nothing to do for them here.
  if (event.entity_type !== 'lead') return json({ matched: 0, reason: 'Only lead events drive workflows in this phase' })

  const { data: workflows, error: wfErr } = await admin
    .from('automation_workflows')
    .select('*, automation_workflow_conditions(*), automation_workflow_actions(*)')
    .eq('trigger_event', event.event_type)
    .eq('status', 'active')
  if (wfErr) return json({ error: wfErr.message }, 500)
  if (!workflows || workflows.length === 0) return json({ matched: 0 })

  const leadId = Number(event.entity_id)
  const { data: lead, error: leadErr } = await admin.from('leads').select('*').eq('id', leadId).maybeSingle()
  if (leadErr) return json({ error: leadErr.message }, 500)
  // Test scenario: "Lead deleted/archived -> workflow handles safely".
  if (!lead) return json({ matched: workflows.length, skipped: true, reason: 'Lead no longer exists' })

  const { data: settingsRow } = await admin.from('automation_settings').select('*').eq('id', true).maybeSingle()

  // deno-lint-ignore no-explicit-any
  const results: any[] = []
  for (const wf of workflows) {
    // deno-lint-ignore no-explicit-any
    const conditions = (wf.automation_workflow_conditions || []).slice().sort((a: any, b: any) => a.position - b.position)
    const matched = await evaluateConditions(admin, lead, conditions)
    if (!matched) { results.push({ workflowId: wf.id, matched: false }); continue }

    // Idempotency (spec section 9): unique(workflow_id, event_id) means a
    // second attempt at this exact event for this exact workflow can never
    // create a second execution — it just hits a 23505 conflict here.
    const { data: execution, error: execErr } = await admin
      .from('automation_executions')
      .insert({ workflow_id: wf.id, workflow_name: wf.name, event_id: event.id, trigger_event: event.event_type, entity_type: 'lead', lead_id: lead.id, status: 'running' })
      .select()
      .single()
    if (execErr) {
      if (execErr.code === '23505') { results.push({ workflowId: wf.id, duplicate: true }); continue }
      results.push({ workflowId: wf.id, error: execErr.message })
      continue
    }

    // deno-lint-ignore no-explicit-any
    const actions = (wf.automation_workflow_actions || []).slice().sort((a: any, b: any) => a.position - b.position)
    // deno-lint-ignore no-explicit-any
    const actionSummaries: any[] = []

    for (const action of actions) {
      const isComm = action.action_type === 'send_whatsapp' || action.action_type === 'send_email'
      const deferredForHours = isComm && settingsRow && !isWithinBusinessHours(settingsRow)
      const shouldDefer = (action.delay_minutes || 0) > 0 || deferredForHours
      const runAt = shouldDefer ? new Date(Date.now() + (action.delay_minutes || 0) * 60000).toISOString() : new Date().toISOString()

      const { data: eaRow, error: eaErr } = await admin
        .from('automation_execution_actions')
        .insert({
          execution_id: execution.id, action_id: action.id, action_type: action.action_type, config: action.config,
          status: shouldDefer ? 'scheduled' : 'running', run_at: runAt, started_at: shouldDefer ? null : new Date().toISOString(),
        })
        .select()
        .single()
      if (eaErr) { actionSummaries.push({ actionType: action.action_type, status: 'failed', error: eaErr.message }); continue }
      if (shouldDefer) { actionSummaries.push({ actionType: action.action_type, status: 'scheduled' }); continue }

      const outcome = await runAction(admin, action, { lead, workflowName: wf.name })
      await admin.from('automation_execution_actions').update({
        status: outcome.status, result: outcome.result || null, error: outcome.error || null, completed_at: new Date().toISOString(),
      }).eq('id', eaRow.id)
      actionSummaries.push({ actionType: action.action_type, status: outcome.status, error: outcome.error })
    }

    // A still-scheduled action means this execution isn't done yet —
    // run_scheduled will finish it later and recompute this same status.
    const hasScheduled = actionSummaries.some((a) => a.status === 'scheduled')
    const settled = actionSummaries.filter((a) => a.status !== 'scheduled')
    let overallStatus: string
    if (hasScheduled) overallStatus = 'running'
    else if (settled.every((a) => a.status === 'success' || a.status === 'skipped')) overallStatus = 'completed'
    else if (settled.some((a) => a.status === 'success' || a.status === 'skipped')) overallStatus = 'partially_failed'
    else overallStatus = 'failed'

    await admin.from('automation_executions').update({
      status: overallStatus, completed_at: hasScheduled ? null : new Date().toISOString(),
    }).eq('id', execution.id)
    await admin.from('automation_workflows').update({ last_run_at: new Date().toISOString() }).eq('id', wf.id)

    // One readable timeline entry per execution (spec section 17) — never
    // one entry per action; a rep should see "what ran", not a wall of text.
    await logActivity(
      admin, lead.id, lead.status, lead.status,
      `Automation executed: "${wf.name}" — ${actionSummaries.map((a) => actionLabel(a.actionType)).join(', ')}`,
      'AUTOMATION'
    )

    results.push({ workflowId: wf.id, executionId: execution.id, status: overallStatus, actions: actionSummaries })
  }

  return json({ matched: workflows.length, results })
}

// deno-lint-ignore no-explicit-any
async function handleRunScheduled(admin: any) {
  const { data: due, error } = await admin
    .from('automation_execution_actions')
    .select('*, automation_executions(*)')
    .eq('status', 'scheduled')
    .lte('run_at', new Date().toISOString())
    .limit(50)
  if (error) return json({ error: error.message }, 500)
  if (!due || due.length === 0) return json({ processed: 0 })

  const { data: settingsRow } = await admin.from('automation_settings').select('*').eq('id', true).maybeSingle()
  let processed = 0

  // deno-lint-ignore no-explicit-any
  for (const ea of due as any[]) {
    const execution = ea.automation_executions
    if (!execution) continue

    const { data: lead } = await admin.from('leads').select('*').eq('id', execution.lead_id).maybeSingle()
    if (!lead) {
      await admin.from('automation_execution_actions').update({ status: 'skipped', error: 'Lead no longer exists', completed_at: new Date().toISOString() }).eq('id', ea.id)
      processed++
      continue
    }

    const isComm = ea.action_type === 'send_whatsapp' || ea.action_type === 'send_email'
    if (isComm && settingsRow && !isWithinBusinessHours(settingsRow)) continue // still outside business hours — try again on the next sweep

    await admin.from('automation_execution_actions').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', ea.id)
    const outcome = await runAction(admin, { action_type: ea.action_type, config: ea.config }, { lead, workflowName: execution.workflow_name })
    await admin.from('automation_execution_actions').update({
      status: outcome.status, result: outcome.result || null, error: outcome.error || null, completed_at: new Date().toISOString(),
    }).eq('id', ea.id)
    processed++

    await recomputeExecutionStatus(admin, execution.id)
  }

  return json({ processed })
}

// deno-lint-ignore no-explicit-any
async function recomputeExecutionStatus(admin: any, executionId: number) {
  const { data: siblings } = await admin.from('automation_execution_actions').select('status').eq('execution_id', executionId)
  if (!siblings) return
  // deno-lint-ignore no-explicit-any
  const stillPending = siblings.some((s: any) => s.status === 'scheduled' || s.status === 'pending' || s.status === 'running')
  if (stillPending) return
  // deno-lint-ignore no-explicit-any
  const anySuccess = siblings.some((s: any) => s.status === 'success' || s.status === 'skipped')
  // deno-lint-ignore no-explicit-any
  const anyFailed = siblings.some((s: any) => s.status === 'failed')
  const overallStatus = !anyFailed ? 'completed' : anySuccess ? 'partially_failed' : 'failed'
  await admin.from('automation_executions').update({ status: overallStatus, completed_at: new Date().toISOString() }).eq('id', executionId)
}

// deno-lint-ignore no-explicit-any
async function handleRetry(admin: any, req: Request, body: { executionActionId?: number }) {
  // Authorization happens here, server-side, against the caller's own JWT
  // — never trusted from the request body. Matches spec section 19/12:
  // only an admin/manager (see ROLE_PERMISSIONS.automation.retry in
  // src/lib/permissions.js) may retry a failed action.
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Unauthorized' }, 401)
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return json({ error: 'You do not have permission to retry automation actions' }, 403)
  }

  const { executionActionId } = body
  if (!executionActionId) return json({ error: 'executionActionId is required' }, 400)

  const { data: ea, error: eaErr } = await admin
    .from('automation_execution_actions')
    .select('*, automation_executions(*)')
    .eq('id', executionActionId)
    .maybeSingle()
  if (eaErr) return json({ error: eaErr.message }, 500)
  if (!ea) return json({ error: 'Execution action not found' }, 404)
  // "Do not retry successful actions unnecessarily" — only a failed action
  // is retryable; this also blocks retrying something already mid-retry.
  if (ea.status !== 'failed') return json({ error: 'Only a failed action can be retried' }, 400)

  const execution = ea.automation_executions
  const { data: lead } = await admin.from('leads').select('*').eq('id', execution.lead_id).maybeSingle()
  if (!lead) return json({ error: 'Lead no longer exists — cannot retry' }, 409)

  await admin.from('automation_execution_actions').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', ea.id)
  const outcome = await runAction(admin, { action_type: ea.action_type, config: ea.config }, { lead, workflowName: execution.workflow_name })
  await admin.from('automation_execution_actions').update({
    status: outcome.status, result: outcome.result || null, error: outcome.error || null,
    completed_at: new Date().toISOString(), retry_count: (ea.retry_count || 0) + 1,
  }).eq('id', ea.id)

  await recomputeExecutionStatus(admin, execution.id)

  return json({ status: outcome.status, error: outcome.error || null })
}

Deno.serve(async (req) => {
  // deno-lint-ignore no-explicit-any
  let admin: any
  try {
    admin = getAdminClient()
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const mode = body.mode || 'trigger'
  if (mode === 'trigger') return handleTrigger(admin, body)
  if (mode === 'run_scheduled') return handleRunScheduled(admin)
  if (mode === 'retry') return handleRetry(admin, req, body)
  return json({ error: `Unknown mode "${mode}"` }, 400)
})
