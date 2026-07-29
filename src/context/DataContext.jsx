import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [leadActivities, setLeadActivities] = useState([])
  const [students, setStudents] = useState([])
  const [packages, setPackages] = useState([])
  const [invoices, setInvoices] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // ── INITIAL LOAD ─────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const [leadsRes, followUpsRes, studentsRes, packagesRes, invoicesRes, activitiesRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('follow_ups').select('*').order('created_at', { ascending: false }),
        supabase.from('students').select('*').order('created_at', { ascending: false }),
        supabase.from('packages').select('*'),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('lead_activities').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, role'),
      ])

      if (leadsRes.error) console.error('leads error', leadsRes.error)
      if (followUpsRes.error) console.error('follow_ups error', followUpsRes.error)
      if (studentsRes.error) console.error('students error', studentsRes.error)
      if (packagesRes.error) console.error('packages error', packagesRes.error)
      if (invoicesRes.error) console.error('invoices error', invoicesRes.error)
      if (activitiesRes.error) console.error('lead_activities error', activitiesRes.error)
      if (profilesRes.error) console.error('profiles error', profilesRes.error)

      const leadsList = (leadsRes.data || []).map(mapLeadFromDb)
      const followUpsList = (followUpsRes.data || []).map(mapFollowUpFromDb)

      setLeads(leadsList)
      setFollowUps(followUpsList)
      setStudents((studentsRes.data || []).map(mapStudentFromDb))
      setPackages(packagesRes.data || [])
      setInvoices((invoicesRes.data || []).map(mapInvoiceFromDb))
      setLeadActivities(activitiesRes.data || [])
      setTeamMembers(profilesRes.data || [])
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
    setFollowUps((prev) => prev.map((f) => f.id === followUpId ? mapFollowUpFromDb(data) : f))
  }, [])

  // ── PACKAGES ─────────────────────────────────────────────
  const addPackage = useCallback(async (pkg) => {
    const { id, ...pkgData } = pkg
    const { data, error } = await supabase.from('packages').insert(pkgData).select().single()
    if (error) { console.error('addPackage error', error); return }
    setPackages((prev) => [...prev, data])
  }, [])

  // ── ENROLLMENT (lead -> student + invoice) ───────────────
  const enrollLead = useCallback(async (lead, pkg) => {
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

    if (!existingStudent) {
      const batch = `Batch ${new Date().getFullYear()}-${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .insert({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          course: lead.course,
          batch,
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
      const invoiceId = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`
      const { data: invoiceData, error: invoiceErr } = await supabase
        .from('invoices')
        .insert({
          id: invoiceId,
          student: lead.name,
          course: lead.course,
          amount: pkg?.price || 0,
          paid: 0,
          balance: pkg?.price || 0,
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
  }, [students, invoices, addActivity, closePendingFollowUps])

  return (
    <DataContext.Provider value={{
      leads, setLeads, addLead, updateLead, deleteLead, updateLeadStatus, takeOverLead,
      followUps, setFollowUps, addFollowUp, updateFollowUp,
      leadActivities, addActivity,
      students, setStudents, enrollLead,
      packages, setPackages, addPackage,
      invoices, setInvoices,
      teamMembers,
      loading,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)