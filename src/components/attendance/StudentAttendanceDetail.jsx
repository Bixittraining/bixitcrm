import { useMemo } from 'react'
import {
  ArrowLeft, Mail, Phone, GraduationCap, Layers, User, Users, CalendarDays,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { STATUS, STATUS_KEYS, StatusChip } from './attendanceStatus'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
}
function pctFor(present, marked) {
  return marked > 0 ? Math.round((present / marked) * 100) : null
}
function emptyCounts() {
  return { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 }
}

// Small month-grid calendar — colored dot per day this student has an
// attendance record for. Built from the same STATUS colors as the rest of
// the module rather than a new charting/calendar dependency.
function MiniCalendar({ year, month, recordsByDate, isDark }) {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay() // 0 = Sunday
  const cells = [...Array(startWeekday).fill(null), ...Array(daysInMonth).keys()].map((d) => (d === null ? null : d + 1))

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className={`text-center text-[10px] font-semibold ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const record = recordsByDate.get(dateStr)
          const style = record ? STATUS[record.status] : null
          return (
            <div key={i} title={record ? `${dateStr} — ${STATUS[record.status].label}` : dateStr}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${
                style ? `${style.btn.split(' ')[0]} text-white` : isDark ? 'bg-dark-800/60 text-dark-500' : 'bg-dark-50 text-dark-400'
              }`}>
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Reachable by clicking a student's name from the flat Student Attendance
// table or from a batch's attendance view — same underlying `attendance`
// records, just scoped to one student and read-only (no marking here).
export default function StudentAttendanceDetail({ studentId, onBack, isDark }) {
  const { students, batches, teamMembers, attendance } = useData()

  const student = students.find((s) => s.id === studentId)
  const batch = batches.find((b) => b.id === student?.batch_id)
  const trainer = teamMembers.find((m) => m.id === batch?.instructor_id)?.name

  const records = useMemo(
    () => attendance.filter((a) => a.student_id === studentId).sort((a, b) => b.date.localeCompare(a.date)),
    [attendance, studentId]
  )

  const recordsByDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records])

  const overall = useMemo(() => {
    const counts = emptyCounts()
    records.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })
    const marked = records.length
    return { total: marked, ...counts, pct: pctFor(counts.present, marked) }
  }, [records])

  const monthly = useMemo(() => {
    const byMonth = new Map()
    records.forEach((r) => {
      const key = r.date.slice(0, 7) // YYYY-MM
      if (!byMonth.has(key)) byMonth.set(key, emptyCounts())
      const c = byMonth.get(key)
      c[r.status] = (c[r.status] || 0) + 1
    })
    return [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, counts]) => {
        const marked = counts.present + counts.absent + counts.late + counts.half_day + counts.leave
        const [y, m] = key.split('-').map(Number)
        return { key, year: y, month: m - 1, label: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), counts, pct: pctFor(counts.present, marked) }
      })
  }, [records])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  if (!student) {
    return (
      <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
        <Users className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Student not found</p>
        <button onClick={onBack} className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-400">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
        <ArrowLeft className="w-3.5 h-3.5" />Back
      </button>

      {/* Student profile */}
      <div className={`rounded-2xl p-5 ${cardClass}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-primary-500 to-violet-500 shrink-0">
            {student.avatar || student.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{student.name}</h2>
            <div className={`flex items-center gap-4 mt-1.5 text-xs flex-wrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
              <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{student.phone || '—'}</span>
              <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{student.email || '—'}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-dashed border-dark-700/40">
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Course</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><GraduationCap className="w-3.5 h-3.5" />{student.course || '—'}</p>
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Batch</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><Layers className="w-3.5 h-3.5" />{batch?.name || 'Unassigned'}</p>
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Trainer</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><User className="w-3.5 h-3.5" />{trainer || 'Unassigned'}</p>
          </div>
        </div>
      </div>

      {/* Attendance summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total Classes', value: overall.total, cls: isDark ? 'text-white' : 'text-dark-900' },
          { label: 'Present', value: overall.present, cls: 'text-emerald-500' },
          { label: 'Absent', value: overall.absent, cls: 'text-rose-500' },
          { label: 'Late', value: overall.late, cls: 'text-amber-500' },
          { label: 'Leave', value: overall.leave + overall.half_day, cls: 'text-violet-500' },
          { label: 'Attendance %', value: overall.pct != null ? `${overall.pct}%` : '—', cls: isDark ? 'text-white' : 'text-dark-900' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
            <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {records.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          No attendance recorded for this student yet.
        </div>
      ) : (
        <>
          {/* This month's calendar */}
          <div className={`rounded-2xl p-5 ${cardClass}`}>
            <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
              <CalendarDays className="w-4 h-4" />{monthly[0]?.label} Calendar
            </h3>
            <MiniCalendar year={monthly[0].year} month={monthly[0].month} recordsByDate={recordsByDate} isDark={isDark} />
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {STATUS_KEYS.map((k) => (
                <span key={k} className={`inline-flex items-center gap-1.5 text-[11px] ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  <span className={`w-2.5 h-2.5 rounded-sm ${STATUS[k].btn.split(' ')[0]}`} />{STATUS[k].label}
                </span>
              ))}
            </div>
          </div>

          {/* Monthly summary */}
          <div className={`rounded-2xl p-5 ${cardClass}`}>
            <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Monthly Attendance Summary</h3>
            <div className="space-y-3">
              {monthly.map((m) => (
                <div key={m.key} className={`rounded-xl p-4 ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{m.label}</p>
                    <span className={`text-sm font-bold ${m.pct != null && m.pct >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {m.pct != null ? `${m.pct}%` : '—'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-4 text-xs flex-wrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                    <span>Present: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.present}</b></span>
                    <span>Absent: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.absent}</b></span>
                    <span>Late: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.late}</b></span>
                    <span>Leave: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.leave + m.counts.half_day}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent attendance */}
          <div className={`rounded-2xl overflow-hidden ${cardClass}`}>
            <h3 className={`text-sm font-semibold p-5 pb-0 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Recent Attendance</h3>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                    {['Date', 'Batch', 'Status', 'Check-in Time', 'Marked By'].map((h) => (
                      <th key={h} className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                  {records.slice(0, 20).map((r) => (
                    <tr key={r.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                      <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatDate(r.date)}</td>
                      <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{batches.find((b) => b.id === r.batch_id)?.name || '—'}</td>
                      <td className="px-5 py-3"><StatusChip status={r.status} isDark={isDark} /></td>
                      <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{formatTime(r.marked_at)}</td>
                      <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{r.marked_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length > 20 && (
              <p className={`text-xs text-center py-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Showing the 20 most recent of {records.length} records</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
