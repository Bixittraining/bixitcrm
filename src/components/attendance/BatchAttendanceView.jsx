import { useState, useMemo } from 'react'
import {
  ArrowLeft, Search, X, Calendar, Check, AlertCircle, Loader2,
  Layers, GraduationCap, User, Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { STATUS, STATUS_KEYS, StatusChip } from './attendanceStatus'
import ConfirmModal from './ConfirmModal'

const todayStr = new Date().toISOString().slice(0, 10)

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Dedicated per-batch attendance view, opened by clicking a batch from the
// flat Student Attendance table. Same data/permission model as that table
// (markAttendance, canManageTeam, today-only marking) — this is a focused
// view of the same underlying attendance records, not a separate feature.
export default function BatchAttendanceView({ batchId, initialDate, onBack, isDark }) {
  const { canManageTeam } = useAuth()
  const { batches, students, teamMembers, attendance, markAttendance } = useData()

  const [date, setDate] = useState(initialDate || todayStr)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [rowError, setRowError] = useState(null)

  const batch = batches.find((b) => b.id === batchId)
  const trainer = teamMembers.find((m) => m.id === batch?.instructor_id)?.name

  // Roster is scoped strictly to this batch — a student from another batch
  // can never appear here, so there's no separate check needed for it.
  const roster = useMemo(() => students.filter((s) => s.batch_id === batchId), [students, batchId])

  const isToday = date === todayStr

  const rows = useMemo(() => {
    return roster
      .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()))
      .map((s) => {
        const record = attendance.find((a) => a.student_id === s.id && a.date === date)
        const priorRecords = attendance.filter((a) => a.student_id === s.id && a.date < date).sort((a, b) => b.date.localeCompare(a.date))
        return { student: s, record, lastAttendance: priorRecords[0] || null }
      })
      .filter((r) => statusFilter === 'all' || r.record?.status === statusFilter)
      .sort((a, b) => a.student.name.localeCompare(b.student.name))
  }, [roster, attendance, date, search, statusFilter])

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 }
    rows.forEach((r) => { if (r.record) counts[r.record.status] = (counts[r.record.status] || 0) + 1 })
    const marked = counts.present + counts.absent + counts.late + counts.half_day + counts.leave
    const pct = marked > 0 ? Math.round((counts.present / marked) * 100) : null
    return { total: rows.length, ...counts, pct }
  }, [rows])

  const handleMark = async (studentId, status) => {
    setRowError(null)
    setSavingId(studentId)
    const ok = await markAttendance(batchId, date, [{ studentId, status }])
    setSavingId(null)
    if (!ok) setRowError(studentId)
  }

  const unmarkedCount = rows.filter((r) => !r.record).length

  const handleBulkPresent = async () => {
    setBulkSaving(true)
    const records = rows.filter((r) => !r.record).map((r) => ({ studentId: r.student.id, status: 'present' }))
    await markAttendance(batchId, date, records)
    setBulkSaving(false)
    setConfirmBulk(false)
  }

  const clearFilters = () => { setStatusFilter('all'); setSearch('') }
  const hasFilters = statusFilter !== 'all' || search

  const inputCls = `px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`
  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  if (!batch) {
    return (
      <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
        <Layers className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Batch not found</p>
        <button onClick={onBack} className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-400">
          <ArrowLeft className="w-4 h-4" />Back to Student Attendance
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
        <ArrowLeft className="w-3.5 h-3.5" />Back to Student Attendance
      </button>

      {/* Batch header */}
      <div className={`rounded-2xl p-5 ${cardClass}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{batch.name}</h2>
            <div className={`flex items-center gap-4 mt-1.5 text-xs flex-wrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
              <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{batch.course}</span>
              <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{trainer || 'Unassigned'}</span>
              <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{roster.length} students</span>
            </div>
          </div>
          <div className="relative">
            <Calendar size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
            <input type="date" value={date} max={todayStr} onChange={(e) => setDate(e.target.value)}
              className={`pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total Students', value: summary.total, cls: isDark ? 'text-white' : 'text-dark-900' },
          { label: 'Present', value: summary.present, cls: 'text-emerald-500' },
          { label: 'Absent', value: summary.absent, cls: 'text-rose-500' },
          { label: 'Late', value: summary.late, cls: 'text-amber-500' },
          { label: 'Leave', value: summary.leave + summary.half_day, cls: 'text-violet-500' },
          { label: 'Attendance %', value: summary.pct != null ? `${summary.pct}%` : '—', cls: isDark ? 'text-white' : 'text-dark-900' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
            <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
          <input type="text" placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-900 border-dark-700/60 text-white placeholder:text-dark-500' : 'bg-white border-dark-200/60 text-dark-900 placeholder:text-dark-400'}`} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="all">All Statuses</option>
          {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
            <X size={14} />Clear
          </button>
        )}
      </div>

      {!isToday && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Viewing {formatDate(date)} — read-only. Attendance can only be marked for today.
        </div>
      )}

      {isToday && unmarkedCount > 0 && (
        <div className="flex justify-end">
          <button onClick={() => setConfirmBulk(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors">
            <Check className="w-4 h-4" />Mark All Present ({unmarkedCount} unmarked)
          </button>
        </div>
      )}

      {/* Student table */}
      {roster.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${isDark ? 'bg-dark-900 border border-dark-700/60 text-dark-500' : 'bg-white border border-dark-200/60 text-dark-400'}`}>
          No students assigned to this batch yet.
        </div>
      ) : rows.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${isDark ? 'bg-dark-900 border border-dark-700/60 text-dark-500' : 'bg-white border border-dark-200/60 text-dark-400'}`}>
          No students match these filters.
        </div>
      ) : (
        <div className={`rounded-2xl overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                  {['Student', 'Phone', 'Status', 'Check-in Time', 'Marked By', 'Last Attendance', 'Action'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                {rows.map(({ student, record, lastAttendance }) => {
                  const canEdit = isToday && (!record || canManageTeam)
                  return (
                    <tr key={student.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-dark-900'}`}>{student.name}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{student.phone || '—'}</td>
                      <td className="px-4 py-3"><StatusChip status={record?.status} isDark={isDark} /></td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                        {record?.marked_at ? new Date(record.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{record?.marked_by_name || '—'}</td>
                      <td className={`px-4 py-3 whitespace-nowrap text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                        {lastAttendance ? `${formatDate(lastAttendance.date)} · ${STATUS[lastAttendance.status].label}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!canEdit ? (
                          <span className={`text-xs ${isDark ? 'text-dark-600' : 'text-dark-300'}`}>{record && !canManageTeam ? 'Locked' : '—'}</span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {savingId === student.id ? (
                              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-dark-400' : 'text-dark-500'}`} />
                            ) : STATUS_KEYS.map((k) => (
                              <button key={k} onClick={() => handleMark(student.id, k)}
                                title={STATUS[k].label}
                                className={`w-6 h-6 rounded-md text-white text-[10px] font-bold flex items-center justify-center transition-opacity ${STATUS[k].btn} ${record?.status === k ? 'ring-2 ring-offset-1 ring-primary-400' : 'opacity-60 hover:opacity-100'} ${isDark ? 'ring-offset-dark-900' : 'ring-offset-white'}`}>
                                {STATUS[k].label[0]}
                              </button>
                            ))}
                          </div>
                        )}
                        {rowError === student.id && (
                          <p className="text-[11px] text-rose-500 mt-1">Save failed — try again</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmBulk && (
        <ConfirmModal
          isDark={isDark}
          title="Mark all unmarked students Present?"
          body={`This will mark ${unmarkedCount} student${unmarkedCount === 1 ? '' : 's'} in ${batch.name} as Present for ${formatDate(date)}. Already-marked students are left as they are.`}
          confirmLabel="Mark Present"
          busy={bulkSaving}
          onConfirm={handleBulkPresent}
          onCancel={() => setConfirmBulk(false)}
        />
      )}
    </div>
  )
}
