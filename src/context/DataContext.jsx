import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

export function DataProvider({ children }) {
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [leadActivities, setLeadActivities] = useState([])
  const [students, setStudents] = useState([])
  const [packages, setPackages] = useState([])
  const [invoices, setInvoices] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [leadDocuments, setLeadDocuments] = useState([])
  const [batches, setBatches] = useState([])
  const [installments, setInstallments] = useState([])
  const [loading, setLoading] = useState(true)

  // ── INITIAL LOAD ─────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const [leadsRes, followUpsRes, studentsRes, packagesRes, invoicesRes, activitiesRes, profilesRes, documentsRes, batchesRes, installmentsRes] = await Promise.all([
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
      setBatches(batchesRes.data || [])
      setInstallments(installmentsRes.data || [])
      setLoading(false)

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

  // ── LEAD ACTIVITIES (timeline) ────────────────────────────
  const addActivity = useCallback(async (leadId, fromStatus, toStatus, description) => {
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({ lead_id: leadId, from_status: fromStatus || null, to_status: toStatus || null, description })
      .select()
      .single()
    if (error) { console.error('addActivity error', error); return }
    setLeadActivities((prev) => [data, ...prev])
  }, [])

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
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('leads').insert({ ...leadData, assigned_to: user?.id || null }).select().single()
    if (error) { console.error('addLead error', error); return }
    setLeads((prev) => [mapLeadFromDb(data), ...prev])
    addActivity(data.id, null, data.status, `Lead created from ${data.source}`)
  }, [addActivity])

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
    addActivity(leadId, lead?.status, lead?.status, `${agentName} took over this lead`)
  }, [leads, teamMembers, addActivity])

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
    setLeads((prev) => prev.map((l) => l.id === id ? mapLeadFromDb(data) : l))
    if (prevLead && prevLead.status !== data.status) {
      addActivity(id, prevLead.status, data.status, activityDescription || `Status changed from ${prevLead.status} to ${data.status}`)
      if (data.status === 'enrolled' || data.status === 'lost') closePendingFollowUps(data.name)
    }
  }, [leads, addActivity, closePendingFollowUps])

  const deleteLead = useCallback(async (leadId) => {
    const { error } = await supabase.from('leads').delete().eq('id', leadId)
    if (error) { console.error('deleteLead error', error); return }
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
  }, [])

  const updateLeadStatus = useCallback(async (leadId, newStatus, description) => {
    const prevLead = leads.find((l) => l.id === leadId)
    const { data, error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', leadId)
      .select()
      .single()
    if (error) { console.error('updateLeadStatus error', error); return }
    setLeads((prev) => prev.map((l) => l.id === leadId ? mapLeadFromDb(data) : l))
    addActivity(leadId, prevLead?.status, newStatus, description || `Status changed from ${prevLead?.status || '—'} to ${newStatus}`)
    if (newStatus === 'enrolled' || newStatus === 'lost') closePendingFollowUps(data.name)
  }, [leads, addActivity, closePendingFollowUps])

  // ── FOLLOW-UPS ───────────────────────────────────────────
  const addFollowUp = useCallback(async (followUp) => {
    const { id, ...fuData } = followUp
    const { data, error } = await supabase.from('follow_ups').insert(fuData).select().single()
    if (error) { console.error('addFollowUp error', error); return }
    setFollowUps((prev) => [mapFollowUpFromDb(data), ...prev])
  }, [])

  const updateFollowUp = useCallback(async (followUpId, updates) => {
    const { data, error } = await supabase
      .from('follow_ups')
      .update(updates)
      .eq('id', followUpId)
      .select()
      .single()
    if (error) { console.error('updateFollowUp error', error); return }
    // Moves the touched follow-up to the front of the list so an action
    // (RNR, reschedule, mark complete) is visibly reflected immediately —
    // otherwise it silently stays buried in its old spot and reps re-do
    // the same action thinking nothing happened.
    setFollowUps((prev) => [mapFollowUpFromDb(data), ...prev.filter((f) => f.id !== followUpId)])
  }, [])

  const deleteFollowUp = useCallback(async (followUpId) => {
    const { error } = await supabase.from('follow_ups').delete().eq('id', followUpId)
    if (error) { console.error('deleteFollowUp error', error); return }
    setFollowUps((prev) => prev.filter((f) => f.id !== followUpId))
  }, [])

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
    setLeads((prev) => prev.map((l) => l.id === lead.id ? mapLeadFromDb(updatedLead) : l))
    addActivity(lead.id, lead.status, 'enrolled', `Enrolled in ${lead.course}`)
    closePendingFollowUps(lead.name)

    // 2. skip if student already exists with this email
    const existingStudent = students.find(s => s.email === lead.email)
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
          fee_total: pkg?.price || 0,
          avatar: lead.avatar,
          attendance: 0,
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

  const recordPayment = useCallback(async (invoiceId, amount, paymentMode, date) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId)
    if (!invoice) return
    const newPaid = invoice.paid + amount
    const newBalance = invoice.amount - newPaid
    const { data, error } = await supabase
      .from('invoices')
      .update({ paid: newPaid, balance: newBalance, status: newBalance <= 0 ? 'paid' : 'partial', payment_mode: paymentMode || invoice.paymentMode, date: date || invoice.date })
      .eq('id', invoiceId)
      .select()
      .single()
    if (error) { console.error('recordPayment error', error); return }
    const mapped = mapInvoiceFromDb(data)
    setInvoices((prev) => prev.map((inv) => inv.id === invoiceId ? mapped : inv))
    syncStudentFee(mapped.student, mapped.course, mapped.paid, mapped.amount)
    if (installments.some((i) => i.invoice_id === invoiceId)) await applyPaymentToSchedule(invoiceId, amount)
  }, [invoices, syncStudentFee, installments, applyPaymentToSchedule])

  const createInvoice = useCallback(async (invoiceData) => {
    const { data, error } = await supabase.from('invoices').insert(invoiceData).select().single()
    if (error) { console.error('createInvoice error', error); return null }
    const mapped = mapInvoiceFromDb(data)
    setInvoices((prev) => [mapped, ...prev])
    return mapped
  }, [])

  return (
    <DataContext.Provider value={{
      leads, setLeads, addLead, updateLead, deleteLead, updateLeadStatus, takeOverLead,
      followUps, setFollowUps, addFollowUp, updateFollowUp, deleteFollowUp,
      leadActivities, addActivity,
      students, setStudents, addStudent, deleteStudent, updateStudent, enrollLead, generateFeeBill, unlockInvoice,
      packages, setPackages, addPackage,
      invoices, setInvoices, recordPayment, createInvoice,
      installments,
      teamMembers,
      leadDocuments, addLeadDocument, deleteLeadDocument,
      batches, addBatch, updateBatch, deleteBatch,
      loading,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)