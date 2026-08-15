// Shared by supabase/functions/automation-engine — condition evaluation,
// action execution, and the business-hours check, kept out of index.ts so
// the request-routing (trigger/retry/run_scheduled) stays readable on its
// own. send_whatsapp/send_email call the same Meta Graph API / Gmail SMTP
// providers as the manual-send endpoints (api/whatsapp/send.js,
// api/email/send.js) using the service-role client — there's no logged-in
// user here, so message rows are attributed to "Automation" instead of a
// team member. If the 'whatsapp'/'email' row in `integrations` isn't
// configured yet, the action resolves to 'skipped', not 'failed' — that's
// an admin setup gap, not a broken workflow.

import nodemailer from 'npm:nodemailer@6'
import { getCourseSyllabus, getIntegrationConfig, logAudit } from './lib.ts'

// deno-lint-ignore no-explicit-any
type AdminClient = any

const GRAPH_API_VERSION = 'v21.0'

export const ACTION_TYPE_LABELS: Record<string, string> = {
  assign_lead: 'Lead assigned',
  create_follow_up: 'Follow-up created',
  create_task: 'Task created',
  change_lead_status: 'Status changed',
  add_note: 'Note added',
  create_internal_notification: 'Internal notification',
  send_whatsapp: 'WhatsApp',
  send_email: 'Email',
}
export function actionLabel(actionType: string) { return ACTION_TYPE_LABELS[actionType] || actionType }

// ── CONDITIONS (the IF step) ────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function getConditionFieldValue(admin: AdminClient, lead: any, field: string): Promise<string | number | null> {
  switch (field) {
    case 'source': return lead.source ?? ''
    case 'course': return lead.course ?? ''
    case 'status': return lead.status ?? ''
    case 'priority': return lead.priority ?? ''
    case 'assigned_to': return lead.assigned_to ?? ''
    case 'package': {
      if (!lead.course) return ''
      const { data } = await admin.from('packages').select('name').ilike('name', lead.course).maybeSingle()
      return data?.name ?? ''
    }
    case 'lead_value': {
      const { data: invoice } = await admin.from('invoices').select('amount').eq('student', lead.name).eq('course', lead.course).maybeSingle()
      if (invoice?.amount) return Number(invoice.amount)
      if (!lead.course) return 0
      const { data: pkg } = await admin.from('packages').select('price').ilike('name', lead.course).maybeSingle()
      return Number(pkg?.price ?? 0)
    }
    case 'followup_status': {
      const { data: rows } = await admin.from('follow_ups').select('status, date').eq('lead_id', lead.id)
      if (!rows || rows.length === 0) return 'none'
      // deno-lint-ignore no-explicit-any
      const pending = rows.filter((r: any) => r.status === 'pending')
      if (pending.length === 0) return 'completed'
      const today = new Date().toISOString().slice(0, 10)
      // deno-lint-ignore no-explicit-any
      return pending.some((r: any) => r.date < today) ? 'overdue' : 'pending'
    }
    case 'payment_status': {
      const { data: invoice } = await admin.from('invoices').select('paid, balance').eq('student', lead.name).eq('course', lead.course).maybeSingle()
      if (!invoice) return 'none'
      if (Number(invoice.paid) <= 0) return 'pending'
      if (Number(invoice.balance) > 0) return 'partial'
      return 'paid'
    }
    case 'days_since_created': {
      if (!lead.date) return null
      return Math.floor((Date.now() - new Date(`${lead.date}T00:00:00`).getTime()) / 86400000)
    }
    case 'days_since_last_activity': {
      const { data } = await admin.from('lead_activities').select('created_at').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      const ref = data?.created_at || (lead.date ? `${lead.date}T00:00:00` : null)
      if (!ref) return null
      return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000)
    }
    default: return null
  }
}

function compareValues(fieldValue: string | number | null, operator: string, raw: string | null): boolean {
  const isEmpty = fieldValue === null || fieldValue === undefined || fieldValue === ''
  if (operator === 'is_empty') return isEmpty
  if (operator === 'is_not_empty') return !isEmpty
  if (isEmpty) return false // nothing to compare equals/contains/greater/less against

  const fvNum = Number(fieldValue)
  const cvNum = Number(raw)
  const numeric = raw !== null && raw !== '' && !Number.isNaN(fvNum) && !Number.isNaN(cvNum)

  switch (operator) {
    case 'equals':
      return numeric ? fvNum === cvNum : String(fieldValue).toLowerCase() === String(raw ?? '').toLowerCase()
    case 'not_equals':
      return numeric ? fvNum !== cvNum : String(fieldValue).toLowerCase() !== String(raw ?? '').toLowerCase()
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(raw ?? '').toLowerCase())
    case 'greater_than':
      return numeric && fvNum > cvNum
    case 'less_than':
      return numeric && fvNum < cvNum
    default:
      return false
  }
}

