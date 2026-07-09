import { useState } from 'react'
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
  FileText,
  GraduationCap,
  Trash2,
  CheckCircle2,
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

export default function FollowUps() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [viewMode, setViewMode] = useState('list')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const { followUps: localFollowUps, addFollowUp, updateFollowUp, leads, enrollLead, setFollowUps } = useData()
  const [notification, setNotification] = useState(null)
  const [showTransferConfirm, setShowTransferConfirm] = useState(null)
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' })

  const showToast = (message, type = 'success') => setNotification({ message, type })

  const [formData, setFormData] = useState({
    lead: '',
    type: 'call',
    date: '',
    time: '',
    priority: 'medium',
    notes: '',
  })

  const filtered = localFollowUps.filter((fu) => {
    if (typeFilter !== 'all' && fu.type !== typeFilter) return false
    if (priorityFilter !== 'all' && fu.priority !== priorityFilter) return false
    if (statusFilter !== 'all' && fu.status !== statusFilter) return false
    return true
  })

  const todayCount = localFollowUps.filter((f) => f.date === today).length
  const pendingCount = localFollowUps.filter((f) => f.status === 'pending').length
  const completedCount = localFollowUps.filter((f) => f.status === 'completed').length
  const overdueCount = localFollowUps.filter(
    (f) => f.date < today && f.status === 'pending'
  ).length

  const weekDates = getWeekDates()

  const cardClass = isDark
    ? 'bg-dark-900 border border-dark-700/60'
    : 'bg-white border border-dark-200/60 shadow-sm'

  const handleMarkComplete = (id) => {
    updateFollowUp(id, { status: 'completed' })
  }

  const handleScheduleSubmit = (e) => {
    e.preventDefault()
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

  const handleReschedule = (id) => {
    if (!rescheduleData.date || !rescheduleData.time) return
    const timeStr = new Date(`2000-01-01T${rescheduleData.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    updateFollowUp(id, { date: rescheduleData.date, time: timeStr })
    setRescheduleId(null)
    setRescheduleData({ date: '', time: '' })
    showToast('Follow-up rescheduled')
  }

  const handleCallNow = (fu) => {
    const lead = leads.find((l) => l.name === fu.lead)
    if (lead) {
      window.open(`tel:${lead.phone}`)
    }
    showToast(`Calling ${fu.lead}...`)
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

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            label: "Today's Follow-ups",
            value: todayCount,
            icon: Calendar,
            colorClass: 'text-sky-500 bg-sky-500/10',
          },
          {
            label: 'Pending',
            value: pendingCount,
            icon: Clock,
            colorClass: 'text-accent-500 bg-accent-500/10',
          },
          {
            label: 'Completed',
            value: completedCount,
            icon: CheckCircle,
            colorClass: 'text-emerald-500 bg-emerald-500/10',
          },
          {
            label: 'Overdue',
            value: overdueCount,
            icon: AlertCircle,
            colorClass: 'text-rose-500 bg-rose-500/10',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className={`rounded-2xl p-4 ${cardClass}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.colorClass}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p
                  className={`text-sm ${
                    isDark ? 'text-dark-400' : 'text-dark-500'
                  }`}
                >
                  {stat.label}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    stat.label === 'Overdue'
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
          </motion.div>
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

              return (
                <motion.div
                  key={fu.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl overflow-hidden ${cardClass}`}
                >
                  <div className="flex">
                    {/* Left Color Border */}
                    <div
                      className={`w-1.5 shrink-0 ${
                        fu.type === 'call'
                          ? 'bg-sky-500'
                          : fu.type === 'email'
                          ? 'bg-primary-500'
                          : 'bg-emerald-500'
                      }`}
                    />

                    <div className="flex-1 p-4">
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
                                className={`font-semibold ${
                                  isDark ? 'text-white' : 'text-dark-900'
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

                            <p
                              className={`mt-1.5 text-sm truncate ${
                                isDark ? 'text-dark-400' : 'text-dark-500'
                              }`}
                            >
                              {fu.notes}
                            </p>
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

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 ml-2">
                            {fu.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleMarkComplete(fu.id)}
                                  title="Mark Complete"
                                  className={`p-2 rounded-lg transition-all duration-200 ${
                                    isDark
                                      ? 'hover:bg-emerald-500/10 text-dark-400 hover:text-emerald-500'
                                      : 'hover:bg-emerald-50 text-dark-400 hover:text-emerald-600'
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setShowTransferConfirm(fu)}
                                  title="Transfer to Student"
                                  className={`p-2 rounded-lg transition-all duration-200 ${
                                    isDark
                                      ? 'hover:bg-primary-500/10 text-dark-400 hover:text-primary-500'
                                      : 'hover:bg-primary-50 text-dark-400 hover:text-primary-600'
                                  }`}
                                >
                                  <GraduationCap className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setRescheduleId(rescheduleId === fu.id ? null : fu.id)
                                setRescheduleData({ date: fu.date, time: '' })
                              }}
                              title="Reschedule"
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                isDark
                                  ? 'hover:bg-accent-500/10 text-dark-400 hover:text-accent-500'
                                  : 'hover:bg-accent-50 text-dark-400 hover:text-accent-600'
                              }`}
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCallNow(fu)}
                              title="Call Now"
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                isDark
                                  ? 'hover:bg-sky-500/10 text-dark-400 hover:text-sky-500'
                                  : 'hover:bg-sky-50 text-dark-400 hover:text-sky-600'
                              }`}
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFollowUp(fu.id)}
                              title="Delete"
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                isDark
                                  ? 'hover:bg-rose-500/10 text-dark-400 hover:text-rose-500'
                                  : 'hover:bg-rose-50 text-dark-400 hover:text-rose-600'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inline Reschedule Form */}
                    {rescheduleId === fu.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mt-3 pt-3 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}
                      >
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>New Date</label>
                            <input type="date" value={rescheduleData.date} onChange={(e) => setRescheduleData(p => ({ ...p, date: e.target.value }))}
                              className={`w-full px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                          </div>
                          <div className="flex-1">
                            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>New Time</label>
                            <input type="time" value={rescheduleData.time} onChange={(e) => setRescheduleData(p => ({ ...p, time: e.target.value }))}
                              className={`w-full px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                          </div>
                          <button onClick={() => handleReschedule(fu.id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors">
                            Save
                          </button>
                          <button onClick={() => setRescheduleId(null)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}>
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
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
                      const typeInfo = typeConfig[fu.type]
                      return (
                        <motion.div
                          key={fu.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
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
