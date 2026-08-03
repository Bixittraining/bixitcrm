import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, Plus, X, Users, Calendar, Clock, Pencil, Trash2, User,
  CheckCircle2, AlertCircle, PlayCircle, Hourglass, GraduationCap, Eye,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'

const courseOptions = [
  'Full Stack Development', 'Data Science & AI', 'UI/UX Design', 'Digital Marketing',
  'Cloud Computing', 'Cybersecurity', 'Mobile App Development', 'DevOps Engineering', 'Python Programming',
]

const weekdays = [
  { key: 'Mon', label: 'Mon' }, { key: 'Tue', label: 'Tue' }, { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' }, { key: 'Fri', label: 'Fri' }, { key: 'Sat', label: 'Sat' }, { key: 'Sun', label: 'Sun' },
]

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'sky', icon: Hourglass },
  ongoing: { label: 'Ongoing', color: 'emerald', icon: PlayCircle },
  completed: { label: 'Completed', color: 'violet', icon: CheckCircle2 },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function formatTime12h(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function formatSchedule(batch) {
  const days = batch.schedule_days?.length ? batch.schedule_days.join(', ') : null
  const time = batch.start_time && batch.end_time ? `${formatTime12h(batch.start_time)} - ${formatTime12h(batch.end_time)}` : null
  if (!days && !time) return null
  return [days, time].filter(Boolean).join(' · ')
}

function BatchFormModal({ batch, isDark, teamMembers, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: batch?.name || '',
    course: batch?.course || '',
    instructor_id: batch?.instructor_id || '',
    start_date: batch?.start_date || '',
    end_date: batch?.end_date || '',
    schedule_days: batch?.schedule_days || [],
    start_time: batch?.start_time || '',
    end_time: batch?.end_time || '',
    capacity: batch?.capacity ?? 30,
    status: batch?.status || 'upcoming',
  })
  const inputClass = isDark
    ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
    : 'bg-white border-dark-200 text-dark-900 placeholder-dark-400 focus:border-primary-500 focus:ring-primary-500/20'
  const [formError, setFormError] = useState('')
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const toggleDay = (day) => setForm((prev) => ({
    ...prev,
    schedule_days: prev.schedule_days.includes(day) ? prev.schedule_days.filter((d) => d !== day) : [...prev.schedule_days, day],
  }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.schedule_days.length === 0) { setFormError('Select at least one class day'); return }
    if (!form.start_time || !form.end_time) { setFormError('Set both a class start time and end time'); return }
    if (form.end_date && form.start_date && form.end_date < form.start_date) { setFormError('End date cannot be before start date'); return }
    setFormError('')
    onSubmit(form)
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{batch ? 'Edit Batch' : 'Create Batch'}</h2>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Batch Name</label>
            <input type="text" required value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Batch 2026-A"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Course</label>
              <select required value={form.course} onChange={(e) => handleChange('course', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select course</option>
                {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Instructor</label>
              <select required value={form.instructor_id} onChange={(e) => handleChange('instructor_id', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select instructor</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Start Date</label>
              <input type="date" required value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>End Date</label>
              <input type="date" required min={form.start_date || undefined} value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Capacity</label>
              <input type="number" min="1" required value={form.capacity} onChange={(e) => handleChange('capacity', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Class Days</label>
            <div className="flex flex-wrap gap-1.5">
              {weekdays.map((d) => (
                <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                  className={`w-11 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    form.schedule_days.includes(d.key)
                      ? isDark ? 'border-primary-500 bg-primary-500/15 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                      : isDark ? 'border-dark-700 text-dark-400 hover:border-dark-600' : 'border-dark-200 text-dark-500 hover:border-dark-300'
                  }`}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Class Start Time</label>
              <input type="time" value={form.start_time} onChange={(e) => handleChange('start_time', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Class End Time</label>
              <input type="time" value={form.end_time} onChange={(e) => handleChange('end_time', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Status</label>
            <div className="flex gap-2">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => handleChange('status', key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form.status === key
                      ? isDark ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                      : isDark ? 'border-dark-700 text-dark-400' : 'border-dark-200 text-dark-500'
                  }`}>{cfg.label}</button>
              ))}
            </div>
          </div>
          {formError && <p className="text-xs font-medium text-rose-500">{formError}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            >{batch ? 'Save Changes' : 'Create Batch'}</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}


export default function Batches() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const location = useLocation()
  const { batches, addBatch, updateBatch, deleteBatch, students, teamMembers } = useData()

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Deep-link from the batch detail page's "Edit Batch" button
  useEffect(() => {
    const editBatchId = location.state?.editBatchId
    if (editBatchId) {
      const target = batches.find((b) => b.id === editBatchId)
      if (target) { setEditingBatch(target); setShowFormModal(true) }
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, batches, navigate, location.pathname])
  const [notification, setNotification] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const showToast = (message, type = 'success') => setNotification({ message, type })

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const enrolledCountFor = (batchId) => students.filter((s) => s.batch_id === batchId).length
  const instructorName = (batch) => teamMembers.find((m) => m.id === batch.instructor_id)?.name

  const stats = useMemo(() => ({
    total: batches.length,
    ongoing: batches.filter((b) => b.status === 'ongoing').length,
    upcoming: batches.filter((b) => b.status === 'upcoming').length,
    completed: batches.filter((b) => b.status === 'completed').length,
  }), [batches])

  const filteredBatches = statusFilter === 'all' ? batches : batches.filter((b) => b.status === statusFilter)

  const handleSubmit = (form) => {
    const payload = {
      ...form,
      capacity: Number(form.capacity) || 30,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      instructor_id: form.instructor_id || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    }
    if (editingBatch) {
      updateBatch(editingBatch.id, payload)
      showToast(`${form.name} updated`)
    } else {
      addBatch(payload)
      showToast(`${form.name} created`)
    }
    setShowFormModal(false)
    setEditingBatch(null)
  }

  const handleDelete = (batch) => {
    const enrolled = enrolledCountFor(batch.id)
    if (enrolled > 0) {
      showToast(`Can't delete — ${enrolled} student${enrolled === 1 ? '' : 's'} still assigned to this batch`, 'error')
      setShowDeleteConfirm(null)
      return
    }
    deleteBatch(batch.id)
    setShowDeleteConfirm(null)
    showToast(`${batch.name} deleted`)
  }

  const buckets = [
    { key: 'all', label: 'Total Batches', value: stats.total, icon: Layers, color: 'primary' },
    { key: 'ongoing', label: 'Ongoing', value: stats.ongoing, icon: PlayCircle, color: 'emerald' },
    { key: 'upcoming', label: 'Upcoming', value: stats.upcoming, icon: Hourglass, color: 'sky' },
    { key: 'completed', label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'violet' },
  ]
  const bucketBg = {
    primary: isDark ? 'bg-primary-500/10' : 'bg-primary-50', emerald: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
    sky: isDark ? 'bg-sky-500/10' : 'bg-sky-50', violet: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
  }
  const bucketColor = { primary: 'text-primary-500', emerald: 'text-emerald-500', sky: 'text-sky-500', violet: 'text-violet-500' }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Batches</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Create and manage class batches per course</p>
        </div>
        <button onClick={() => { setEditingBatch(null); setShowFormModal(true) }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all">
          <Plus size={16} className="inline mr-2 -mt-0.5" />Create Batch
        </button>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {buckets.map((b) => (
          <motion.button key={b.key} type="button" variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => setStatusFilter(b.key)}
            className={`rounded-2xl p-5 text-left transition-all ${cardClass} ${statusFilter === b.key ? 'ring-2 ring-primary-500 border-primary-500' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{b.label}</p>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>{b.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${bucketBg[b.color]}`}><b.icon size={22} className={bucketColor[b.color]} /></div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {filteredBatches.length === 0 ? (
        <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
          <Layers className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            {batches.length === 0 ? 'No batches yet' : 'No batches in this status'}
          </p>
          {batches.length === 0 && (
            <button onClick={() => { setEditingBatch(null); setShowFormModal(true) }}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
              <Plus className="w-3.5 h-3.5" />Create your first batch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBatches.map((batch) => {
            const enrolled = enrolledCountFor(batch.id)
            const pctFull = batch.capacity > 0 ? Math.min(100, Math.round((enrolled / batch.capacity) * 100)) : 0
            const cfg = statusConfig[batch.status] || statusConfig.upcoming
            const StatusIcon = cfg.icon
            const badgeCls = {
              sky: isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600',
              emerald: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
              violet: isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600',
            }[cfg.color]
            const instructor = instructorName(batch)
            const scheduleText = formatSchedule(batch)
            const dateRange = batch.start_date
              ? `${new Date(batch.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${batch.end_date ? ` – ${new Date(batch.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
              : 'Dates not set'
            return (
              <div key={batch.id} className={`rounded-2xl p-6 ${cardClass}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 cursor-pointer" onClick={() => navigate(`/batches/${batch.id}`)}>
                    <h3 className={`font-semibold truncate hover:underline ${isDark ? 'text-white' : 'text-dark-900'}`}>{batch.name}</h3>
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{batch.course}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${badgeCls}`}>
                    <StatusIcon className="w-3 h-3" />{cfg.label}
                  </span>
                </div>

                <div className={`space-y-2 mb-4 text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    {instructor || 'No instructor assigned'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {dateRange}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {scheduleText || 'Schedule not set'}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      <Users className="w-3.5 h-3.5" />Enrolled
                    </span>
                    <span className={`text-xs font-semibold ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{enrolled} / {batch.capacity}</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                    <motion.div className={`h-full rounded-full ${pctFull >= 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-primary-500 to-violet-500'}`}
                      initial={{ width: 0 }} animate={{ width: `${pctFull}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                  </div>
                </div>

                <div className={`flex items-center gap-2 pt-4 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                  <button onClick={() => navigate(`/batches/${batch.id}`)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white' : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'}`}>
                    <Eye size={14} />View
                  </button>
                  <button onClick={() => { setEditingBatch(batch); setShowFormModal(true) }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white' : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'}`}>
                    <Pencil size={14} />Edit
                  </button>
                  <button onClick={() => setShowDeleteConfirm(batch)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-dark-800 text-rose-400 hover:bg-rose-500/10' : 'bg-dark-50 text-rose-500 hover:bg-rose-50'}`}>
                    <Trash2 size={14} />Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {showFormModal && (
          <BatchFormModal
            key={editingBatch ? `edit-${editingBatch.id}` : 'create'}
            batch={editingBatch}
            isDark={isDark}
            teamMembers={teamMembers}
            onClose={() => { setShowFormModal(false); setEditingBatch(null) }}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(null)} />
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
              className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
                  <GraduationCap className="w-6 h-6 text-rose-500" />
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Delete Batch</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>? This cannot be undone.
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button onClick={() => setShowDeleteConfirm(null)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                    Cancel
                  </button>
                  <button onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 transition-all">
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-6 right-6 z-[100]">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 80, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 80, scale: 0.9 }}
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
    </div>
  )
}
