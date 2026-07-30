import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Layers, User, Calendar, Clock, Users, Mail, Phone,
  CheckCircle2, PlayCircle, Hourglass, GraduationCap, IndianRupee, Pencil,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'sky', icon: Hourglass },
  ongoing: { label: 'Ongoing', color: 'emerald', icon: PlayCircle },
  completed: { label: 'Completed', color: 'violet', icon: CheckCircle2 },
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

export default function BatchDetail() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { batches, students, teamMembers, updateStudent } = useData()

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const batch = batches.find((b) => String(b.id) === batchId)
  const roster = useMemo(() => students.filter((s) => s.batch_id === batch?.id), [students, batch])

  if (!batch) {
    return (
      <div className="space-y-6">
        <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/batches')}
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
          <ArrowLeft className="w-4 h-4" />Back to Batches
        </motion.button>
        <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
          <Layers className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Batch not found</p>
        </div>
      </div>
    )
  }

  const cfg = statusConfig[batch.status] || statusConfig.upcoming
  const StatusIcon = cfg.icon
  const badgeCls = {
    sky: isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600',
    emerald: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    violet: isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600',
  }[cfg.color]

  const instructor = teamMembers.find((m) => m.id === batch.instructor_id)?.name
  const scheduleText = formatSchedule(batch)
  const dateRange = batch.start_date
    ? `${new Date(batch.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${batch.end_date ? ` – ${new Date(batch.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
    : 'Dates not set'

  const feeCollected = roster.reduce((sum, s) => sum + (s.feePaid || 0), 0)
  const feeTotal = roster.reduce((sum, s) => sum + (s.feeTotal || 0), 0)
  const completedCount = roster.filter((s) => s.status === 'completed').length
  const certPendingCount = roster.filter((s) => s.status === 'completed' && !s.certificate_collected).length
  const pctFull = batch.capacity > 0 ? Math.min(100, Math.round((roster.length / batch.capacity) * 100)) : 0

  const stats = [
    { label: 'Enrolled', value: `${roster.length} / ${batch.capacity}`, icon: Users, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
    { label: 'Fee Collected', value: `₹${feeCollected.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50', sub: `of ₹${feeTotal.toLocaleString('en-IN')}` },
    { label: 'Course Completed', value: completedCount, icon: GraduationCap, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
    { label: 'Certificates Pending', value: certPendingCount, icon: Clock, color: 'text-accent-500', bg: isDark ? 'bg-accent-500/10' : 'bg-amber-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/batches')}
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
          <ArrowLeft className="w-4 h-4" />Back to Batches
        </motion.button>
        <button onClick={() => navigate('/batches', { state: { editBatchId: batch.id } })}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}>
          <Pencil className="w-3.5 h-3.5" />Edit Batch
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-6 ${cardClass}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{batch.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badgeCls}`}>
                <StatusIcon className="w-3 h-3" />{cfg.label}
              </span>
            </div>
            <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{batch.course}</p>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Batch Fill</span>
              <span className={`font-semibold ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{pctFull}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
              <div className={`h-full rounded-full ${pctFull >= 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-primary-500 to-violet-500'}`} style={{ width: `${pctFull}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-dashed border-dark-700/40">
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Staff / Instructor</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><User className="w-3.5 h-3.5" />{instructor || 'Unassigned'}</p>
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Duration</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><Calendar className="w-3.5 h-3.5" />{dateRange}</p>
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Schedule</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><Clock className="w-3.5 h-3.5" />{scheduleText || 'Not set'}</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{s.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{s.value}</p>
                {s.sub && <p className={`text-[11px] mt-0.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{s.sub}</p>}
              </div>
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon size={18} className={s.color} /></div>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardClass}`}>
        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
          <Users className="w-4 h-4" />Enrolled Students ({roster.length}/{batch.capacity})
        </h3>
        {roster.length === 0 ? (
          <div className={`rounded-xl p-10 text-center text-sm ${isDark ? 'bg-dark-800/50 text-dark-500' : 'bg-dark-50 text-dark-400'}`}>
            No students assigned to this batch yet.
          </div>
        ) : (
          <div className="space-y-2">
            {roster.map((s) => (
              <div key={s.id} className={`flex items-center justify-between gap-3 p-3.5 rounded-xl ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-primary-500 to-violet-500">
                    {s.avatar || s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{s.name}</p>
                    <div className={`flex items-center gap-3 text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{s.email}</span>
                      <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" />{s.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>₹{(s.feePaid || 0).toLocaleString('en-IN')} / ₹{(s.feeTotal || 0).toLocaleString('en-IN')}</p>
                  {s.status === 'completed' ? (
                    s.certificate_collected ? (
                      <button
                        onClick={() => updateStudent(s.id, { certificate_collected: false, certificate_collected_date: null })}
                        title="Click to undo"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 mt-0.5 hover:opacity-70 transition-opacity">
                        <CheckCircle2 className="w-3 h-3" />Certificate Collected
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStudent(s.id, { certificate_collected: true, certificate_collected_date: new Date().toISOString().slice(0, 10) })}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium mt-0.5 px-2 py-0.5 rounded-full transition-colors ${isDark ? 'bg-accent-500/15 text-accent-400 hover:bg-accent-500/25' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                      >
                        <GraduationCap className="w-3 h-3" />Course Completed — Mark Certificate Collected
                      </button>
                    )
                  ) : (
                    <p className={`text-[11px] ${s.status === 'active' ? 'text-emerald-500' : isDark ? 'text-dark-500' : 'text-dark-400'}`}>{s.status}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
