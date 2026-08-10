import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, Plus, X, Users, Calendar, Clock, Pencil, Trash2, User,
  CheckCircle2, AlertCircle, PlayCircle, Hourglass, GraduationCap, Eye,
  LayoutGrid, CalendarDays,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import { formatClassDays, formatClassTime } from '../lib/schedule'
import BatchFormModal from '../components/batches/BatchFormModal'

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

export default function Batches() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const { batches, addBatch, updateBatch, deleteBatch, students, teamMembers } = useData()

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [notification, setNotification] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')

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

      <div className={`flex items-center rounded-xl p-1 w-fit ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
        <button onClick={() => setViewMode('grid')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
          <LayoutGrid className="w-4 h-4" />Batches
        </button>
        <button onClick={() => setViewMode('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'schedule' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
          <CalendarDays className="w-4 h-4" />Class Schedule
        </button>
      </div>

      {viewMode === 'schedule' ? (
        filteredBatches.length === 0 ? (
          <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
            <CalendarDays className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
            <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No batches to show a schedule for.</p>
          </div>
        ) : (
          <div className={`rounded-2xl overflow-hidden ${cardClass}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                    {['Batch', 'Course', 'Trainer', 'Class Days', 'Class Time', 'Start Date', 'End Date', 'Mode'].map((h) => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                  {filteredBatches.map((b) => (
                    <tr key={b.id} onClick={() => navigate(`/batches/${b.id}`)}
                      className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}`}>
                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-dark-900'}`}>{b.name}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{b.course}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{instructorName(b) || 'Unassigned'}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{formatClassDays(b)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{formatClassTime(b)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{b.start_date || '—'}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{b.end_date || '—'}</td>
                      <td className={`px-4 py-3 whitespace-nowrap capitalize ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{b.class_mode || 'Not set'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredBatches.length === 0 ? (
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
