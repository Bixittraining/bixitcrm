import { useState, useMemo } from 'react'
import {
  Search, X, Calendar, Check, AlertCircle, Loader2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { STATUS, STATUS_KEYS, StatusChip } from './attendanceStatus'
import ConfirmModal from './ConfirmModal'
import BatchAttendanceView from './BatchAttendanceView'
import StudentAttendanceDetail from './StudentAttendanceDetail'

const todayStr = new Date().toISOString().slice(0, 10)

export default function StudentAttendanceTable({ isDark }) {
  const { canManageTeam } = useAuth()
  const { batches, students, attendance, markAttendance } = useData()

  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [date, setDate] = useState(todayStr)
  const [batchFilter, setBatchFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [rowError, setRowError] = useState(null)

  // Marking is only ever allowed for today — a past date is read-only
  // history, so backdated attendance can't be fabricated after the fact.
  // This was a deliberate fix earlier in the project (client-requested)
  // and stays in place; the date selector here is for browsing history.
  const isToday = date === todayStr

  const courseOptions = useMemo(() => ['all', ...new Set(batches.map((b) => b.course).filter(Boolean))], [batches])
  const batchOptions = useMemo(
    () => batches.filter((b) => courseFilter === 'all' || b.course === courseFilter),
    [batches, courseFilter]
  )

  const rows = useMemo(() => {
    return students
      .filter((s) => s.batch_id != null)
      .filter((s) => batchFilter === 'all' || String(s.batch_id) === String(batchFilter))
      .filter((s) => {
        if (courseFilter === 'all') return true
        const batch = batches.find((b) => b.id === s.batch_id)
        return batch?.course === courseFilter
      })
      .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()))
      .map((s) => {
        const batch = batches.find((b) => b.id === s.batch_id)
        const record = attendance.find((a) => a.student_id === s.id && a.date === date)
        return { student: s, batch, record }
      })
      .filter((r) => statusFilter === 'all' || r.record?.status === statusFilter)
      .sort((a, b) => a.student.name.localeCompare(b.student.name))
  }, [students, batches, attendance, date, batchFilter, courseFilter, statusFilter, search])

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 }
    rows.forEach((r) => { if (r.record) counts[r.record.status] = (counts[r.record.status] || 0) + 1 })
    const marked = counts.present + counts.absent + counts.late + counts.half_day + counts.leave
    const pct = marked > 0 ? Math.round((counts.present / marked) * 100) : null
    return { total: rows.length, ...counts, pct }
  }, [rows])

  const handleMark = async (studentId, batchId, status) => {
    setRowError(null)
    setSavingId(studentId)
    const ok = await markAttendance(batchId, date, [{ studentId, status }])
    setSavingId(null)
    if (!ok) setRowError(studentId)
  }

  const handleBulkPresent = async () => {
    setBulkSaving(true)
    // markAttendance writes one batch_id per call, so unmarked students are
    // grouped by their actual batch before saving — this also structurally
    // guarantees a student can only ever be recorded under their own batch.
    const targets = rows.filter((r) => !r.record)
    const byBatch = new Map()
    targets.forEach((r) => {
      if (!r.batch) return
      if (!byBatch.has(r.batch.id)) byBatch.set(r.batch.id, [])
      byBatch.get(r.batch.id).push({ studentId: r.student.id, status: 'present' })
    })
    for (const [batchId, records] of byBatch) {
      await markAttendance(batchId, date, records)
    }
    setBulkSaving(false)
    setConfirmBulk(false)
  }

  const clearFilters = () => { setBatchFilter('all'); setCourseFilter('all'); setStatusFilter('all'); setSearch('') }
  const hasFilters = batchFilter !== 'all' || courseFilter !== 'all' || statusFilter !== 'all' || search
  const unmarkedCount = rows.filter((r) => !r.record).length

  const inputCls = `px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`

  if (selectedStudentId != null) {
    return <StudentAttendanceDetail studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} isDark={isDark} />
  }

  if (selectedBatchId != null) {
    return (
      <BatchAttendanceView
        batchId={selectedBatchId}
        initialDate={date}
        onBack={() => setSelectedBatchId(null)}
        isDark={isDark}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative">
          <Calendar size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
          <input type="date" value={date} max={todayStr} onChange={(e) => setDate(e.target.value)}
            className={`pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`} />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
          <input type="text" placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-900 border-dark-700/60 text-white placeholder:text-dark-500' : 'bg-white border-dark-200/60 text-dark-900 placeholder:text-dark-400'}`} />
        </div>
        <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setBatchFilter('all') }} className={inputCls}>
          {courseOptions.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Courses' : c}</option>)}
        </select>
        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className={inputCls}>
          <option value="all">All Batches</option>
          {batchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
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

      {/* Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: summary.total, cls: isDark ? 'text-white' : 'text-dark-900' },
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

      {!isToday && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Viewing {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — read-only. Attendance can only be marked for today.
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

      {/* List */}
      {rows.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${isDark ? 'bg-dark-900 border border-dark-700/60 text-dark-500' : 'bg-white border border-dark-200/60 text-dark-400'}`}>
          {students.filter((s) => s.batch_id).length === 0 ? 'No students assigned to a batch yet.' : 'No students match these filters.'}
        </div>
      ) : (
        <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                  {['Student', 'Batch', 'Course', 'Status', 'Check-in Time', 'Marked By', 'Actions'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                {rows.map(({ student, batch, record }) => {
                  // An already-marked record can only be corrected by an
                  // admin/manager; any staff can mark a not-yet-marked one.
                  const canEdit = isToday && (!record || canManageTeam)
                  return (
                    <tr key={student.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => setSelectedStudentId(student.id)}
                          className={`font-medium hover:underline ${isDark ? 'text-white hover:text-primary-400' : 'text-dark-900 hover:text-primary-600'}`}>
                          {student.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {batch ? (
                          <button onClick={() => setSelectedBatchId(batch.id)}
                            className="font-medium text-primary-500 hover:text-primary-400 hover:underline">
                            {batch.name}
                          </button>
                        ) : '—'}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{batch?.course || '—'}</td>
                      <td className="px-4 py-3"><StatusChip status={record?.status} isDark={isDark} /></td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                        {record?.marked_at ? new Date(record.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{record?.marked_by_name || '—'}</td>
                      <td className="px-4 py-3">
                        {!canEdit ? (
                          <span className={`text-xs ${isDark ? 'text-dark-600' : 'text-dark-300'}`}>{record && !canManageTeam ? 'Locked' : '—'}</span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {savingId === student.id ? (
                              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-dark-400' : 'text-dark-500'}`} />
                            ) : STATUS_KEYS.map((k) => (
                              <button key={k} onClick={() => handleMark(student.id, batch.id, k)}
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
          body={`This will mark ${unmarkedCount} student${unmarkedCount === 1 ? '' : 's'} across the current filter as Present for ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Already-marked students are left as they are — change them individually if needed.`}
          confirmLabel="Mark Present"
          busy={bulkSaving}
          onConfirm={handleBulkPresent}
          onCancel={() => setConfirmBulk(false)}
        />
      )}
    </div>
  )
}
