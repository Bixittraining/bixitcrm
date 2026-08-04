import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Users, ClipboardCheck, ChevronRight, ArrowLeft } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import AttendanceRegister from '../components/attendance/AttendanceRegister'

const todayStr = new Date().toISOString().slice(0, 10)

function pctFor(records) {
  return records.length ? Math.round((records.filter((r) => r.status === 'present').length / records.length) * 100) : null
}

function BatchPicker({ batches, students, attendance, isDark, onSelect }) {
  return (
    <div className="space-y-2">
      {batches.length === 0 ? (
        <div className={`rounded-xl p-10 text-center text-sm ${isDark ? 'bg-dark-800/50 text-dark-500' : 'bg-dark-50 text-dark-400'}`}>No batches yet.</div>
      ) : batches.map((b) => {
        const roster = students.filter((s) => s.batch_id === b.id)
        const batchAttendance = attendance.filter((a) => a.batch_id === b.id)
        const pct = pctFor(batchAttendance)
        return (
          <button key={b.id} onClick={() => onSelect(b)}
            className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl text-left transition-colors ${isDark ? 'bg-dark-800/50 hover:bg-dark-800' : 'bg-dark-50 hover:bg-dark-100'}`}>
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{b.name}</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{b.course} &middot; {roster.length} students</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-sm font-semibold ${pct == null ? (isDark ? 'text-dark-500' : 'text-dark-400') : pct >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {pct != null ? `${pct}%` : 'No records'}
              </span>
              <ChevronRight className={`w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function StudentsTab({ isDark }) {
  const { batches, students, attendance, markAttendance } = useData()
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [attDate, setAttDate] = useState(todayStr)

  const batch = batches.find((b) => b.id === selectedBatchId)
  const roster = useMemo(() => (batch ? students.filter((s) => s.batch_id === batch.id) : []), [students, batch])

  const minAttDate = batch?.start_date || null
  const maxAttDate = batch?.end_date && batch.end_date < todayStr ? batch.end_date : todayStr
  const batchStarted = !minAttDate || todayStr >= minAttDate

  const dayAttendance = useMemo(
    () => attendance.filter((a) => a.batch_id === batch?.id && a.date === attDate).map((a) => ({ ...a, personId: a.student_id })),
    [attendance, batch, attDate]
  )

  if (!batch) {
    return <BatchPicker batches={batches} students={students} attendance={attendance} isDark={isDark} onSelect={(b) => { setSelectedBatchId(b.id); setAttDate(todayStr) }} />
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <button onClick={() => setSelectedBatchId(null)}
          className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
          <ArrowLeft className="w-3.5 h-3.5" />{batch.name}
        </button>
        <input
          type="date"
          value={attDate}
          min={minAttDate || undefined}
          max={maxAttDate}
          onChange={(e) => setAttDate(e.target.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`}
        />
      </div>
      {!batchStarted ? (
        <p className={`text-sm text-center py-10 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
          Attendance opens once this batch starts on {new Date(batch.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      ) : (
        <AttendanceRegister
          roster={roster}
          records={dayAttendance}
          date={attDate}
          onMark={(studentId, status) => markAttendance(batch.id, attDate, [{ studentId, status }])}
          isDark={isDark}
          statusKeys={['present', 'absent']}
          contextKey={batch.id}
        />
      )}
    </div>
  )
}

function StaffTab({ isDark }) {
  const { teamMembers, staffAttendance, markStaffAttendance } = useData()
  const [attDate, setAttDate] = useState(todayStr)

  const dayAttendance = useMemo(
    () => staffAttendance.filter((a) => a.date === attDate).map((a) => ({ ...a, personId: a.staff_id })),
    [staffAttendance, attDate]
  )

  const roster = teamMembers.map((m) => ({ id: m.id, name: m.name }))

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Team Attendance</p>
        <input
          type="date"
          value={attDate}
          max={todayStr}
          onChange={(e) => setAttDate(e.target.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`}
        />
      </div>
      <AttendanceRegister
        roster={roster}
        records={dayAttendance}
        date={attDate}
        onMark={(staffId, status) => markStaffAttendance(attDate, [{ staffId, status }])}
        isDark={isDark}
        statusKeys={['present', 'absent', 'leave']}
        contextKey="staff"
      />
    </div>
  )
}

export default function Attendance() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { attendance, staffAttendance, batches, teamMembers } = useData()
  const [tab, setTab] = useState('students')

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const studentPctOverall = pctFor(attendance)
  const staffPctOverall = pctFor(staffAttendance)
  const studentDaysRecorded = new Set(attendance.map((a) => a.date)).size
  const staffDaysRecorded = new Set(staffAttendance.map((a) => a.date)).size

  const stats = [
    { label: 'Student Attendance', value: studentPctOverall != null ? `${studentPctOverall}%` : '—', sub: studentDaysRecorded ? `${studentDaysRecorded} day${studentDaysRecorded === 1 ? '' : 's'} recorded` : 'No records yet', icon: GraduationCap, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
    { label: 'Staff Attendance', value: staffPctOverall != null ? `${staffPctOverall}%` : '—', sub: staffDaysRecorded ? `${staffDaysRecorded} day${staffDaysRecorded === 1 ? '' : 's'} recorded` : 'No records yet', icon: Users, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
    { label: 'Batches', value: batches.length, sub: 'Available to mark', icon: ClipboardCheck, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
    { label: 'Team Members', value: teamMembers.length, sub: 'Available to mark', icon: Users, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-dark-900'}`}>Attendance</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Mark and track attendance for students and staff</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{s.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{s.value}</p>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{s.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon size={18} className={s.color} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className={`flex items-center rounded-xl p-1 w-fit ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
        <button onClick={() => setTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'students' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
          <GraduationCap className="w-4 h-4" />Students
        </button>
        <button onClick={() => setTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'staff' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
          <Users className="w-4 h-4" />Staff
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardClass}`}>
        {tab === 'students' ? <StudentsTab isDark={isDark} /> : <StaffTab isDark={isDark} />}
      </motion.div>
    </div>
  )
}
