import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  Mail,
  Users,
  MessageCircle,
  Calendar,
  Clock,
  Check,
  CheckCircle,
  AlertCircle,
  ListFilter,
  LayoutList,
  CalendarDays,
  Plus,
  X,
  ChevronDown,
  Bell,
  GraduationCap,
  Trash2,
  CheckCircle2,
  PhoneMissed,
  UserX,
  UserCheck,
  History,
  CalendarClock,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import { useData } from '../context/DataContext'

const typeConfig = {
  call: { icon: Phone, color: 'sky', label: 'Call' },
  email: { icon: Mail, color: 'primary', label: 'Email' },
  meeting: { icon: Users, color: 'emerald', label: 'Meeting' },
  whatsapp: { icon: MessageCircle, color: 'emerald', label: 'WhatsApp' },
}

const priorityConfig = {
  high: { color: 'rose', label: 'High' },
  medium: { color: 'accent', label: 'Medium' },
  low: { color: 'emerald', label: 'Low' },
}

const statusConfig = {
  pending: { color: 'accent', label: 'Pending' },
  completed: { color: 'emerald', label: 'Completed' },
}

const today = new Date().toISOString().split('T')[0]

function getWeekDates() {
  const current = new Date(today)
  const dayOfWeek = current.getDay()
  const monday = new Date(current)
  monday.setDate(current.getDate() - ((dayOfWeek + 6) % 7))
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      isToday: d.toISOString().split('T')[0] === today,
    })
  }
  return days
}