// AND-only, deliberately (spec: "do not create a complicated visual
// programming system") — every configured condition must match.
export async function evaluateConditions(
  admin: AdminClient,
  // deno-lint-ignore no-explicit-any
  lead: any,
  // deno-lint-ignore no-explicit-any
  conditions: any[]
): Promise<boolean> {
  for (const cond of conditions) {
    const fieldValue = await getConditionFieldValue(admin, lead, cond.field)
    if (!compareValues(fieldValue, cond.operator, cond.value)) return false
  }
  return true
}

// ── BUSINESS HOURS ───────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
export function isWithinBusinessHours(settings: any, now = new Date()): boolean {
  if (!settings?.business_hours_enabled) return true
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone || 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  })
  const parts = fmt.formatToParts(now)
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value)
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dow = weekdayStr ? weekdayMap[weekdayStr] : null
  if (dow === null || !(settings.business_days || []).includes(dow)) return false
  const [startH, startM] = String(settings.business_hours_start).split(':').map(Number)
  const [endH, endM] = String(settings.business_hours_end).split(':').map(Number)
  const nowMin = hour * 60 + minute
  return nowMin >= startH * 60 + startM && nowMin < endH * 60 + endM
}

// ── TIMELINE ──────────────────────────────────────────────────────────
// Mirrors DataContext's addActivity, but for the Edge Function's
// service-role client (there's no logged-in user to attribute this to —
// it genuinely is the automation system acting).
export async function logActivity(
  admin: AdminClient,
  leadId: number,
  fromStatus: string | null,
  toStatus: string | null,
  description: string,
  activityType: string | null
) {
  const { error } = await admin.from('lead_activities').insert({
    lead_id: leadId, from_status: fromStatus || null, to_status: toStatus || null,
    description, actor_id: null, actor_name: 'Automation', activity_type: activityType || null,
  })
  if (error) console.error('automationLib logActivity error', error)
}

