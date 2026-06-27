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
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { followUps } from '../data/mockData'

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

const today = '2026-06-26'

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
  const [localFollowUps, setLocalFollowUps] = useState(followUps)

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
    setLocalFollowUps((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'completed' } : f))
    )
  }

  const handleScheduleSubmit = (e) => {
    e.preventDefault()
    const newFollowUp = {
      id: Date.now(),
      lead: formData.lead,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      notes: formData.notes,
      status: 'pending',
      priority: formData.priority,
    }
    setLocalFollowUps((prev) => [...prev, newFollowUp])
    setFormData({ lead: '', type: 'call', date: '', time: '', priority: 'medium', notes: '' })
    setShowModal(false)
  }

  const leadNames = [...new Set(localFollowUps.map((f) => f.lead))]

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
                            )}
                            <button
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
                              title="Call Now"
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                isDark
                                  ? 'hover:bg-sky-500/10 text-dark-400 hover:text-sky-500'
                                  : 'hover:bg-sky-50 text-dark-400 hover:text-sky-600'
                              }`}
                            >
                              <Phone className="w-4 h-4" />
                            </button>
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

      {/* Schedule Follow-up Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark
                      ? 'hover:bg-dark-800 text-dark-400'
                      : 'hover:bg-dark-100 text-dark-500'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
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