// ─── ACTION DROPDOWN (per follow-up card) ──────────────────────────────
function FollowUpActionMenu({ fu, isDark, closedStatus, onClose, onMarkComplete, onRNR, onLost, onTransferToStudent, onPresetReschedule, onCustomReschedule, onCallNow, onDelete }) {
  const ref = useRef(null)
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const itemCls = `w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
    isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'
  }`
  const dividerCls = `my-1 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-100'}`
  const sectionLabelCls = `px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-dark-500' : 'text-dark-400'}`
  const item = (icon, label, onClick, extraCls = '') => (
    <button onClick={() => { onClick(); onClose() }} className={`${itemCls} ${extraCls}`}>{icon}{label}</button>
  )

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }}
      className={`absolute right-0 z-30 mt-1 w-64 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80 shadow-black/40' : 'bg-white border-dark-200 shadow-dark-200/30'}`}
    >
      {fu.status === 'pending' && item(<Check className="w-3.5 h-3.5" />, 'Mark Completed', onMarkComplete, isDark ? 'text-emerald-400' : 'text-emerald-600')}
      {!closedStatus && item(<PhoneMissed className="w-3.5 h-3.5" />, 'RNR (Ring No Response)', onRNR)}
      {!closedStatus && item(<GraduationCap className="w-3.5 h-3.5" />, 'Transfer to Student', onTransferToStudent, isDark ? 'text-primary-400' : 'text-primary-600')}
      {!closedStatus && item(<UserX className="w-3.5 h-3.5" />, 'Mark Lost', onLost, isDark ? 'text-rose-400' : 'text-rose-600')}
      {closedStatus && (
        <p className={`px-3 py-2 text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>This lead is already {closedStatus} — pipeline actions are hidden.</p>
      )}
      <div className={dividerCls} />
      <p className={sectionLabelCls}>Reschedule</p>
      {item(<Clock className="w-3.5 h-3.5" />, 'Follow up again in 1 day', () => onPresetReschedule(1))}
      {item(<Clock className="w-3.5 h-3.5" />, 'Follow up again in 3 days', () => onPresetReschedule(3))}
      {item(<Clock className="w-3.5 h-3.5" />, 'Follow up again in 7 days', () => onPresetReschedule(7))}
      <div className="px-3 py-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
          className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-xs outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
        <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)}
          className={`w-[4.7rem] px-1.5 py-1.5 rounded-lg border text-xs outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
        <button
          type="button"
          disabled={!customDate}
          onClick={() => { if (!customDate) return; onCustomReschedule(customDate, customTime); onClose() }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 transition-colors"
        >Set</button>
      </div>
      <div className={dividerCls} />
      {item(<Phone className="w-3.5 h-3.5" />, 'Call Now', onCallNow)}
      {item(<Trash2 className="w-3.5 h-3.5" />, 'Delete', onDelete, isDark ? 'text-rose-400' : 'text-rose-600')}
    </motion.div>
  )
}

// ─── LOST REASON MODAL ───────────────────────────────────────────────
function FollowUpLostReasonModal({ fu, isDark, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const handleSubmit = (e) => { e.preventDefault(); if (reason.trim()) onSubmit(fu, reason.trim()) }
  const inputClass = isDark
    ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
    : 'bg-white border-dark-200 text-dark-900 placeholder-dark-400 focus:border-primary-500 focus:ring-primary-500/20'

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><UserX className="w-5 h-5 text-rose-500" />Mark as Lost</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Why is {fu.lead} being marked lost?</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Reason *</label>
            <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. too expensive, chose another institute, not interested anymore..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-500/25 transition-all"
            ><UserX className="w-4 h-4" />Mark Lost</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function FollowUps() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState('list')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [bucketFilter, setBucketFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const { followUps: localFollowUps, addFollowUp, updateFollowUp, updateLead, leads, enrollLead, setFollowUps, addActivity, teamMembers, takeOverLead } = useData()
  const [notification, setNotification] = useState(null)
  const [showTransferConfirm, setShowTransferConfirm] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [showLostModal, setShowLostModal] = useState(null)

  const showToast = (message, type = 'success') => setNotification({ message, type })

  const [formData, setFormData] = useState({
    lead: '',
    type: 'call',
    date: '',
    time: '',
    priority: 'medium',
    notes: '',
  })

  const getLeadFor = (fu) => leads.find((l) => l.name === fu.lead)
  const getLeadFollowUpHistory = (leadName) => {
    const all = localFollowUps.filter((f) => f.lead === leadName)
    const completed = all.filter((f) => f.status === 'completed')
    const pending = all.filter((f) => f.status === 'pending')
    const last = completed.length ? completed.reduce((a, b) => (a.date > b.date ? a : b)) : null
    const next = pending.length ? pending.reduce((a, b) => (a.date < b.date ? a : b)) : null
    return { last, next }
  }
  const isRNR = (fu) => fu.notes?.toLowerCase().startsWith('ring no response')
  const isLostLead = (fu) => getLeadFor(fu)?.status === 'lost'
  const goToLead = (fu) => {
    const lead = getLeadFor(fu)
    if (lead) navigate('/leads', { state: { openLeadId: lead.id } })
    else showToast(`Lead "${fu.lead}" not found`, 'error')
  }

  const filtered = localFollowUps.filter((fu) => {
    if (typeFilter !== 'all' && fu.type !== typeFilter) return false
    if (priorityFilter !== 'all' && fu.priority !== priorityFilter) return false
    if (statusFilter !== 'all' && fu.status !== statusFilter) return false
    if (bucketFilter === 'today' && fu.date !== today) return false
    if (bucketFilter === 'pending' && fu.status !== 'pending') return false
    if (bucketFilter === 'completed' && fu.status !== 'completed') return false
    if (bucketFilter === 'overdue' && !(fu.date < today && fu.status === 'pending')) return false
    if (bucketFilter === 'rnr' && !isRNR(fu)) return false
    if (bucketFilter === 'lost' && !isLostLead(fu)) return false
    // The main list is meant for plain follow-ups only — RNR and Lost Lead
    // each have their own dedicated bucket above, so entries belonging to
    // those get filtered out here unless that specific bucket is selected.
    if (bucketFilter === 'all' && (isRNR(fu) || isLostLead(fu))) return false
    if (dateFrom && fu.date < dateFrom) return false
    if (dateTo && fu.date > dateTo) return false
    return true
  })

  const todayCount = localFollowUps.filter((f) => f.date === today).length
  const pendingCount = localFollowUps.filter((f) => f.status === 'pending').length
  const completedCount = localFollowUps.filter((f) => f.status === 'completed').length
  const overdueCount = localFollowUps.filter(
    (f) => f.date < today && f.status === 'pending'
  ).length
  const rnrCount = localFollowUps.filter(isRNR).length
  const lostCount = localFollowUps.filter(isLostLead).length

  const weekDates = getWeekDates()

  const cardClass = isDark
    ? 'bg-dark-900 border border-dark-700/60'
    : 'bg-white border border-dark-200/60 shadow-sm'

  // A rep who actively works a follow-up (RNR, reschedule, mark complete,
  // call) is the one really handling that lead — if it's still sitting
  // "Unassigned" it should reflect them, not stay blank until someone
  // remembers to click "Take Over Lead" separately.
  const autoAssignIfUnassigned = (fu) => {
    const lead = getLeadFor(fu)
    if (lead && !lead.assigned_to) takeOverLead(lead.id)
  }

  const handleMarkComplete = (id) => {
    const fu = localFollowUps.find((f) => f.id === id)
    updateFollowUp(id, { status: 'completed' })
    if (fu) autoAssignIfUnassigned(fu)
    const lead = fu && leads.find((l) => l.name === fu.lead)
    if (lead) addActivity(lead.id, lead.status, lead.status, `${fu.type.toUpperCase()} follow-up marked COMPLETED`)
  }

  const handleScheduleSubmit = (e) => {
    e.preventDefault()
    const existing = localFollowUps.find((f) => f.lead === formData.lead)
    if (existing) {
      updateFollowUp(existing.id, { type: formData.type, date: formData.date, time: formData.time, notes: formData.notes, priority: formData.priority, status: 'pending' })
    } else {
      addFollowUp({
        id: Date.now(),
        lead: formData.lead,
        type: formData.type,
        date: formData.date,
        time: formData.time,
        notes: formData.notes,
        status: 'pending',
        priority: formData.priority,
      })
    }
    setFormData({ lead: '', type: 'call', date: '', time: '', priority: 'medium', notes: '' })
    setShowModal(false)
  }

  const handleTransferToStudent = (fu) => {
    const lead = leads.find((l) => l.name === fu.lead)
    if (!lead) {
      showToast(`Lead "${fu.lead}" not found in leads list`, 'error')
      return
    }
    if (lead.status === 'enrolled') {
      showToast(`${fu.lead} is already enrolled as a student`, 'error')
      return
    }
    const pkg = null
    enrollLead(lead, pkg)
    updateFollowUp(fu.id, { status: 'completed' })
    showToast(`${fu.lead} has been enrolled as a student`)
    setShowTransferConfirm(null)
  }

  const handleDeleteFollowUp = (id) => {
    setFollowUps((prev) => prev.filter((f) => f.id !== id))
    showToast('Follow-up deleted')
  }

  const handleCallNow = (fu) => {
    const lead = leads.find((l) => l.name === fu.lead)
    if (lead) {
      window.open(`tel:${lead.phone}`)
      autoAssignIfUnassigned(fu)
    }
    showToast(`Calling ${fu.lead}...`)
  }

  const handlePresetReschedule = (fu, days) => {
    const newDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
    updateFollowUp(fu.id, { date: newDate, status: 'pending' })
    autoAssignIfUnassigned(fu)
    const lead = getLeadFor(fu)
    if (lead) addActivity(lead.id, lead.status, lead.status, `${fu.type.toUpperCase()} follow-up rescheduled to ${newDate}`)
    showToast(`Follow-up with ${fu.lead} rescheduled to ${newDate}`)
  }

  const handleRNR = (fu) => {
    const newDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const noteText = `Ring No Response (RNR).${fu.notes && !isRNR(fu) ? ` ${fu.notes}` : ''}`
    updateFollowUp(fu.id, { date: newDate, notes: noteText, status: 'pending' })
    autoAssignIfUnassigned(fu)
    const lead = getLeadFor(fu)
    if (lead) addActivity(lead.id, lead.status, lead.status, `CALL follow-up marked NOT_ATTEMPT — next attempt ${newDate}`)
    showToast(`Marked RNR for ${fu.lead} — next attempt ${newDate}`)
  }

  const handleMarkLost = (fu, reason) => {
    const lead = getLeadFor(fu)
    if (!lead) { showToast(`Lead "${fu.lead}" not found`, 'error'); return }
    updateLead({ ...lead, status: 'lost', notes: `${lead.notes ? `${lead.notes}\n` : ''}[Lost] ${reason}` }, reason)
    updateFollowUp(fu.id, { status: 'completed' })
    showToast(`${fu.lead} marked as Lost`)
  }

  const leadNames = [...new Set([...localFollowUps.map((f) => f.lead), ...leads.map((l) => l.name)])]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1
            className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-dark-900'
            }`}
          >
            Follow-ups
          </h1>
          <p className={isDark ? 'text-dark-400' : 'text-dark-500'}>
            Manage your scheduled follow-ups and reminders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Schedule Follow-up
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium border transition-all duration-200 ${
              isDark
                ? 'border-dark-700 text-dark-300 hover:bg-dark-800'
                : 'border-dark-300 text-dark-600 hover:bg-dark-50'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            View Calendar
          </button>
        </div>
      </motion.div>

      {/* Stats Bar — click a bucket to filter the list below */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-4"
      >
        {[
          { key: 'all', label: 'All', value: localFollowUps.filter((f) => !isRNR(f) && !isLostLead(f)).length, icon: ListFilter, colorClass: 'text-dark-400 bg-dark-500/10' },
          { key: 'today', label: 'Today', value: todayCount, icon: Calendar, colorClass: 'text-sky-500 bg-sky-500/10' },
          { key: 'pending', label: 'Pending', value: pendingCount, icon: Clock, colorClass: 'text-accent-500 bg-accent-500/10' },
          { key: 'completed', label: 'Completed', value: completedCount, icon: CheckCircle, colorClass: 'text-emerald-500 bg-emerald-500/10' },
          { key: 'overdue', label: 'Overdue', value: overdueCount, icon: AlertCircle, colorClass: 'text-rose-500 bg-rose-500/10' },
          { key: 'rnr', label: 'RNR', value: rnrCount, icon: PhoneMissed, colorClass: 'text-amber-500 bg-amber-500/10' },
          { key: 'lost', label: 'Lost Lead', value: lostCount, icon: UserX, colorClass: 'text-rose-600 bg-rose-600/10' },
        ].map((stat, index) => (
          <motion.button
            key={stat.key}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setBucketFilter(bucketFilter === stat.key ? 'all' : stat.key)}
            className={`min-w-0 rounded-2xl p-4 text-left transition-all ${cardClass} ${
              bucketFilter === stat.key ? 'ring-2 ring-primary-500 border-primary-500' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${stat.colorClass}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm leading-tight ${
                    isDark ? 'text-dark-400' : 'text-dark-500'
                  }`}
                >
                  {stat.label}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    stat.key === 'overdue' || stat.key === 'lost'
                      ? 'text-rose-500'
                      : isDark
                      ? 'text-white'
                      : 'text-dark-900'
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Filters & View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`rounded-2xl p-4 ${cardClass}`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* View Toggle */}
          <div
            className={`flex items-center rounded-xl p-1 ${
              isDark ? 'bg-dark-800' : 'bg-dark-100'
            }`}
          >
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : isDark
                  ? 'text-dark-400 hover:text-dark-200'
                  : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              List View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : isDark
                  ? 'text-dark-400 hover:text-dark-200'
                  : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Calendar View
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ListFilter
                className={`w-4 h-4 ${
                  isDark ? 'text-dark-400' : 'text-dark-500'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isDark ? 'text-dark-400' : 'text-dark-500'
                }`}
              >
                Filters:
              </span>
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 rounded-lg text-sm border transition-all duration-200 ${
                  isDark
                    ? 'bg-dark-800 border-dark-700 text-dark-300'
                    : 'bg-white border-dark-200 text-dark-700'
                }`}
              >
                <option value="all">All Types</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-dark-500' : 'text-dark-400'
                }`}
              />
            </div>

            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 rounded-lg text-sm border transition-all duration-200 ${
                  isDark
                    ? 'bg-dark-800 border-dark-700 text-dark-300'
                    : 'bg-white border-dark-200 text-dark-700'
                }`}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-dark-500' : 'text-dark-400'
                }`}
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`appearance-none pl-3 pr-8 py-2 rounded-lg text-sm border transition-all duration-200 ${
                  isDark
                    ? 'bg-dark-800 border-dark-700 text-dark-300'
                    : 'bg-white border-dark-200 text-dark-700'
                }`}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? 'text-dark-500' : 'text-dark-400'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>From</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className={`px-2.5 py-2 rounded-lg text-sm border transition-all duration-200 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>To</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className={`px-2.5 py-2 rounded-lg text-sm border transition-all duration-200 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`} />
            </div>
            {(typeFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo) && (
              <button type="button" onClick={() => { setTypeFilter('all'); setPriorityFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo('') }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
                <X className="w-3.5 h-3.5" />Clear
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((fu, index) => {
              const typeInfo = typeConfig[fu.type]
              const TypeIcon = typeInfo.icon
              const prioInfo = priorityConfig[fu.priority]
              const statInfo = statusConfig[fu.status]
              const isOverdue = fu.date < today && fu.status === 'pending'
              const fuLead = getLeadFor(fu)
              const assignedName = teamMembers.find((m) => m.id === fuLead?.assigned_to)?.name
              const { last: lastFollowUp, next: nextFollowUp } = getLeadFollowUpHistory(fu.lead)

              return (
                <motion.div
                  key={fu.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl ${cardClass}`}
                >
                  <div className="flex">
                    {/* Left Color Border */}
                    <div
                      className={`w-1.5 shrink-0 rounded-l-2xl ${
                        fu.type === 'call'
                          ? 'bg-sky-500'
                          : fu.type === 'email'
                          ? 'bg-primary-500'
                          : 'bg-emerald-500'
                      }`}
                    />

                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        {/* Left: Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              fu.type === 'call'
                                ? 'bg-sky-500/10 text-sky-500'
                                : fu.type === 'email'
                                ? 'bg-primary-500/10 text-primary-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                          >
                            <TypeIcon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3
                                onClick={() => goToLead(fu)}
                                className={`font-semibold cursor-pointer hover:underline ${
                                  isDark ? 'text-white hover:text-primary-400' : 'text-dark-900 hover:text-primary-600'
                                }`}
                              >
                                {fu.lead}
                              </h3>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  fu.type === 'call'
                                    ? 'bg-sky-500/10 text-sky-500'
                                    : fu.type === 'email'
                                    ? 'bg-primary-500/10 text-primary-500'
                                    : 'bg-emerald-500/10 text-emerald-500'
                                }`}
                              >
                                {typeInfo.label}
                              </span>
                            </div>

                            <div
                              className={`flex items-center gap-3 mt-1 text-sm ${
                                isDark ? 'text-dark-400' : 'text-dark-500'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {fu.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {fu.time}
                              </span>
                            </div>

                            <div
                              className={`flex items-center gap-4 mt-1.5 text-xs flex-wrap ${
                                isDark ? 'text-dark-500' : 'text-dark-400'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                {assignedName || 'Unassigned'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {fuLead?.phone || '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <History className="w-3.5 h-3.5" />
                                Last: {lastFollowUp ? lastFollowUp.date : '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarClock className="w-3.5 h-3.5" />
                                Next: {nextFollowUp ? nextFollowUp.date : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Badges & Actions */}
                        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
                          {/* Priority Badge */}
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              prioInfo.color === 'rose'
                                ? 'bg-rose-500/10 text-rose-500'
                                : prioInfo.color === 'accent'
                                ? 'bg-accent-500/10 text-accent-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                          >
                            {prioInfo.label}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              isOverdue
                                ? 'bg-rose-500/10 text-rose-500'
                                : statInfo.color === 'accent'
                                ? 'bg-accent-500/10 text-accent-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                          >
                            {isOverdue ? 'Overdue' : statInfo.label}
                          </span>

                          {/* Action Dropdown */}
                          <div className="relative ml-2">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={() => setActionMenuId(actionMenuId === fu.id ? null : fu.id)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700' : 'bg-dark-100 text-dark-600 hover:text-dark-900 hover:bg-dark-200'}`}
                            >
                              Action<ChevronDown className="w-3.5 h-3.5" />
                            </motion.button>
                            <AnimatePresence>
                              {actionMenuId === fu.id && (
                                <FollowUpActionMenu
                                  fu={fu}
                                  isDark={isDark}
                                  closedStatus={['enrolled', 'lost'].includes(getLeadFor(fu)?.status) ? getLeadFor(fu).status : null}
                                  onClose={() => setActionMenuId(null)}
                                  onMarkComplete={() => handleMarkComplete(fu.id)}
                                  onRNR={() => handleRNR(fu)}
                                  onLost={() => setShowLostModal(fu)}
                                  onTransferToStudent={() => setShowTransferConfirm(fu)}
                                  onPresetReschedule={(days) => handlePresetReschedule(fu, days)}
                                  onCustomReschedule={(date, time) => {
                                    const timeStr = time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : fu.time
                                    updateFollowUp(fu.id, { date, time: timeStr, status: 'pending' })
                                    autoAssignIfUnassigned(fu)
                                    const lead = getLeadFor(fu)
                                    if (lead) addActivity(lead.id, lead.status, lead.status, `${fu.type.toUpperCase()} follow-up rescheduled to ${date} ${timeStr}`)
                                    showToast('Follow-up rescheduled')
                                  }}
                                  onCallNow={() => handleCallNow(fu)}
                                  onDelete={() => handleDeleteFollowUp(fu.id)}
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-2xl p-12 text-center ${cardClass}`}
            >
              <Bell
                className={`w-12 h-12 mx-auto mb-3 ${
                  isDark ? 'text-dark-600' : 'text-dark-300'
                }`}
              />
              <p
                className={`text-lg font-medium ${
                  isDark ? 'text-dark-400' : 'text-dark-500'
                }`}
              >
                No follow-ups match your filters
              </p>
              <p className={isDark ? 'text-dark-500' : 'text-dark-400'}>
                Try adjusting the filters or schedule a new follow-up
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl overflow-hidden ${cardClass}`}
        >
          <div
            className={`px-5 py-4 border-b ${
              isDark ? 'border-dark-700/60' : 'border-dark-200/60'
            }`}
          >
            <h2
              className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-dark-900'
              }`}
            >
              This Week
            </h2>
            <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
              {weekDates[0].date} to {weekDates[6].date}
            </p>
          </div>

          <div className={`grid grid-cols-7 divide-x divide-y ${isDark ? 'divide-dark-700/60' : 'divide-dark-200/60'}`}>
            {/* Day Headers */}
            {weekDates.map((day) => (
              <div
                key={day.label}
                className={`p-3 text-center border-b ${
                  isDark ? 'border-dark-700/60' : 'border-dark-200/60'
                }`}
              >
                <p
                  className={`text-xs font-medium uppercase ${
                    isDark ? 'text-dark-400' : 'text-dark-500'
                  }`}
                >
                  {day.label}
                </p>
                <p
                  className={`text-lg font-bold mt-0.5 ${
                    day.isToday
                      ? 'text-primary-500'
                      : isDark
                      ? 'text-white'
                      : 'text-dark-900'
                  }`}
                >
                  {day.dayNum}
                </p>
                {day.isToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mx-auto mt-1" />
                )}
              </div>
            ))}

            {/* Day Cells with Follow-ups */}
            {weekDates.map((day) => {
              const dayFollowUps = filtered.filter((f) => f.date === day.date)
              return (
                <div
                  key={`cell-${day.date}`}
                  className={`p-2 min-h-[120px] ${
                    day.isToday
                      ? isDark
                        ? 'bg-primary-500/5'
                        : 'bg-primary-50/50'
                      : ''
                  }`}
                >
                  <div className="space-y-1.5">
                    {dayFollowUps.map((fu) => {
                      return (
                        <motion.div
                          key={fu.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => goToLead(fu)}
                          className={`px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-200 hover:scale-105 ${
                            fu.type === 'call'
                              ? 'bg-sky-500/15 text-sky-500'
                              : fu.type === 'email'
                              ? 'bg-primary-500/15 text-primary-500'
                              : 'bg-emerald-500/15 text-emerald-500'
                          }`}
                        >
                          <p className="font-medium truncate">{fu.lead}</p>
                          <p className="opacity-75">{fu.time}</p>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Toast Notification */}
      <div className="fixed top-6 right-6 z-[100]">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              onAnimationComplete={() => setTimeout(() => setNotification(null), 3000)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
                notification.type === 'success'
                  ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-medium">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lost Reason Modal */}
      <AnimatePresence>
        {showLostModal && (
          <FollowUpLostReasonModal
            key={`lost-${showLostModal.id}`}
            fu={showLostModal}
            isDark={isDark}
            onClose={() => setShowLostModal(null)}
            onSubmit={(fu, reason) => { handleMarkLost(fu, reason); setShowLostModal(null) }}
          />
        )}
      </AnimatePresence>

      {/* Transfer to Student Confirm Modal */}
      <AnimatePresence>
        {showTransferConfirm && (
          <motion.div
            variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTransferConfirm(null)} />
            <motion.div
              variants={modalCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-primary-500/15' : 'bg-primary-50'}`}>
                  <GraduationCap className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Transfer to Student</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  Enroll <strong>{showTransferConfirm.lead}</strong> as a student? This will mark the follow-up as completed and add them to the students list.
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button onClick={() => setShowTransferConfirm(null)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                    Cancel
                  </button>
                  <button onClick={() => handleTransferToStudent(showTransferConfirm)}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">
                    Enroll Student
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Follow-up Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              variants={modalCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl overflow-hidden ${
                isDark
                  ? 'bg-dark-900 border border-dark-700/60'
                  : 'bg-white border border-dark-200/60 shadow-xl'
              }`}
            >
              {/* Modal Header */}
              <div
                className={`flex items-center justify-between px-6 py-4 border-b ${
                  isDark ? 'border-dark-700/60' : 'border-dark-200/60'
                }`}
              >
                <h2
                  className={`text-lg font-semibold ${
                    isDark ? 'text-white' : 'text-dark-900'
                  }`}
                >
                  Schedule Follow-up
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark
                      ? 'hover:bg-dark-800 text-dark-400'
                      : 'hover:bg-dark-100 text-dark-500'
                  }`}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleScheduleSubmit} className="p-6 space-y-5">
                {/* Lead */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1.5 ${
                      isDark ? 'text-dark-300' : 'text-dark-700'
                    }`}
                  >
                    Lead
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={formData.lead}
                      onChange={(e) =>
                        setFormData({ ...formData, lead: e.target.value })
                      }
                      className={`w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm border transition-all duration-200 ${
                        isDark
                          ? 'bg-dark-800 border-dark-700 text-dark-200'
                          : 'bg-white border-dark-200 text-dark-800'
                      }`}
                    >
                      <option value="">Select a lead</option>
                      {leadNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        isDark ? 'text-dark-500' : 'text-dark-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Type (Radio) */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-dark-300' : 'text-dark-700'
                    }`}
                  >
                    Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(typeConfig).map(([key, config]) => {
                      const Icon = config.icon
                      const isActive = formData.type === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, type: key })
                          }
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? key === 'call'
                                ? 'border-sky-500 bg-sky-500/10 text-sky-500'
                                : key === 'email'
                                ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                                : 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                              : isDark
                              ? 'border-dark-700 text-dark-400 hover:border-dark-600'
                              : 'border-dark-200 text-dark-500 hover:border-dark-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {config.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${
                        isDark ? 'text-dark-300' : 'text-dark-700'
                      }`}
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border transition-all duration-200 ${
                        isDark
                          ? 'bg-dark-800 border-dark-700 text-dark-200'
                          : 'bg-white border-dark-200 text-dark-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1.5 ${
                        isDark ? 'text-dark-300' : 'text-dark-700'
                      }`}
                    >
                      Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) =>
                        setFormData({ ...formData, time: e.target.value })
                      }
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border transition-all duration-200 ${
                        isDark
                          ? 'bg-dark-800 border-dark-700 text-dark-200'
                          : 'bg-white border-dark-200 text-dark-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-dark-300' : 'text-dark-700'
                    }`}
                  >
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {Object.entries(priorityConfig).map(([key, config]) => {
                      const isActive = formData.priority === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, priority: key })
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            isActive
                              ? config.color === 'rose'
                                ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                                : config.color === 'accent'
                                ? 'border-accent-500 bg-accent-500/10 text-accent-500'
                                : 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                              : isDark
                              ? 'border-dark-700 text-dark-400 hover:border-dark-600'
                              : 'border-dark-200 text-dark-500 hover:border-dark-300'
                          }`}
                        >
                          {config.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1.5 ${
                      isDark ? 'text-dark-300' : 'text-dark-700'
                    }`}
                  >
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Add notes about this follow-up..."
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border transition-all duration-200 resize-none ${
                      isDark
                        ? 'bg-dark-800 border-dark-700 text-dark-200 placeholder:text-dark-600'
                        : 'bg-white border-dark-200 text-dark-800 placeholder:text-dark-400'
                    }`}
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                      isDark
                        ? 'border-dark-700 text-dark-300 hover:bg-dark-800'
                        : 'border-dark-200 text-dark-600 hover:bg-dark-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200"
                  >
                    Schedule Follow-up
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