// ── ACTIONS (the THEN step) ──────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
export async function runAction(admin: AdminClient, action: any, ctx: { lead: any; workflowName: string }) {
  const { lead, workflowName } = ctx
  try {
    switch (action.action_type) {
      case 'assign_lead': {
        let teamMemberId = action.config?.mode === 'specific' ? action.config?.teamMemberId : null
        if (!teamMemberId) {
          const { data } = await admin.rpc('assign_next_sales_rep')
          teamMemberId = data || null
        }
        if (!teamMemberId) return { status: 'skipped', error: 'No sales executive available to assign' }
        const { error } = await admin.from('leads').update({ assigned_to: teamMemberId }).eq('id', lead.id)
        if (error) throw error
        await logActivity(admin, lead.id, lead.status, lead.status, `Automation "${workflowName}" assigned this lead`, 'LEAD_ASSIGNED')
        return { status: 'success', result: { assignedTo: teamMemberId } }
      }
      // A "Task" is a follow-up in this CRM's data model — same table,
      // same lifecycle, just a friendlier label in the workflow builder so
      // an admin isn't forced to think in "follow-up" terminology for
      // something that's really a generic to-do (e.g. "onboarding call").
      case 'create_follow_up':
      case 'create_task': {
        const type = action.config?.type || 'call'
        const delayDays = Number(action.config?.delayDays) || 0
        const date = new Date(Date.now() + delayDays * 86400000).toISOString().slice(0, 10)
        const { data, error } = await admin.from('follow_ups').insert({
          lead: lead.name, lead_id: lead.id, type, date, time: '10:00 AM',
          notes: action.config?.notes || (action.action_type === 'create_task' ? 'Automated task' : 'Automated follow-up'),
          status: 'pending', priority: lead.priority || 'medium', assigned_to: lead.assigned_to || null,
        }).select().single()
        if (error) throw error
        await logActivity(admin, lead.id, lead.status, lead.status, `Automation "${workflowName}" scheduled a ${type} follow-up`, 'FOLLOWUP_CREATED')
        return { status: 'success', result: { followUpId: data.id } }
      }
      case 'change_lead_status': {
        const status = action.config?.status
        if (!status) return { status: 'skipped', error: 'No target status configured' }
        if (status === lead.status) return { status: 'skipped', error: 'Lead is already at this status' }
        const { error } = await admin.from('leads').update({ status }).eq('id', lead.id)
        if (error) throw error
        await logActivity(admin, lead.id, lead.status, status, `Automation "${workflowName}" changed status to ${status}`, 'STATUS_CHANGED')
        return { status: 'success', result: { newStatus: status } }
      }
      case 'add_note': {
        const text = action.config?.text || `Note added by automation "${workflowName}"`
        const { error } = await admin.from('lead_notes').insert({ lead_id: lead.id, text, author_name: `Automation: ${workflowName}` })
        if (error) throw error
        return { status: 'success' }
      }
      case 'create_internal_notification': {
        const message = action.config?.message || `Automation "${workflowName}" triggered a notification`
        await logActivity(admin, lead.id, lead.status, lead.status, message, 'AUTOMATION')
        return { status: 'success' }
      }
      case 'send_whatsapp': {
        const phone = lead.phone
        if (!phone) return { status: 'skipped', error: 'Lead has no phone number' }
        const body = (action.config?.message || '').trim()
        if (!body) return { status: 'skipped', error: 'No message configured' }

        const { data: integration, error: cfgErr } = await getIntegrationConfig(admin, 'whatsapp')
        if (cfgErr) return { status: 'skipped', error: `WhatsApp integration lookup failed: ${cfgErr}` }
        if (!integration.page_id || !integration.page_access_token) {
          return { status: 'skipped', error: 'WhatsApp integration is not configured yet' }
        }

        const graphRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${integration.page_id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${integration.page_access_token}` },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }),
        })
        const graphBody = await graphRes.json()
        if (!graphRes.ok || graphBody.error) {
          const message = graphBody.error?.message || 'Failed to send WhatsApp message'
          await logAudit(admin, 'whatsapp', 'Automation message failed', `To ${phone} (workflow "${workflowName}"): ${message}`, 'failed')
          return { status: 'failed', error: message }
        }

        const wamid = graphBody.messages?.[0]?.id
        const { data: conversation } = await admin.from('whatsapp_conversations').select('lead_id').eq('phone', phone).maybeSingle()
        await admin.from('whatsapp_messages').insert({
          phone, lead_id: conversation?.lead_id ?? lead.id, direction: 'outbound', sender: 'bot', body, wamid,
        })
        await admin.from('whatsapp_conversations').upsert({
          phone, lead_id: conversation?.lead_id ?? lead.id, mode: 'bot',
          last_message: body, last_message_at: new Date().toISOString(), unread_count: 0, updated_at: new Date().toISOString(),
        })
        await logAudit(admin, 'whatsapp', 'Automation message sent', `To ${phone} via workflow "${workflowName}"`, 'success')
        return { status: 'success', result: { wamid } }
      }
      case 'send_email': {
        const to = lead.email
        if (!to) return { status: 'skipped', error: 'Lead has no email address' }
        const subject = (action.config?.subject || '').trim()
        let body = (action.config?.message || '').trim()
        if (!subject || !body) return { status: 'skipped', error: 'No subject/message configured' }

        // Course-aware, on purpose: config.message is one static string an
        // admin wrote once, but "which course" is per-lead — this appends
        // the real syllabus (course_modules, admin-maintained under
        // Packages) instead of asking the admin to hand-write a syllabus
        // into every workflow's static text.
        if (action.config?.includeSyllabus) {
          const syllabus = await getCourseSyllabus(admin, lead.course)
          if (syllabus) {
            const list = syllabus.moduleNames.map((name: string, i: number) => `${i + 1}. ${name}`).join('\n')
            body += `\n\nHere's the syllabus for ${syllabus.packageName}:\n${list}`
          }
        }

        const { data: integration, error: cfgErr } = await getIntegrationConfig(admin, 'email')
        if (cfgErr) return { status: 'skipped', error: `Email integration lookup failed: ${cfgErr}` }
        if (!integration.page_id || !integration.page_access_token) {
          return { status: 'skipped', error: 'Email integration is not configured yet' }
        }

        const fromEmail = integration.page_id
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com', port: 465, secure: true,
          auth: { user: integration.page_id, pass: integration.page_access_token },
        })

        try {
          await transporter.sendMail({ from: `"${workflowName}" <${fromEmail}>`, to, subject, text: body })
        } catch (err) {
          const message = (err as Error).message
          await admin.from('email_messages').insert({
            lead_id: lead.id, to_email: to, from_email: fromEmail, subject, body,
            sender_name: `Automation: ${workflowName}`, status: 'failed', error: message,
          })
          await logAudit(admin, 'email', 'Automation email failed', `To ${to} (workflow "${workflowName}"): ${message}`, 'failed')
          return { status: 'failed', error: message }
        }

        await admin.from('email_messages').insert({
          lead_id: lead.id, to_email: to, from_email: fromEmail, subject, body,
          sender_name: `Automation: ${workflowName}`, status: 'sent',
        })
        await logAudit(admin, 'email', 'Automation email sent', `To ${to} via workflow "${workflowName}"`, 'success')
        return { status: 'success' }
      }
      default:
        return { status: 'failed', error: `Unknown action type "${action.action_type}"` }
    }
  } catch (err) {
    return { status: 'failed', error: (err as Error).message }
  }
}
