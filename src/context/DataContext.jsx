import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  emitAutomationEvent, AUTOMATION_EVENTS, isBelowAttendanceThreshold,
  emitLeadCreatedEvent, emitLeadAssignedEvent, emitLeadStatusEvents, emitPaymentEvent, buildLeadEventPayload,
} from '../lib/automation'
import { isClassScheduledOn } from '../lib/schedule'
import { logAuditEvent } from '../lib/audit'
import { statusLabel, isPipelineStage, statusOrder } from '../lib/leadStatus'
import { relativeDayAt } from '../lib/activityTypes'

const DataContext = createContext()

// Deriving the next invoice ID from array length breaks the moment a gap
// appears in the sequence (e.g. an invoice gets deleted) — length+1 can
// collide with an ID that already exists, which silently fails the insert
// (unique constraint) with no visible error. Deriving from the highest
// existing suffix for the current year is gap-proof.
function nextInvoiceId(list) {
  const prefix = `INV-${new Date().getFullYear()}-`
  const maxSeq = list.reduce((max, inv) => {
    if (!inv.id?.startsWith(prefix)) return max
    const n = parseInt(inv.id.slice(prefix.length), 10)
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

// Meeting outcomes that map directly to a pipeline stage of the same
// meaning — only these advance lead status automatically (see
// recordMeetingOutcome below). Every other outcome just gets logged.
const MEETING_OUTCOME_STATUS = { 'Package Shared': 'package_shared' }

export function DataProvider({ children }) {
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [leadActivities, setLeadActivities] = useState([])
  const [students, setStudents] = useState([])
  const [packages, setPackages] = useState([])
  const [invoices, setInvoices] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [leadDocuments, setLeadDocuments] = useState([])
  const [leadNotes, setLeadNotes] = useState([])
  const [studentNotes, setStudentNotes] = useState([])
  const [batches, setBatches] = useState([])
  const [installments, setInstallments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [staffAttendance, setStaffAttendance] = useState([])
  const [emailMessages, setEmailMessages] = useState([])
  const [automationWorkflows, setAutomationWorkflows] = useState([])
  const [automationExecutions, setAutomationExecutions] = useState([])
  const [loading, setLoading] = useState(true)

  // ── INITIAL LOAD ─────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const [leadsRes, followUpsRes, studentsRes, packagesRes, invoicesRes, activitiesRes, profilesRes, documentsRes, batchesRes, installmentsRes, leadNotesRes, studentNotesRes, attendanceRes, emailMessagesRes, staffAttendanceRes, automationWorkflowsRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('follow_ups').select('*').order('created_at', { ascending: false }),
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('packages').select('*'),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('lead_activities').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, role'),
        supabase.from('lead_documents').select('*').order('created_at', { ascending: false }),
        supabase.from('batches').select('*').order('created_at', { ascending: false }),
        supabase.from('invoice_installments').select('*').order('seq', { ascending: true }),
        supabase.from('lead_notes').select('*').order('created_at', { ascending: false }),
        supabase.from('student_notes').select('*').order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').order('date', { ascending: false }),
        supabase.from('email_messages').select('*').order('created_at', { ascending: false }),
        supabase.from('staff_attendance').select('*').order('date', { ascending: false }),
        // Empty for sales (RLS only grants SELECT to admin/manager, see
        // 0042_automation_engine.sql) — not an error, just zero rows.
        supabase.from('automation_workflows').select('*, automation_workflow_conditions(*), automation_workflow_actions(*)').order('created_at', { ascending: false }),
      ])

      if (leadsRes.error) console.error('leads error', leadsRes.error)
      if (followUpsRes.error) console.error('follow_ups error', followUpsRes.error)
      if (studentsRes.error) console.error('students error', studentsRes.error)
      if (packagesRes.error) console.error('packages error', packagesRes.error)
      if (invoicesRes.error) console.error('invoices error', invoicesRes.error)
      if (activitiesRes.error) console.error('lead_activities error', activitiesRes.error)
      if (profilesRes.error) console.error('profiles error', profilesRes.error)
      if (documentsRes.error) console.error('lead_documents error', documentsRes.error)
      if (batchesRes.error) console.error('batches error', batchesRes.error)
      if (installmentsRes.error) console.error('invoice_installments error', installmentsRes.error)
      if (leadNotesRes.error) console.error('lead_notes error', leadNotesRes.error)
      if (studentNotesRes.error) console.error('student_notes error', studentNotesRes.error)
      if (attendanceRes.error) console.error('attendance error', attendanceRes.error)
      if (emailMessagesRes.error) console.error('email_messages error', emailMessagesRes.error)
      if (staffAttendanceRes.error) console.error('staff_attendance error', staffAttendanceRes.error)
      if (automationWorkflowsRes.error) console.error('automation_workflows error', automationWorkflowsRes.error)

      const leadsList = (leadsRes.data || []).map(mapLeadFromDb)
      const followUpsList = (followUpsRes.data || []).map(mapFollowUpFromDb)

      setLeads(leadsList)
      setFollowUps(followUpsList)
      setStudents((studentsRes.data || []).map(mapStudentFromDb))
      setPackages(packagesRes.data || [])
      setInvoices((invoicesRes.data || []).map(mapInvoiceFromDb))
      setLeadActivities(activitiesRes.data || [])
      setTeamMembers(profilesRes.data || [])
      setLeadDocuments(documentsRes.data || [])
      setLeadNotes(leadNotesRes.data || [])
      setStudentNotes(studentNotesRes.data || [])
      setBatches(batchesRes.data || [])
      setInstallments(installmentsRes.data || [])
      setAttendance(attendanceRes.data || [])
      setEmailMessages(emailMessagesRes.data || [])
      setStaffAttendance(staffAttendanceRes.data || [])
      setAutomationWorkflows((automationWorkflowsRes.data || []).map(mapWorkflowFromDb))
      setLoading(false)

      // Delayed/business-hours-deferred automation actions ("THEN ... after
      // 1 day") have no cron to run them — this sweep is the substitute:
      // whoever has the CRM open picks up anything due since it was last
      // checked. Fire-and-forget, same as every other automation call; a
      // failure here must never affect the rest of the app loading.
      supabase.functions.invoke('automation-engine', { body: { mode: 'run_scheduled' } }).catch((err) => {
        console.error('automation-engine run_scheduled invoke failed', err)
      })

      // Reconcile stale data: a follow-up left "pending" for a lead that has
      // already reached a terminal outcome (enrolled/lost) is dead weight —
      // auto-close it so it stops cluttering the Follow-ups list.
      const terminalNames = new Set(leadsList.filter((l) => l.status === 'enrolled' || l.status === 'lost').map((l) => l.name))
      const staleIds = followUpsList.filter((f) => f.status === 'pending' && terminalNames.has(f.lead)).map((f) => f.id)
      if (staleIds.length > 0) {
        supabase.from('follow_ups').update({ status: 'completed' }).in('id', staleIds)
          .then(({ error }) => { if (error) console.error('reconcile stale follow_ups error', error) })
        setFollowUps((prev) => prev.map((f) => staleIds.includes(f.id) ? { ...f, status: 'completed' } : f))
      }

      // Only one follow-up per lead is meant to exist at a time. Leftover
      // duplicates from before that rule was enforced (e.g. an RNR and a
      // separate schedule both creating their own row) get collapsed down
      // to just the newest one per lead.
      const seenLeadNames = new Set()
      const duplicateIds = []
      for (const f of followUpsList) { // already newest-first
        if (seenLeadNames.has(f.lead)) duplicateIds.push(f.id)
        else seenLeadNames.add(f.lead)
      }
      if (duplicateIds.length > 0) {
        supabase.from('follow_ups').delete().in('id', duplicateIds)
          .then(({ error }) => { if (error) console.error('reconcile duplicate follow_ups error', error) })
        setFollowUps((prev) => prev.filter((f) => !duplicateIds.includes(f.id)))
      }
    }
    loadAll()
  }, [])

  // ── MAPPERS (DB snake_case -> UI camelCase) ─────────────
  function mapLeadFromDb(l) {
    return { ...l }
  }
  function mapStudentFromDb(s) {
    return { ...s, enrollDate: s.enroll_date, feePaid: s.fee_paid, feeTotal: s.fee_total }
  }
  function mapInvoiceFromDb(i) {
    return { ...i, dueDate: i.due_date, paymentMode: i.payment_mode }
  }
  function mapFollowUpFromDb(f) {
    return { ...f }
  }
  // Conditions/actions come back from the embedded select unordered —
  // sorted here once so every consumer (the builder, the list, a
  // duplicate) can just read `.conditions`/`.actions` in the right order.
  function mapWorkflowFromDb(w) {
    return {
      ...w,
      conditions: (w.automation_workflow_conditions || []).slice().sort((a, b) => a.position - b.position),
      actions: (w.automation_workflow_actions || []).slice().sort((a, b) => a.position - b.position),
    }
  }

  // ── LEAD ACTIVITIES (timeline) ────────────────────────────
  // activityType (optional 5th arg) is one of the ACTIVITY_TYPES keys from
  // lib/activityTypes — it's what lets the Timeline show the right icon and
  // be filtered reliably instead of guessing from the description text.
  // Every addActivity call site in this file passes one; a missing type
  // just falls back to a generic entry visible under "All".
  const addActivity = useCallback(async (leadId, fromStatus, toStatus, description, activityType) => {
    const { data: { user } } = await supabase.auth.getUser()
    const actorName = teamMembers.find((m) => m.id === user?.id)?.name || null
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({ lead_id: leadId, from_status: fromStatus || null, to_status: toStatus || null, description, actor_id: user?.id || null, actor_name: actorName, activity_type: activityType || null })
      .select()
      .single()
    if (error) { console.error('addActivity error', error); return }
    setLeadActivities((prev) => [data, ...prev])
  }, [teamMembers])

  // A lead reaching a terminal outcome (enrolled/lost) means any follow-up
  // still marked "pending" for it is dead weight — auto-close it so it
  // doesn't keep cluttering the Follow-ups list.
  const closePendingFollowUps = useCallback(async (leadName) => {
    const pendingIds = followUps.filter((f) => f.lead === leadName && f.status === 'pending').map((f) => f.id)
    if (pendingIds.length === 0) return
    const { error } = await supabase.from('follow_ups').update({ status: 'completed' }).in('id', pendingIds)
    if (error) { console.error('closePendingFollowUps error', error); return }
    setFollowUps((prev) => prev.map((f) => pendingIds.includes(f.id) ? { ...f, status: 'completed' } : f))
  }, [followUps])

  // ── LEADS ────────────────────────────────────────────────
  const addLead = useCallback(async (lead) => {
    const { id, ...leadData } = lead // id is auto-generated by DB
    // Checked here (not just in the Add Lead modal) so every caller —
    // manual entry, CSV import, anything added later — is protected the
    // same way. Same phone or email as an existing lead is treated as the
    // existing one, never a second row for the same contact.
    const phone = leadData.phone
    const email = leadData.email?.trim().toLowerCase()
    const existing = leads.find((l) => (phone && l.phone === phone) || (email && l.email?.toLowerCase() === email))
    if (existing) return { duplicate: true, existing }

    // Every new lead — manually added, CSV imported, whatever the source —
    // gets round-robin distributed across Sales Executives instead of
    // defaulting to whoever happened to create it. Falls back to the
    // creating user only if there are no sales reps yet to assign to. The
    // acting user is also who LEAD_CREATED's automation payload credits as
    // "who did this", regardless of who the lead itself lands on.
    const { data: rrData } = await supabase.rpc('assign_next_sales_rep')
    const { data: { user: actingUser } } = await supabase.auth.getUser()
    const assignedTo = rrData || actingUser?.id || null
    const { data, error } = await supabase.from('leads').insert({ ...leadData, assigned_to: assignedTo }).select().single()
    if (error) { console.error('addLead error', error); return { error: error.message } }
    const mapped = mapLeadFromDb(data)
    setLeads((prev) => [mapped, ...prev])
    addActivity(data.id, null, data.status, `Lead created from ${data.source}`, 'LEAD_CREATED')
    // Automation Event — no WhatsApp/Email sent here; the future
    // Automation Engine reacts to this (e.g. the Facebook-source example
    // rule in AUTOMATION_RULES). Never awaited: an automation hiccup must
    // never delay or fail lead creation itself.
    emitLeadCreatedEvent({ lead: mapped, userId: actingUser?.id || null })
    return { data: mapped }
  }, [addActivity, leads])

  const takeOverLead = useCallback(async (leadId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('leads')
      .update({ assigned_to: user.id })
      .eq('id', leadId)
      .select()
      .single()
    if (error) { console.error('takeOverLead error', error); return }
    setLeads((prev) => prev.map((l) => l.id === leadId ? mapLeadFromDb(data) : l))
    const lead = leads.find((l) => l.id === leadId)
    const agentName = teamMembers.find((m) => m.id === user.id)?.name || 'A team member'
    addActivity(leadId, lead?.status, lead?.status, `${agentName} took over this lead`, 'LEAD_ASSIGNED')
    emitLeadAssignedEvent({ lead: mapLeadFromDb(data), leadId, userId: user.id, assignedExecutive: user.id })
  }, [leads, teamMembers, addActivity])

  // activity_type is inferred from the resulting status (enrolled/lost get
  // their own distinct timeline type; everything else is a generic status
  // change) so every caller — the Lost modal, the Nurture modal, the Edit
  // Lead form — gets correctly classified without each one having to know
  // the activity-type taxonomy itself.
  function inferStatusActivityType(newStatus) {
    if (newStatus === 'enrolled') return 'LEAD_ENROLLED'
    if (newStatus === 'lost') return 'LEAD_LOST'
    return 'STATUS_CHANGED'
  }

  const updateLead = useCallback(async (updatedLead, activityDescription) => {
    const avatar = updatedLead.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const { id, ...leadData } = updatedLead
    const prevLead = leads.find((l) => l.id === id)
    const { data, error } = await supabase
      .from('leads')
      .update({ ...leadData, avatar })
      .eq('id', id)
      .select()
      .single()
    if (error) { console.error('updateLead error', error); return }
    const mapped = mapLeadFromDb(data)
    setLeads((prev) => prev.map((l) => l.id === id ? mapped : l))
    if (prevLead && prevLead.status !== data.status) {
      const activityType = inferStatusActivityType(data.status)
      addActivity(id, prevLead.status, data.status, activityDescription || `Status changed from ${prevLead.status} to ${data.status}`, activityType)
      if (data.status === 'enrolled' || data.status === 'lost') closePendingFollowUps(data.name)
      supabase.auth.getUser().then(({ data: { user } }) =>
        emitLeadStatusEvents({ lead: mapped, leadId: id, userId: user?.id || null, previousStatus: prevLead.status, newStatus: data.status, activityType })
      )
    }
  }, [leads, addActivity, closePendingFollowUps])

  const deleteLead = useCallback(async (leadId) => {
    const { error } = await supabase.from('leads').delete().eq('id', leadId)
    if (error) { console.error('deleteLead error', error); return }
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
  }, [])

  // activityType lets a caller override the inferred type — reopenLead
  // always wants LEAD_REOPENED regardless of which status it lands on, and
  // markPackageShared always wants PACKAGE_SHARED even though the target
  // status ("package_shared") would otherwise just infer a generic status
  // change.
  const updateLeadStatus = useCallback(async (leadId, newStatus, description, activityType) => {
    const prevLead = leads.find((l) => l.id === leadId)
    // Same status re-selected (e.g. a re-render firing the same choice
    // twice) is a no-op, not a real transition — skip the write and the
    // timeline entry entirely rather than logging "changed from X to X".
    if (prevLead && prevLead.status === newStatus) return
    const { data, error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)
      .select()
      .single()
    if (error) { console.error('updateLeadStatus error', error); return }
    const mapped = mapLeadFromDb(data)
    setLeads((prev) => prev.map((l) => l.id === leadId ? mapped : l))
    const resolvedActivityType = activityType || inferStatusActivityType(newStatus)
    addActivity(leadId, prevLead?.status, newStatus, description || `Status changed from ${statusLabel(prevLead?.status) || '—'} to ${statusLabel(newStatus)}`, resolvedActivityType)
    if (newStatus === 'enrolled' || newStatus === 'lost') closePendingFollowUps(data.name)
    // Automation Event(s) — every status change funnels through this one
    // function (Lead List, Lead Detail, Pipeline drag/move, Reopen, Package
    // Shared all call it), so this is the single place that needs to know
    // how to turn a transition into LEAD_STATUS_CHANGED + whichever
    // milestone event applies. Never awaited — see emitAutomationEvent's
    // failure-handling note.
    supabase.auth.getUser().then(({ data: { user } }) =>
      emitLeadStatusEvents({ lead: mapped, leadId, userId: user?.id || null, previousStatus: prevLead?.status, newStatus, activityType: resolvedActivityType })
    )
  }, [leads, addActivity, closePendingFollowUps])

  // ── FOLLOW-UPS ───────────────────────────────────────────
  // addFollowUp/updateFollowUp are the only two functions that ever touch
  // the follow_ups table — every surface (Lead List, Lead Detail, the
  // Follow-up module, Pipeline's read-only display) goes through these, so
  // "who created it" / "who completed it" get stamped in exactly one place
  // instead of every call site having to remember to do it.
  const addFollowUp = useCallback(async (followUp) => {
    const { id, ...fuData } = followUp
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...fuData, created_by: fuData.created_by ?? user?.id ?? null }
    const { data, error } = await supabase.from('follow_ups').insert(payload).select().single()
    if (error) { console.error('addFollowUp error', error); return }
    const mapped = mapFollowUpFromDb(data)
    setFollowUps((prev) => [mapped, ...prev])
    emitAutomationEvent({ eventType: AUTOMATION_EVENTS.FOLLOW_UP_CREATED, entityType: 'lead', entityId: mapped.lead_id ?? mapped.lead, sourceTable: 'follow_ups', sourceId: mapped.id })
    if (mapped.type === 'meeting') {
      emitAutomationEvent({ eventType: AUTOMATION_EVENTS.COUNSELLING_SCHEDULED, entityType: 'lead', entityId: mapped.lead_id ?? mapped.lead, sourceTable: 'follow_ups', sourceId: mapped.id })
    }
    return mapped
  }, [])

  const updateFollowUp = useCallback(async (followUpId, updates) => {
    const payload = { ...updates }
    if (updates.status === 'completed' && !('completed_by' in updates)) {
      const { data: { user } } = await supabase.auth.getUser()
      payload.completed_by = user?.id ?? null
      payload.completed_at = new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('follow_ups')
      .update(payload)
      .eq('id', followUpId)
      .select()
      .single()
    if (error) { console.error('updateFollowUp error', error); return }
    const mapped = mapFollowUpFromDb(data)
    // Moves the touched follow-up to the front of the list so an action
    // (RNR, reschedule, mark complete) is visibly reflected immediately —
    // otherwise it silently stays buried in its old spot and reps re-do
    // the same action thinking nothing happened.
    setFollowUps((prev) => [mapped, ...prev.filter((f) => f.id !== followUpId)])
    const isMeeting = mapped.type === 'meeting'
    const emit = (eventType) => emitAutomationEvent({ eventType, entityType: 'lead', entityId: mapped.lead_id ?? mapped.lead, sourceTable: 'follow_ups', sourceId: mapped.id })
    if (updates.status === 'completed') {
      emit(AUTOMATION_EVENTS.FOLLOW_UP_COMPLETED)
      if (isMeeting) emit(AUTOMATION_EVENTS.COUNSELLING_COMPLETED)
      // Automatic "Follow-up Completed" timeline entry — meetings are
      // excluded here since recordMeetingOutcome already logs its own
      // richer "Meeting Completed" entry (with the outcome) right after
      // calling this; logging both would duplicate the same fact twice.
      if (!isMeeting) {
        const lead = leads.find((l) => l.id === mapped.lead_id || l.name === mapped.lead)
        if (lead) addActivity(lead.id, lead.status, lead.status, `${mapped.type ? mapped.type.charAt(0).toUpperCase() + mapped.type.slice(1) : 'Follow-up'} completed`, 'FOLLOWUP_COMPLETED')
      }
    } else if (updates.status === 'cancelled' && isMeeting) {
      emit(AUTOMATION_EVENTS.COUNSELLING_CANCELLED)
    } else if (updates.status === 'no_show' && isMeeting) {
      emit(AUTOMATION_EVENTS.COUNSELLING_NO_SHOW)
    }
    return mapped
  }, [leads, addActivity])

  const deleteFollowUp = useCallback(async (followUpId) => {
    const { error } = await supabase.from('follow_ups').delete().eq('id', followUpId)
    if (error) { console.error('deleteFollowUp error', error); return }
    setFollowUps((prev) => prev.filter((f) => f.id !== followUpId))
  }, [])

  // The single creation path for a lead follow-up — Lead List's row action,
  // Lead Detail's "Schedule Follow-up"/"Schedule Counselling", and the
  // Follow-up module's own "Schedule Follow-up" modal all call this instead
  // of writing to follow_ups themselves, so all three produce the exact
  // same record shape and trigger the exact same side effects.
  //
  // form: { type, date, time, notes, priority, assignedTo?, meetingType? }
  const scheduleFollowUp = useCallback(async (lead, form) => {
    const timeStr = /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(form.time)
      ? form.time
      : new Date(`2000-01-01T${form.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const isMeeting = form.type === 'meeting'
    // A meeting and a call/email/whatsapp follow-up are different kinds of
    // appointments — rescheduling one should never silently overwrite the
    // other, so each only reuses an existing pending row of its own kind.
    // This is also what "do not create duplicate meetings" means in
    // practice: a lead can only ever have one pending meeting at a time.
    const existing = followUps.find((f) => (f.lead_id === lead.id || f.lead === lead.name) && f.status === 'pending' && (f.type === 'meeting') === isMeeting)
    const assignedTo = form.assignedTo || lead.assigned_to || null
    const meetingType = isMeeting ? (form.meetingType || 'online') : null
    const result = existing
      ? await updateFollowUp(existing.id, { type: form.type, date: form.date, time: timeStr, notes: form.notes, priority: form.priority, status: 'pending', assigned_to: assignedTo, meeting_type: meetingType })
      : await addFollowUp({ id: Date.now(), lead: lead.name, lead_id: lead.id, type: form.type, date: form.date, time: timeStr, notes: form.notes, status: 'pending', priority: form.priority, assigned_to: assignedTo, meeting_type: meetingType })

    const whenLabel = relativeDayAt(form.date, timeStr)
    addActivity(lead.id, lead.status, lead.status, isMeeting
      ? `Counselling scheduled — ${whenLabel}`
      : `${form.type} follow-up scheduled — ${whenLabel}`, isMeeting ? 'MEETING_SCHEDULED' : 'FOLLOWUP_CREATED')
    if (!lead.assigned_to) takeOverLead(lead.id)

    // Central workflow rule: scheduling a counselling meeting nudges an
    // active lead forward to "Counselling"; a plain follow-up nudges it to
    // "Follow-up" — but only if the lead is still earlier in the pipeline.
    // A lead already at Negotiation or beyond, or already closed/nurtured,
    // never gets moved backward or touched just because something got
    // scheduled.
    const targetStatus = isMeeting ? 'counselling' : 'follow_up'
    if (isPipelineStage(lead.status) && statusOrder(lead.status) < statusOrder(targetStatus)) {
      updateLeadStatus(lead.id, targetStatus, isMeeting ? `Counselling scheduled — ${whenLabel}` : `Follow-up scheduled — ${whenLabel}`)
    }
    return result
  }, [followUps, addFollowUp, updateFollowUp, addActivity, takeOverLead, updateLeadStatus])

  // Records what happened at a counselling meeting and suggests — never
  // forces — the next step. The one exception: "Package Shared" as an
  // outcome IS the pipeline stage of the same name, so that one case
  // advances status directly (still never backward, still never past a
  // closed/nurtured lead) — every other outcome only gets logged.
  const recordMeetingOutcome = useCallback(async (lead, meeting, outcome, notes) => {
    await updateFollowUp(meeting.id, { status: 'completed', notes: notes ? `${outcome}: ${notes}` : outcome })
    await addActivity(lead.id, lead.status, lead.status, `Counselling completed — Outcome: ${outcome}${notes ? `. ${notes}` : ''}`, 'MEETING_COMPLETED')
    const targetStatus = MEETING_OUTCOME_STATUS[outcome]
    if (targetStatus && isPipelineStage(lead.status) && statusOrder(lead.status) < statusOrder(targetStatus)) {
      updateLeadStatus(lead.id, targetStatus, `Package shared during counselling`, 'PACKAGE_SHARED')
    }
  }, [updateFollowUp, addActivity, updateLeadStatus])

  // ── STUDENTS ─────────────────────────────────────────────
  const addStudent = useCallback(async (student) => {
    const { id, ...studentData } = student
    const { data, error } = await supabase.from('students').insert(studentData).select().single()
    if (error) { console.error('addStudent error', error); return }
    setStudents((prev) => [mapStudentFromDb(data), ...prev])
  }, [])

  const deleteStudent = useCallback(async (studentId) => {
    const { error } = await supabase.from('students').delete().eq('id', studentId)
    if (error) { console.error('deleteStudent error', error); return }
    setStudents((prev) => prev.filter((s) => s.id !== studentId))
  }, [])

  const updateStudent = useCallback(async (studentId, updates) => {
    const { data, error } = await supabase.from('students').update(updates).eq('id', studentId).select().single()
    if (error) { console.error('updateStudent error', error); return }
    setStudents((prev) => prev.map((s) => s.id === studentId ? mapStudentFromDb(data) : s))
  }, [])

  // ── BATCHES ──────────────────────────────────────────────
  const addBatch = useCallback(async (batch) => {
    const { data, error } = await supabase.from('batches').insert(batch).select().single()
    if (error) { console.error('addBatch error', error); return null }
    setBatches((prev) => [data, ...prev])
    return data
  }, [])

  const updateBatch = useCallback(async (batchId, updates) => {
    const { data, error } = await supabase.from('batches').update(updates).eq('id', batchId).select().single()
    if (error) { console.error('updateBatch error', error); return }
    setBatches((prev) => prev.map((b) => b.id === batchId ? data : b))
    // Students link to a batch by batch_id (the real relation), but also
    // cache the batch's name in students.batch for display — renaming a
    // batch needs to refresh that cache on every student pointing at it,
    // or their card would keep showing the stale old name forever.
    if (updates.name) {
      const { data: updatedStudents, error: studErr } = await supabase
        .from('students')
        .update({ batch: updates.name })
        .eq('batch_id', batchId)
        .select()
      if (studErr) console.error('updateBatch (student name sync) error', studErr)
      else if (updatedStudents?.length) {
        setStudents((prev) => prev.map((s) => {
          const match = updatedStudents.find((u) => u.id === s.id)
          return match ? mapStudentFromDb(match) : s
        }))
      }
    }
  }, [])

  const deleteBatch = useCallback(async (batchId) => {
    const { error } = await supabase.from('batches').delete().eq('id', batchId)
    if (error) { console.error('deleteBatch error', error); return }
    setBatches((prev) => prev.filter((b) => b.id !== batchId))
  }, [])

  // ── LEAD DOCUMENT VAULT ────────────────────────────────────
  const addLeadDocument = useCallback(async (leadId, category, title, url) => {
    const { data, error } = await supabase
      .from('lead_documents')
      .insert({ lead_id: leadId, category, title, url })
      .select()
      .single()
    if (error) { console.error('addLeadDocument error', error); return }
    setLeadDocuments((prev) => [data, ...prev])
  }, [])

  // ── NOTES (real, persisted — the Lead Notes tab used to be fake local
  // state that vanished on refresh; Students never had notes at all) ──
  const addLeadNote = useCallback(async (leadId, text) => {
    const { data: { user } } = await supabase.auth.getUser()
    const authorName = teamMembers.find((m) => m.id === user?.id)?.name || 'Unknown'
    const { data, error } = await supabase
      .from('lead_notes')
      .insert({ lead_id: leadId, text, author_id: user?.id || null, author_name: authorName })
      .select()
      .single()
    if (error) { console.error('addLeadNote error', error); return }
    setLeadNotes((prev) => [data, ...prev])
  }, [teamMembers])

  const addStudentNote = useCallback(async (studentId, text) => {
    const { data: { user } } = await supabase.auth.getUser()
    const authorName = teamMembers.find((m) => m.id === user?.id)?.name || 'Unknown'
    const { data, error } = await supabase
      .from('student_notes')
      .insert({ student_id: studentId, text, author_id: user?.id || null, author_name: authorName })
      .select()
      .single()
    if (error) { console.error('addStudentNote error', error); return }
    setStudentNotes((prev) => [data, ...prev])
  }, [teamMembers])

  // ── ATTENDANCE (trainer marks the roster per batch/day) ────
  // One upsert call handles the whole day's register at once — records is
  // [{ studentId, status }]. Unique (student_id, date) means re-marking the
  // same day overwrites rather than duplicating.
  const markAttendance = useCallback(async (batchId, date, records) => {
    const { data: { user } } = await supabase.auth.getUser()
    const markerName = teamMembers.find((m) => m.id === user?.id)?.name || 'Unknown'
    const batch = batches.find((b) => b.id === batchId)
    // Scheduled-vs-not is captured as real metadata (not enforced as a
    // hard block yet — see the implementation report) so it's visible in
    // the UI and audit trail rather than silently indistinguishable from
    // a normal class day.
    const scheduled = batch ? isClassScheduledOn(batch, date) : null
    const previousByKey = new Map(attendance.map((a) => [`${a.student_id}_${a.date}`, a]))
    const rows = records.map((r) => ({
      batch_id: batchId,
      student_id: r.studentId,
      date,
      status: r.status,
      marked_by: user?.id || null,
      marked_by_name: markerName,
      marked_at: new Date().toISOString(),
      is_override: scheduled === false,
      override_reason: scheduled === false ? (r.overrideReason || null) : null,
    }))
    let { data, error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'student_id,date' })
      .select()
    // Migration 0033 (is_override/override_reason columns) may not be
    // applied yet on this database — attendance marking has to keep
    // working regardless of migration timing, so retry without those two
    // fields rather than leaving the whole feature broken until someone
    // runs the SQL. PostgREST reports an unknown column as 42703/PGRST204.
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      const legacyRows = rows.map(({ is_override: _io, override_reason: _or, ...rest }) => rest)
      ;({ data, error } = await supabase.from('attendance').upsert(legacyRows, { onConflict: 'student_id,date' }).select())
    }
    if (error) { console.error('markAttendance error', error); return false }
    let mergedAttendance
    setAttendance((prev) => {
      const touchedIds = new Set(data.map((d) => `${d.student_id}_${d.date}`))
      const kept = prev.filter((a) => !touchedIds.has(`${a.student_id}_${a.date}`))
      mergedAttendance = [...data, ...kept]
      return mergedAttendance
    })
    // Fire-and-forget, outside the state updater (which React may invoke
    // more than once, e.g. in StrictMode — side effects don't belong
    // there). Attendance marking has already succeeded and returns to the
    // UI regardless of what automation/audit logging does with it below.
    // This only ever knows "an event happened" — never anything about
    // WhatsApp/email/etc, see lib/automation.js for what (if anything)
    // runs from here.
    data.forEach((row) => {
      const previous = previousByKey.get(`${row.student_id}_${row.date}`)
      if (!previous || previous.status !== row.status) {
        logAuditEvent({
          userId: user?.id, userName: markerName,
          action: previous ? 'Attendance Corrected' : 'Attendance Marked',
          module: 'student_attendance', entityType: 'student', entityId: row.student_id,
          oldValue: previous ? { status: previous.status } : null,
          newValue: { status: row.status, date: row.date },
        })
      }
      emitAutomationEvent({ eventType: AUTOMATION_EVENTS.STUDENT_ATTENDANCE_MARKED, entityType: 'student', entityId: row.student_id, sourceTable: 'attendance', sourceId: row.id, payload: { status: row.status, date: row.date } })
      if (row.status === 'absent') {
        emitAutomationEvent({ eventType: AUTOMATION_EVENTS.STUDENT_ABSENT, entityType: 'student', entityId: row.student_id, sourceTable: 'attendance', sourceId: row.id, payload: { date: row.date } })
      }
      if (row.status === 'late') {
        emitAutomationEvent({ eventType: AUTOMATION_EVENTS.STUDENT_LATE, entityType: 'student', entityId: row.student_id, sourceTable: 'attendance', sourceId: row.id, payload: { date: row.date } })
      }
      const history = mergedAttendance.filter((a) => a.student_id === row.student_id)
      const belowPct = isBelowAttendanceThreshold(history)
      if (belowPct != null) {
        emitAutomationEvent({ eventType: AUTOMATION_EVENTS.STUDENT_ATTENDANCE_BELOW_THRESHOLD, entityType: 'student', entityId: row.student_id, sourceTable: 'attendance_threshold', sourceId: `${row.student_id}_${row.date}`, payload: { attendancePct: belowPct } })
      }
    })
    return true
  }, [teamMembers, batches, attendance])

  // Same upsert-the-whole-day pattern as student attendance, but for staff
  // — a third status ('leave') is valid here where it isn't for students.
  const markStaffAttendance = useCallback(async (date, records) => {
    const { data: { user } } = await supabase.auth.getUser()
    const markerName = teamMembers.find((m) => m.id === user?.id)?.name || 'Unknown'
    const previousByKey = new Map(staffAttendance.map((a) => [`${a.staff_id}_${a.date}`, a]))
    const rows = records.map((r) => ({
      staff_id: r.staffId,
      date,
      status: r.status,
      marked_by: user?.id || null,
      marked_by_name: markerName,
      marked_at: new Date().toISOString(),
    }))
    const { data, error } = await supabase
      .from('staff_attendance')
      .upsert(rows, { onConflict: 'staff_id,date' })
      .select()
    if (error) { console.error('markStaffAttendance error', error); return false }
    setStaffAttendance((prev) => {
      const touchedIds = new Set(data.map((d) => `${d.staff_id}_${d.date}`))
      const kept = prev.filter((a) => !touchedIds.has(`${a.staff_id}_${a.date}`))
      return [...data, ...kept]
    })
    data.forEach((row) => {
      const previous = previousByKey.get(`${row.staff_id}_${row.date}`)
      if (!previous || previous.status !== row.status) {
        logAuditEvent({
          userId: user?.id, userName: markerName,
          action: previous ? 'Staff Attendance Corrected' : 'Staff Attendance Marked',
          module: 'staff_attendance', entityType: 'staff', entityId: row.staff_id,
          oldValue: previous ? { status: previous.status } : null,
          newValue: { status: row.status, date: row.date },
        })
      }
      if (row.status === 'absent') {
        emitAutomationEvent({ eventType: AUTOMATION_EVENTS.STAFF_ABSENT, entityType: 'staff', entityId: row.staff_id, sourceTable: 'staff_attendance', sourceId: row.id, payload: { date: row.date } })
      }
      if (row.status === 'late') {
        emitAutomationEvent({ eventType: AUTOMATION_EVENTS.STAFF_LATE, entityType: 'staff', entityId: row.staff_id, sourceTable: 'staff_attendance', sourceId: row.id, payload: { date: row.date } })
      }
    })
    return true
  }, [teamMembers, staffAttendance])

  // ── EMAIL (real send via Gmail SMTP, replaces mailto: links) ────
  const sendEmail = useCallback(async ({ to, subject, body, leadId, studentId }) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ to, subject, body, leadId, studentId }),
    })
    const resBody = await res.json().catch(() => ({}))
    if (!res.ok) return { error: resBody.error || 'Failed to send email' }
    if (resBody.message) setEmailMessages((prev) => [resBody.message, ...prev])
    return { success: true }
  }, [])

  const deleteLeadDocument = useCallback(async (docId) => {
    const { error } = await supabase.from('lead_documents').delete().eq('id', docId)
    if (error) { console.error('deleteLeadDocument error', error); return }
    setLeadDocuments((prev) => prev.filter((d) => d.id !== docId))
  }, [])

  // ── PACKAGES ─────────────────────────────────────────────
  const addPackage = useCallback(async (pkg) => {
    const { id, ...pkgData } = pkg
    const { data, error } = await supabase.from('packages').insert(pkgData).select().single()
    if (error) { console.error('addPackage error', error); return }
    setPackages((prev) => [...prev, data])
  }, [])

  const updatePackage = useCallback(async (packageId, updates) => {
    const { data, error } = await supabase.from('packages').update(updates).eq('id', packageId).select().single()
    if (error) { console.error('updatePackage error', error); return }
    setPackages((prev) => prev.map((p) => p.id === packageId ? data : p))
  }, [])

  const deletePackage = useCallback(async (packageId) => {
    const { error } = await supabase.from('packages').delete().eq('id', packageId)
    if (error) { console.error('deletePackage error', error); return false }
    setPackages((prev) => prev.filter((p) => p.id !== packageId))
    return true
  }, [])

  // ── ENROLLMENT (lead -> student + invoice) ───────────────
  const enrollLead = useCallback(async (lead, pkg, batchId) => {
    // 1. mark lead enrolled
    const { data: updatedLead, error: leadErr } = await supabase
      .from('leads')
      .update({ status: 'enrolled' })
      .eq('id', lead.id)
      .select()
      .single()
    if (leadErr) { console.error('enrollLead: lead update error', leadErr); return }
    const mappedLead = mapLeadFromDb(updatedLead)
    setLeads((prev) => prev.map((l) => l.id === lead.id ? mappedLead : l))
    addActivity(lead.id, lead.status, 'enrolled', `Enrolled in ${lead.course}`, 'LEAD_ENROLLED')
    closePendingFollowUps(lead.name)
    // Automation Event — the Pipeline board's quick-enroll path. Same event
    // confirmAdmission's fuller workflow emits below; deduplicated by the
    // unique (event_type, source_table, source_id) constraint if somehow
    // both paths ever fired for the same lead.
    emitAutomationEvent({ eventType: AUTOMATION_EVENTS.LEAD_ENROLLED, entityType: 'lead', entityId: lead.id, sourceTable: 'leads', sourceId: lead.id, payload: buildLeadEventPayload(mappedLead, { previousStatus: lead.status, newStatus: 'enrolled' }) })

    // 2. skip if this exact lead was already turned into a student — matching
    // on email alone is wrong: multiple different leads can share a
    // placeholder/test email (or genuinely re-enroll under the same email
    // for a different course), and email-only matching silently reused
    // someone else's student record, leaving this lead "enrolled" with no
    // student of its own. Name + course is how every other table here
    // already links a lead to its student/invoice.
    const existingStudent = students.find(s => s.name === lead.name && s.course === lead.course)
    let newStudent = existingStudent
    const batch = batches.find((b) => b.id === batchId)

    if (!existingStudent) {
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .insert({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          course: lead.course,
          batch_id: batch?.id || null,
          batch: batch?.name || 'Unassigned',
          enroll_date: new Date().toISOString().slice(0, 10),
          status: 'active',
          fee_paid: 0,
          // Must match the invoice amount below (package price + 18% GST) —
          // this used to store the pre-GST price, so every new enrollment's
          // "Fee Progress" understated the real total by 18% until a
          // separate Generate Fee Bill run happened to overwrite it.
          fee_total: Math.round((pkg?.price || 0) * 1.18),
          avatar: lead.avatar,
        })
        .select()
        .single()
      if (studentErr) { console.error('enrollLead: student insert error', studentErr); return }
      newStudent = mapStudentFromDb(studentData)
      setStudents((prev) => [newStudent, ...prev])
    }

    // 3. skip if invoice already exists for this student+course
    const existingInvoice = invoices.find(inv => inv.student === lead.name && inv.course === lead.course)
    if (!existingInvoice) {
      const totalWithGst = Math.round((pkg?.price || 0) * 1.18)
      const invoiceId = nextInvoiceId(invoices)
      const { data: invoiceData, error: invoiceErr } = await supabase
        .from('invoices')
        .insert({
          id: invoiceId,
          student: lead.name,
          course: lead.course,
          amount: totalWithGst,
          paid: 0,
          balance: totalWithGst,
          date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status: 'partial',
          payment_mode: 'UPI',
        })
        .select()
        .single()
      if (invoiceErr) { console.error('enrollLead: invoice insert error', invoiceErr); return }
      setInvoices((prev) => [mapInvoiceFromDb(invoiceData), ...prev])
    }
  }, [students, invoices, addActivity, closePendingFollowUps, batches])

  // Sharing a package is explicitly NOT enrollment — this only nudges
  // status forward (never backward, never past a closed/nurtured lead),
  // same central-rule shape as scheduleFollowUp's status advance.
  const markPackageShared = useCallback(async (lead) => {
    if (isPipelineStage(lead.status) && statusOrder(lead.status) < statusOrder('package_shared')) {
      await updateLeadStatus(lead.id, 'package_shared', 'Package shared with lead', 'PACKAGE_SHARED')
    }
  }, [updateLeadStatus])

  // Authorized users (checked by the caller — see the admin gate on the
  // Reopen action) can bring a Lost/Nurture lead back into the active
  // pipeline. Nothing about history is deleted: the previous status, new
  // status, reason, actor, and timestamp all land in the timeline exactly
  // like every other status change, just framed as a reopen.
  const reopenLead = useCallback(async (lead, newStatus, reason) => {
    const description = `Reopened — ${statusLabel(lead.status)} → ${statusLabel(newStatus)}${reason ? `. Reason: ${reason}` : ''}`
    await updateLeadStatus(lead.id, newStatus, description, 'LEAD_REOPENED')
  }, [updateLeadStatus])

  // A student's Fee Progress (Students page) reads students.fee_paid /
  // fee_total directly — it has nothing to do with the invoices table on
  // its own, so a payment recorded against an invoice never showed up
  // there. This keeps the student record in sync every time an invoice's
  // paid/total amount changes.
  const syncStudentFee = useCallback(async (studentName, course, feePaid, feeTotal) => {
    const student = students.find((s) => s.name === studentName && s.course === course)
    if (!student) return
    const updates = { fee_paid: feePaid }
    if (feeTotal != null) updates.fee_total = feeTotal
    const { data, error } = await supabase.from('students').update(updates).eq('id', student.id).select().single()
    if (error) { console.error('syncStudentFee error', error); return }
    setStudents((prev) => prev.map((s) => s.id === student.id ? mapStudentFromDb(data) : s))
  }, [students])

  // Builds the real per-installment schedule behind a payment plan: each
  // installment gets its own share of the full invoice total and a due
  // date (30 days apart). Splits the total, not "whatever's left" — the
  // plan describes the whole bill; prior payments get applied against it
  // afterward through applyPaymentToSchedule's waterfall, same as any other
  // payment, rather than being carved out of the schedule up front.
  const createInstallmentSchedule = useCallback(async (invoiceId, planLabel, totalAmount, startDate) => {
    const count = planLabel === '2 Installments' ? 2 : planLabel === '3 Installments' ? 3 : 1
    if (count === 1 || totalAmount <= 0) return

    // A plan can be (re)generated after some payments already exist (e.g.
    // unlocked and re-picked) — clear out any stale pending/partial rows
    // first so we don't end up with two overlapping schedules.
    const { error: delError } = await supabase.from('invoice_installments').delete().eq('invoice_id', invoiceId).neq('status', 'paid')
    if (delError) { console.error('createInstallmentSchedule (cleanup) error', delError); return }
    setInstallments((prev) => prev.filter((i) => !(i.invoice_id === invoiceId && i.status !== 'paid')))

    const base = Math.floor(totalAmount / count)
    const rows = Array.from({ length: count }, (_, i) => ({
      invoice_id: invoiceId,
      seq: i + 1,
      amount: i === count - 1 ? totalAmount - base * (count - 1) : base,
      paid_amount: 0,
      due_date: new Date(new Date(startDate).getTime() + i * 30 * 86400000).toISOString().slice(0, 10),
      status: 'pending',
    }))
    const { data, error } = await supabase.from('invoice_installments').insert(rows).select()
    if (error) { console.error('createInstallmentSchedule error', error); return }
    setInstallments((prev) => [...prev, ...data].sort((a, b) => a.seq - b.seq))
    return data
  }, [])

  // Applies `amount` against an invoice's installment rows in sequence
  // (installment 1 first, then 2, etc.) without touching the invoice or
  // student totals — used both for normal payments and for backfilling a
  // pre-existing paid amount onto a freshly generated schedule. A payment
  // can be less than an installment (leaves it "partial"), exactly cover
  // it ("paid"), or overshoot into the next installment(s) — someone
  // paying everything off in one go just rolls straight through.
  const applyPaymentToSchedule = useCallback(async (invoiceId, amount) => {
    let leftover = amount
    const schedule = installments.filter((i) => i.invoice_id === invoiceId).sort((a, b) => a.seq - b.seq)
    for (const inst of schedule) {
      if (leftover <= 0) break
      const remaining = Number(inst.amount) - Number(inst.paid_amount)
      if (remaining <= 0) continue
      const applied = Math.min(remaining, leftover)
      const newPaidAmount = Number(inst.paid_amount) + applied
      const newStatus = newPaidAmount >= Number(inst.amount) ? 'paid' : 'partial'
      const { data, error } = await supabase
        .from('invoice_installments')
        .update({ paid_amount: newPaidAmount, status: newStatus, paid_date: newStatus === 'paid' ? new Date().toISOString().slice(0, 10) : inst.paid_date })
        .eq('id', inst.id)
        .select()
        .single()
      if (error) { console.error('applyPaymentToSchedule error', error); continue }
      setInstallments((prev) => prev.map((i) => i.id === inst.id ? data : i))
      leftover -= applied
    }
  }, [installments])

  // Ensures a fee bill (invoice) exists for an enrolled lead with the chosen
  // payment plan (GST-inclusive amount), matching the Fee Bill tab. Once a
  // plan is set this way the invoice locks — a second call returns
  // { blocked: true } instead of silently changing the plan, since only an
  // admin should be able to reopen and re-pick it (see unlockInvoice).
  const generateFeeBill = useCallback(async (lead, pkg, planLabel) => {
    const existingInvoice = invoices.find((inv) => inv.student === lead.name && inv.course === lead.course)
    if (existingInvoice) {
      if (existingInvoice.locked) return { blocked: true, invoice: existingInvoice }
      const { data, error } = await supabase
        .from('invoices')
        .update({ payment_plan: planLabel, locked: true })
        .eq('id', existingInvoice.id)
        .select()
        .single()
      if (error) { console.error('generateFeeBill (lock existing) error', error); return null }
      const mapped = mapInvoiceFromDb(data)
      setInvoices((prev) => prev.map((inv) => inv.id === mapped.id ? mapped : inv))
      syncStudentFee(lead.name, lead.course, mapped.paid, mapped.amount)
      const schedule = await createInstallmentSchedule(mapped.id, planLabel, mapped.amount, new Date().toISOString().slice(0, 10))
      // Any payment already on this invoice predates the plan — apply it
      // against the fresh schedule now instead of leaving it un-tracked.
      if (schedule && mapped.paid > 0) await applyPaymentToSchedule(mapped.id, mapped.paid)
      return { invoice: mapped }
    }
    const totalWithGst = Math.round((pkg?.price || 0) * 1.18)
    const invoiceId = nextInvoiceId(invoices)
    const invoiceDate = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        id: invoiceId,
        student: lead.name,
        course: lead.course,
        amount: totalWithGst,
        paid: 0,
        balance: totalWithGst,
        date: invoiceDate,
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'partial',
        payment_mode: 'UPI',
        payment_plan: planLabel,
        locked: true,
      })
      .select()
      .single()
    if (error) { console.error('generateFeeBill error', error); return null }
    const mapped = mapInvoiceFromDb(data)
    setInvoices((prev) => [mapped, ...prev])
    syncStudentFee(lead.name, lead.course, 0, totalWithGst)
    createInstallmentSchedule(mapped.id, planLabel, totalWithGst, invoiceDate)
    if (mapped.balance > 0) emitPaymentEvent({ eventType: AUTOMATION_EVENTS.PAYMENT_PENDING, lead, invoiceId: mapped.id, amount: mapped.balance })
    return { invoice: mapped }
  }, [invoices, syncStudentFee, createInstallmentSchedule, applyPaymentToSchedule])

  // Admin-only escape hatch to re-open a locked fee bill so its plan can be
  // changed via generateFeeBill again.
  const unlockInvoice = useCallback(async (invoiceId) => {
    const { data, error } = await supabase.from('invoices').update({ locked: false }).eq('id', invoiceId).select().single()
    if (error) { console.error('unlockInvoice error', error); return }
    const mapped = mapInvoiceFromDb(data)
    setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? mapped : inv))
  }, [])

  const updateInvoiceDueDate = useCallback(async (invoiceId, dueDate) => {
    const { data, error } = await supabase.from('invoices').update({ due_date: dueDate }).eq('id', invoiceId).select().single()
    if (error) { console.error('updateInvoiceDueDate error', error); return }
    const mapped = mapInvoiceFromDb(data)
    setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? mapped : inv))
  }, [])

  // The one place a payment is ever written — Billing's payment form and
  // the admission workflow both call this, so "Paid/Pending/Total" and the
  // lead timeline stay correct no matter which surface recorded it.
  const recordPayment = useCallback(async (invoiceId, amount, paymentMode, date, reference) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId)
    if (!invoice) return false
    const newPaid = invoice.paid + amount
    const newBalance = invoice.amount - newPaid
    const payload = { paid: newPaid, balance: newBalance, status: newBalance <= 0 ? 'paid' : 'partial', payment_mode: paymentMode || invoice.paymentMode, date: date || invoice.date }
    if (reference !== undefined) payload.reference = reference || null
    const { data, error } = await supabase
      .from('invoices')
      .update(payload)
      .eq('id', invoiceId)
      .select()
      .single()
    if (error) { console.error('recordPayment error', error); return false }
    const mapped = mapInvoiceFromDb(data)
    setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? mapped : inv))
    syncStudentFee(mapped.student, mapped.course, mapped.paid, mapped.amount)
    if (installments.some((i) => i.invoice_id === invoiceId)) await applyPaymentToSchedule(invoiceId, amount)
    const lead = leads.find((l) => l.name === mapped.student && l.course === mapped.course)
    if (lead) {
      addActivity(lead.id, lead.status, lead.status, `Payment received — ₹${amount.toLocaleString('en-IN')} via ${paymentMode || 'existing method'}${reference ? ` (Ref: ${reference})` : ''}`, 'PAYMENT_RECEIVED')
      emitPaymentEvent({ eventType: AUTOMATION_EVENTS.PAYMENT_RECEIVED, lead, invoiceId, amount })
    }
    return true
  }, [invoices, syncStudentFee, installments, applyPaymentToSchedule, leads, addActivity])

  // The one and only path from "counsellor clicked Enroll" to a real
  // admission: Student Conversion → Course Association → Package
  // Association → Batch Assignment → Fee Plan → Payment → Lead = Enrolled
  // → Timeline → Automation Event. Nothing before this function runs
  // touches the database — the confirmation modal calls this exactly once,
  // on confirm.
  //
  // options: { pkg, batchId, discountPercent, initialPayment, paymentMethod, referenceNumber, admissionDate }
  const confirmAdmission = useCallback(async (lead, options) => {
    const { pkg, batchId, discountPercent = 0, initialPayment = 0, paymentMethod = 'UPI', referenceNumber, admissionDate } = options
    const enrollDate = admissionDate || new Date().toISOString().slice(0, 10)
    const batch = batches.find((b) => b.id === batchId)
    const basePrice = pkg?.price || 0
    const discountedBase = basePrice * (1 - (discountPercent || 0) / 100)
    const finalAmount = Math.round(discountedBase * 1.18)

    // ── Duplicate protection — never create a second student for a lead
    // that's already been converted. Match on name + course, same
    // convention used everywhere else this link is made.
    const existingStudent = students.find((s) => s.name === lead.name && s.course === lead.course)
    let student = existingStudent

    if (!existingStudent) {
      const { data, error } = await supabase.from('students').insert({
        name: lead.name, email: lead.email, phone: lead.phone, course: lead.course,
        batch_id: batch?.id || null, batch: batch?.name || 'Unassigned',
        enroll_date: enrollDate, status: 'active', fee_paid: 0, fee_total: finalAmount, avatar: lead.avatar,
      }).select().single()
      if (error) { console.error('confirmAdmission: student insert error', error); return { error: error.message } }
      student = mapStudentFromDb(data)
      setStudents((prev) => [student, ...prev])
      addActivity(lead.id, lead.status, lead.status, `Student record created for ${lead.name} — course: ${lead.course}`)
      if (batch) addActivity(lead.id, lead.status, lead.status, `Batch assigned: ${batch.name}`)
    } else if (batch && existingStudent.batch_id !== batch.id) {
      // Existing student found (duplicate protection) — still honor the
      // batch chosen here if they didn't already have one, but never
      // insert a second student record.
      const { data, error } = await supabase.from('students').update({ batch_id: batch.id, batch: batch.name }).eq('id', existingStudent.id).select().single()
      if (!error) {
        student = mapStudentFromDb(data)
        setStudents((prev) => prev.map((s) => s.id === student.id ? student : s))
        addActivity(lead.id, lead.status, lead.status, `Batch assigned: ${batch.name}`)
      }
    }

    // ── Fee Plan — reuse an existing invoice for this student+course
    // instead of creating a duplicate fee bill.
    let invoice = invoices.find((inv) => inv.student === lead.name && inv.course === lead.course)
    if (!invoice) {
      const invoiceId = nextInvoiceId(invoices)
      const { data, error } = await supabase.from('invoices').insert({
        id: invoiceId, student: lead.name, course: lead.course,
        amount: finalAmount, paid: 0, balance: finalAmount,
        date: enrollDate, due_date: new Date(new Date(enrollDate).getTime() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'partial', payment_mode: paymentMethod, discount_percent: discountPercent,
      }).select().single()
      if (error) { console.error('confirmAdmission: invoice insert error', error); return { error: error.message } }
      invoice = mapInvoiceFromDb(data)
      setInvoices((prev) => [invoice, ...prev])
      addActivity(lead.id, lead.status, lead.status, `Fee bill created — ₹${finalAmount.toLocaleString('en-IN')}${discountPercent ? ` (${discountPercent}% discount applied)` : ''}`, 'FEE_BILL_CREATED')
      // Only worth flagging as "pending" if the initial payment collected
      // right here won't already cover it in full — recordPayment below
      // fires its own PAYMENT_RECEIVED regardless.
      if (finalAmount - initialPayment > 0) emitPaymentEvent({ eventType: AUTOMATION_EVENTS.PAYMENT_PENDING, lead, invoiceId: invoice.id, amount: finalAmount - initialPayment })
    }

    // ── Payment — the initial amount collected at admission, through the
    // exact same recordPayment path every other payment goes through.
    if (initialPayment > 0) {
      await recordPayment(invoice.id, initialPayment, paymentMethod, enrollDate, referenceNumber)
    }

    // ── Lead = Enrolled
    const { data: updatedLead, error: leadErr } = await supabase.from('leads').update({ status: 'enrolled' }).eq('id', lead.id).select().single()
    if (leadErr) { console.error('confirmAdmission: lead update error', leadErr); return { error: leadErr.message } }
    setLeads((prev) => prev.map((l) => l.id === lead.id ? mapLeadFromDb(updatedLead) : l))
    addActivity(lead.id, lead.status, 'enrolled', `Admission confirmed — enrolled in ${lead.course}`, 'LEAD_ENROLLED')
    closePendingFollowUps(lead.name)

    // ── Automation Event — no WhatsApp/Email sent here; the future
    // Automation Engine reacts to this event for that.
    emitAutomationEvent({ eventType: AUTOMATION_EVENTS.LEAD_ENROLLED, entityType: 'lead', entityId: lead.id, sourceTable: 'leads', sourceId: lead.id })

    return { student, invoice, wasExistingStudent: !!existingStudent }
  }, [students, invoices, batches, addActivity, recordPayment, closePendingFollowUps])

  const createInvoice = useCallback(async (invoiceData) => {
    const { data, error } = await supabase.from('invoices').insert(invoiceData).select().single()
    if (error) { console.error('createInvoice error', error); return null }
    const mapped = mapInvoiceFromDb(data)
    setInvoices((prev) => [mapped, ...prev])
    return mapped
  }, [])

  // ── AUTOMATION WORKFLOWS ────────────────────────────────────────────
  // CRUD only — matching/condition-checking/action-execution never happens
  // here or anywhere else in the frontend. This is the admin-facing
  // "define the workflow" side; the automation-engine Edge Function
  // (triggered from emitAutomationEvent in lib/automation.js) is the only
  // thing that ever reads these rows to decide what runs.
  const refetchWorkflow = useCallback(async (workflowId) => {
    const { data, error } = await supabase
      .from('automation_workflows')
      .select('*, automation_workflow_conditions(*), automation_workflow_actions(*)')
      .eq('id', workflowId)
      .single()
    if (error) { console.error('refetchWorkflow error', error); return null }
    const mapped = mapWorkflowFromDb(data)
    setAutomationWorkflows((prev) => [mapped, ...prev.filter((w) => w.id !== workflowId)])
    return mapped
  }, [])

  // conditions/actions are replaced wholesale on every save — simplest
  // correct way to handle reordering/removal without diffing, and these
  // lists are short (a handful of rows) so the delete+reinsert is cheap.
  const writeWorkflowChildren = useCallback(async (workflowId, conditions, actions) => {
    await supabase.from('automation_workflow_conditions').delete().eq('workflow_id', workflowId)
    await supabase.from('automation_workflow_actions').delete().eq('workflow_id', workflowId)
    if (conditions?.length) {
      const rows = conditions.map((c, i) => ({ workflow_id: workflowId, field: c.field, operator: c.operator, value: c.value ?? null, position: i }))
      const { error } = await supabase.from('automation_workflow_conditions').insert(rows)
      if (error) console.error('writeWorkflowChildren conditions error', error)
    }
    if (actions?.length) {
      const rows = actions.map((a, i) => ({ workflow_id: workflowId, action_type: a.action_type, config: a.config || {}, delay_minutes: a.delay_minutes || 0, position: i }))
      const { error } = await supabase.from('automation_workflow_actions').insert(rows)
      if (error) console.error('writeWorkflowChildren actions error', error)
    }
  }, [])

  const createWorkflow = useCallback(async ({ name, description, triggerEvent, status, conditions, actions }) => {
    const { data: { user } } = await supabase.auth.getUser()
    const createdByName = teamMembers.find((m) => m.id === user?.id)?.name || null
    const { data, error } = await supabase.from('automation_workflows').insert({
      name, description: description || null, trigger_event: triggerEvent, status: status || 'draft',
      created_by: user?.id || null, created_by_name: createdByName,
    }).select().single()
    if (error) { console.error('createWorkflow error', error); return { error: error.message } }
    await writeWorkflowChildren(data.id, conditions, actions)
    return { data: await refetchWorkflow(data.id) }
  }, [teamMembers, writeWorkflowChildren, refetchWorkflow])

  const updateWorkflow = useCallback(async (workflowId, { name, description, triggerEvent, status, conditions, actions }) => {
    const { error } = await supabase.from('automation_workflows').update({
      name, description: description || null, trigger_event: triggerEvent, status, updated_at: new Date().toISOString(),
    }).eq('id', workflowId)
    if (error) { console.error('updateWorkflow error', error); return { error: error.message } }
    await writeWorkflowChildren(workflowId, conditions, actions)
    return { data: await refetchWorkflow(workflowId) }
  }, [writeWorkflowChildren, refetchWorkflow])

  // Draft/Active/Inactive (spec section 8) — only Active workflows are
  // matched by the engine (see automation_workflows.status = 'active' in
  // the Edge Function's query); this is the only place that flips it.
  const setWorkflowStatus = useCallback(async (workflowId, status) => {
    const { error } = await supabase.from('automation_workflows').update({ status, updated_at: new Date().toISOString() }).eq('id', workflowId)
    if (error) { console.error('setWorkflowStatus error', error); return }
    setAutomationWorkflows((prev) => prev.map((w) => w.id === workflowId ? { ...w, status } : w))
  }, [])

  const duplicateWorkflow = useCallback(async (workflowId) => {
    const source = automationWorkflows.find((w) => w.id === workflowId)
    if (!source) return { error: 'Workflow not found' }
    return createWorkflow({
      name: `${source.name} (Copy)`, description: source.description, triggerEvent: source.trigger_event, status: 'draft',
      conditions: source.conditions, actions: source.actions,
    })
  }, [automationWorkflows, createWorkflow])

  const deleteWorkflow = useCallback(async (workflowId) => {
    const { error } = await supabase.from('automation_workflows').delete().eq('id', workflowId)
    if (error) { console.error('deleteWorkflow error', error); return { error: error.message } }
    setAutomationWorkflows((prev) => prev.filter((w) => w.id !== workflowId))
    return { success: true }
  }, [])

  // Lazy-loaded (not part of the initial app-load batch) — execution
  // history grows without bound, unlike the workflow definitions
  // themselves, so only the Automation > Logs tab ever fetches it.
  const fetchAutomationLogs = useCallback(async ({ limit = 100 } = {}) => {
    const { data, error } = await supabase
      .from('automation_executions')
      .select('*, automation_execution_actions(*)')
      .order('started_at', { ascending: false })
      .limit(limit)
    if (error) { console.error('fetchAutomationLogs error', error); return [] }
    const mapped = (data || []).map((e) => ({
      ...e,
      actions: (e.automation_execution_actions || []).slice().sort((a, b) => a.position - b.position),
    }))
    setAutomationExecutions(mapped)
    return mapped
  }, [])

  // Runs server-side (see automation-engine's 'retry' mode) — this just
  // invokes it with the current session's token and re-reads the log
  // afterward so the UI reflects the outcome. Never writes automation
  // tables directly from the client.
  const retryAutomationAction = useCallback(async (executionActionId) => {
    const { data, error } = await supabase.functions.invoke('automation-engine', { body: { mode: 'retry', executionActionId } })
    if (error) { console.error('retryAutomationAction error', error); return { error: error.message } }
    if (data?.error) return { error: data.error }
    await fetchAutomationLogs()
    return { data }
  }, [fetchAutomationLogs])

  return (
    <DataContext.Provider value={{
      leads, setLeads, addLead, updateLead, deleteLead, updateLeadStatus, reopenLead, takeOverLead,
      followUps, setFollowUps, addFollowUp, updateFollowUp, deleteFollowUp, scheduleFollowUp, recordMeetingOutcome,
      leadActivities, addActivity,
      students, setStudents, addStudent, deleteStudent, updateStudent, enrollLead, confirmAdmission, markPackageShared, generateFeeBill, unlockInvoice,
      packages, setPackages, addPackage, updatePackage, deletePackage,
      invoices, setInvoices, recordPayment, createInvoice, updateInvoiceDueDate,
      installments,
      teamMembers,
      leadDocuments, addLeadDocument, deleteLeadDocument,
      leadNotes, addLeadNote, studentNotes, addStudentNote,
      batches, addBatch, updateBatch, deleteBatch,
      attendance, markAttendance,
      staffAttendance, markStaffAttendance,
      emailMessages, sendEmail,
      automationWorkflows, createWorkflow, updateWorkflow, setWorkflowStatus, duplicateWorkflow, deleteWorkflow,
      automationExecutions, fetchAutomationLogs, retryAutomationAction,
      loading,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)