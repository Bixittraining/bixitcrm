import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, CalendarDays, X, Phone,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { STATUS, STATUS_KEYS, StatusChip } from './attendanceStatus'

const todayStr = new Date().toISOString().slice(0, 10)
const today = new Date()
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function pad(n) { return String(n).padStart(2, '0') }
function toISODate(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}` }
function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// A batch's configured class days (schedule_days, e.g. ['Mon','Wed','Fri'])
// bounded by its start/end date — used for "Total Scheduled Classes" so
// that figure comes from real batch config, not a guess. Batches without a
// schedule configured return null (shown as "—", not a fabricated 0).
function countScheduledDays(batch, year, month) {
  if (!batch?.schedule_days?.length) return null
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d)
    const dateStr = toISODate(year, month, d)
    if (dateStr > todayStr) continue
    if (batch.start_date && dateStr < batch.start_date) continue
    if (batch.end_date && dateStr > batch.end_date) continue
    if (batch.schedule_days.includes(DAY_ABBR[dateObj.getDay()])) count++
  }
  return count
}

function emptyCounts() { return { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 } }

export default function AttendanceCalendar({ isDark }) {
  const { batches, students, attendance } = useData()

  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id ?? null)
  const [selectedStudentId, setSelectedStudentId] = useState('all')
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(null)

  const batch = batches.find((b) => b.id === selectedBatchId)
  const roster = useMemo(() => students.filter((s) => s.batch_id === selectedBatchId), [students, selectedBatchId])
  const student = selectedStudentId !== 'all' ? roster.find((s) => s.id === selectedStudentId) : null

  const batchAttendance = useMemo(() => attendance.filter((a) => a.batch_id === selectedBatchId), [attendance, selectedBatchId])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const inputCls = `px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`

  const monthKey = `${year}-${pad(month + 1)}`
  const yearOptions = useMemo(() => {
    const years = new Set([today.getFullYear()])
    batchAttendance.forEach((a) => years.add(Number(a.date.slice(0, 4))))
    return [...years].sort((a, b) => b - a)
  }, [batchAttendance])

  // Records for the currently selected scope (one student, or the whole
  // batch) restricted to the visible month.
  const monthRecords = useMemo(() => {
    const pool = selectedStudentId !== 'all' ? batchAttendance.filter((a) => a.student_id === selectedStudentId) : batchAttendance
    return pool.filter((a) => a.date.startsWith(monthKey))
  }, [batchAttendance, selectedStudentId, monthKey])

  const monthlyStats = useMemo(() => {
    const counts = emptyCounts()
    monthRecords.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })
    const marked = counts.present + counts.absent + counts.late + counts.half_day + counts.leave
    const scheduled = countScheduledDays(batch, year, month)
    // Real attendance doesn't always land exactly on the batch's configured
    // schedule (e.g. a class marked on a day outside schedule_days) — using
    // scheduled as the denominator whenever it's smaller than the actual
    // marked count would understate the picture, so the larger of the two
    // wins instead of blindly trusting the nominal schedule.
    const denominator = scheduled != null ? Math.max(scheduled, marked) : marked
    const pct = denominator > 0 ? Math.round((counts.present / denominator) * 100) : null
    return { scheduled, marked, ...counts, pct }
  }, [monthRecords, batch, year, month])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = new Date(year, month, 1).getDay()
  const cells = [...Array(startWeekday).fill(null), ...Array(daysInMonth).keys().map((d) => d + 1)]

  const goToMonth = (delta) => {
    let m = month + delta, y = year
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setMonth(m); setYear(y)
  }

  const dayDetail = useMemo(() => {
    if (!selectedDay) return null
    if (selectedStudentId !== 'all') {
      const record = batchAttendance.find((a) => a.student_id === selectedStudentId && a.date === selectedDay)
      return { mode: 'student', record }
    }
    const records = roster.map((s) => ({ student: s, record: batchAttendance.find((a) => a.student_id === s.id && a.date === selectedDay) }))
    return { mode: 'batch', records }
  }, [selectedDay, selectedStudentId, batchAttendance, roster])

  return (
    <div className="space-y-5">
      {/* Selectors */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <select value={selectedBatchId ?? ''} onChange={(e) => { setSelectedBatchId(Number(e.target.value)); setSelectedStudentId('all'); setSelectedDay(null) }} className={inputCls}>
          {batches.length === 0 && <option value="">No batches</option>}
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={selectedStudentId} onChange={(e) => { setSelectedStudentId(e.target.value === 'all' ? 'all' : Number(e.target.value)); setSelectedDay(null) }} className={inputCls}>
          <option value="all">All Students (batch overview)</option>
          {roster.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => goToMonth(-1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-300' : 'hover:bg-dark-100 text-dark-600'}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputCls}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => goToMonth(1)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-300' : 'hover:bg-dark-100 text-dark-600'}`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!batch ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          No batches yet — create one to see attendance history.
        </div>
      ) : (
        <>
          {/* Monthly stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'Total Scheduled', value: monthlyStats.scheduled ?? '—', cls: isDark ? 'text-white' : 'text-dark-900' },
              { label: 'Present', value: monthlyStats.present, cls: 'text-emerald-500' },
              { label: 'Absent', value: monthlyStats.absent, cls: 'text-rose-500' },
              { label: 'Late', value: monthlyStats.late, cls: 'text-amber-500' },
              { label: 'Leave', value: monthlyStats.leave + monthlyStats.half_day, cls: 'text-violet-500' },
              { label: 'Attendance %', value: monthlyStats.pct != null ? `${monthlyStats.pct}%` : '—', cls: isDark ? 'text-white' : 'text-dark-900' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
                <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{s.label}</p>
              </div>
            ))}
          </div>
          {monthlyStats.scheduled == null && (
            <p className={`text-xs -mt-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
              {batch.name} has no class days configured, so Attendance % here is Present ÷ marked days instead of Present ÷ scheduled classes.
            </p>
          )}

          {/* Calendar */}
          <div className={`rounded-2xl p-5 ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                <CalendarDays className="w-4 h-4" />{MONTH_NAMES[month]} {year} &middot; {student ? student.name : `${batch.name} — all students`}
              </h3>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {DAY_ABBR.map((d) => (
                <div key={d} className={`text-center text-[11px] font-semibold ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((day, i) => {
                if (day == null) return <div key={i} />
                const dateStr = toISODate(year, month, day)
                const isFuture = dateStr > todayStr
                const isToday = dateStr === todayStr

                let cellCls, content
                if (isFuture) {
                  cellCls = isDark ? 'bg-dark-900/40 text-dark-700' : 'bg-dark-50/40 text-dark-300'
                  content = <span className="text-xs">{day}</span>
                } else if (selectedStudentId !== 'all') {
                  const record = batchAttendance.find((a) => a.student_id === selectedStudentId && a.date === dateStr)
                  if (record) {
                    const s = STATUS[record.status]
                    cellCls = `${s.btn.split(' ')[0]} text-white cursor-pointer`
                    content = <span className="text-xs font-semibold">{day}</span>
                  } else {
                    cellCls = `border border-dashed cursor-pointer ${isDark ? 'border-dark-700 text-dark-500 hover:bg-dark-800/60' : 'border-dark-300 text-dark-400 hover:bg-dark-50'}`
                    content = <span className="text-xs">{day}</span>
                  }
                } else {
                  const dayRecords = batchAttendance.filter((a) => a.date === dateStr)
                  if (dayRecords.length === 0) {
                    cellCls = `border border-dashed cursor-pointer ${isDark ? 'border-dark-700 text-dark-500 hover:bg-dark-800/60' : 'border-dark-300 text-dark-400 hover:bg-dark-50'}`
                    content = <span className="text-xs">{day}</span>
                  } else {
                    const present = dayRecords.filter((r) => r.status === 'present').length
                    const pct = Math.round((present / dayRecords.length) * 100)
                    const tone = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    cellCls = `${tone} text-white cursor-pointer`
                    content = (
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-xs font-semibold">{day}</span>
                        <span className="text-[9px] opacity-90 mt-0.5">{pct}%</span>
                      </div>
                    )
                  }
                }

                return (
                  <button key={i} disabled={isFuture} onClick={() => setSelectedDay(dateStr)}
                    title={isFuture ? 'Upcoming' : dateStr}
                    className={`aspect-square rounded-lg flex items-center justify-center transition-transform ${cellCls} ${!isFuture ? 'hover:scale-105' : ''} ${isToday ? 'ring-2 ring-primary-500' : ''}`}>
                    {content}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {STATUS_KEYS.map((k) => (
                <span key={k} className={`inline-flex items-center gap-1.5 text-[11px] ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  <span className={`w-2.5 h-2.5 rounded-sm ${STATUS[k].btn.split(' ')[0]}`} />{STATUS[k].label}
                </span>
              ))}
              <span className={`inline-flex items-center gap-1.5 text-[11px] ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                <span className={`w-2.5 h-2.5 rounded-sm border border-dashed ${isDark ? 'border-dark-600' : 'border-dark-400'}`} />No Record
              </span>
            </div>
          </div>
        </>
      )}

      {/* Day detail */}
      {selectedDay && dayDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedDay(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto ${isDark ? 'bg-dark-900 border border-dark-700' : 'bg-white border border-dark-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatDateLong(selectedDay)}</h3>
              <button onClick={() => setSelectedDay(null)} className={isDark ? 'text-dark-400 hover:text-white' : 'text-dark-400 hover:text-dark-700'}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {dayDetail.mode === 'student' ? (
              dayDetail.record ? (
                <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{student?.name}</span>
                    <StatusChip status={dayDetail.record.status} isDark={isDark} />
                  </div>
                  <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                    Checked in {dayDetail.record.marked_at ? new Date(dayDetail.record.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'} &middot; Marked by {dayDetail.record.marked_by_name || '—'}
                  </p>
                </div>
              ) : (
                <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No attendance record for this date — this student wasn&apos;t marked at all, which is different from being marked Absent.</p>
              )
            ) : dayDetail.records.filter((r) => r.record).length === 0 ? (
              <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No attendance was marked for anyone in {batch?.name} on this date.</p>
            ) : (
              <div className="space-y-2">
                {dayDetail.records.map(({ student: s, record }) => (
                  <div key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{s.name}</p>
                      <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}><Phone className="w-3 h-3" />{s.phone || '—'}</p>
                    </div>
                    <StatusChip status={record?.status} isDark={isDark} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
