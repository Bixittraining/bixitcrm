import { useState, useMemo, useEffect } from 'react'
import {
  Search, X, Calendar, Check, AlertCircle, Loader2, Clock3,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { supabase } from '../../lib/supabase'
import { STAFF_STATUS, STAFF_STATUS_KEYS, StaffStatusChip } from './staffAttendanceStatus'
import ConfirmModal from './ConfirmModal'
import StaffAttendanceDetail from './StaffAttendanceDetail'

const todayStr = new Date().toISOString().slice(0, 10)
const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
}

// Staff Attendance is intentionally a separate component tree from Student
// Attendance (StudentAttendanceTable / BatchAttendanceView / etc.) — same
// visual language, but its own status set, its own table shape (Department/
// Role/Login/Logout/Hours instead of Batch/Course), and no shared state.
export default function StaffAttendanceList({ isDark }) {
  const { isAdmin, canManageTeam } = useAuth()
  const { staffAttendance, markStaffAttendance } = useData()

  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [date, setDate] = useState(todayStr)
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [rowError, setRowError] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState(false)

  // DataContext's shared `teamMembers` only carries id/name/role (kept
  // deliberately narrow since most consumers — lead assignment dropdowns,
  // etc. — never need more). Department/phone/email aren't in it, so this
  // fetches its own richer copy, the same way Settings.jsx already does
  // for its Team page rather than widening the shared context.
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffError, setStaffError] = useState(false)
  useEffect(() => {
    supabase.from('profiles').select('*').order('name', { ascending: true }).then(({ data, error }) => {
      setStaffLoading(false)
      if (error) { console.error('profiles error', error); setStaffError(true); return }
      setStaffList(data || [])
    })
  }, [])

  const isToday = date === todayStr

  // Login/Logout Time and Working Hours come from the existing
  // user_sessions table (already populated by every sign-in/sign-out) —
  // not duplicated into staff_attendance. RLS only lets an admin read
  // sessions belonging to other users, so this fetch (and these three
  // columns) only runs for admins; everyone else still sees status marking.
  useEffect(() => {
    if (!isAdmin) return
    setSessionsLoading(true)
    setSessionsError(false)
    supabase.from('user_sessions').select('user_id,login_at,logout_at')
      .gte('login_at', `${date}T00:00:00`).lte('login_at', `${date}T23:59:59`)
      .then(({ data, error }) => {
        setSessionsLoading(false)
        if (error) { console.error('user_sessions error', error); setSessionsError(true); return }
        setSessions(data || [])
      })
  }, [isAdmin, date])

  const sessionsByStaff = useMemo(() => {
    const map = new Map()
    sessions.forEach((s) => { if (!map.has(s.user_id)) map.set(s.user_id, []); map.get(s.user_id).push(s) })
    return map
  }, [sessions])

  const deptOptions = useMemo(() => ['all', ...new Set(staffList.map((m) => m.department).filter(Boolean))], [staffList])

  const rows = useMemo(() => {
    return staffList
      .filter((m) => deptFilter === 'all' || m.department === deptFilter)
      .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()))
      .map((m) => {
        const record = staffAttendance.find((a) => a.staff_id === m.id && a.date === date)
        const staffSessions = (sessionsByStaff.get(m.id) || []).sort((a, b) => a.login_at.localeCompare(b.login_at))
        const login = staffSessions[0]?.login_at || null
        const stillOpen = staffSessions.some((s) => !s.logout_at)
        const lastClosed = [...staffSessions].reverse().find((s) => s.logout_at)
        const logout = stillOpen ? null : lastClosed?.logout_at || null
        const hoursMs = staffSessions.reduce((sum, s) => sum + (new Date(s.logout_at || Date.now()) - new Date(s.login_at)), 0)
        const workingHours = staffSessions.length ? (hoursMs / 3600000) : null
        return { member: m, record, login, logout, stillOpen, workingHours }
      })
      .filter((r) => statusFilter === 'all' || r.record?.status === statusFilter)
      .sort((a, b) => a.member.name.localeCompare(b.member.name))
  }, [staffList, staffAttendance, date, deptFilter, statusFilter, search, sessionsByStaff])

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, wfh: 0 }
    rows.forEach((r) => { if (r.record) counts[r.record.status] = (counts[r.record.status] || 0) + 1 })
    const withHours = rows.filter((r) => r.workingHours != null)
    const avgHours = withHours.length ? (withHours.reduce((sum, r) => sum + r.workingHours, 0) / withHours.length) : null
    return { total: rows.length, ...counts, onLeave: counts.leave + counts.half_day + counts.wfh, avgHours }
  }, [rows])

  const handleMark = async (staffId, status) => {
    setRowError(null)
    setSavingId(staffId)
    const ok = await markStaffAttendance(date, [{ staffId, status }])
    setSavingId(null)
    if (!ok) setRowError(staffId)
  }

  const unmarkedCount = rows.filter((r) => !r.record).length

  const handleBulkPresent = async () => {
    setBulkSaving(true)
    const records = rows.filter((r) => !r.record).map((r) => ({ staffId: r.member.id, status: 'present' }))
    await markStaffAttendance(date, records)
    setBulkSaving(false)
    setConfirmBulk(false)
  }

  const clearFilters = () => { setDeptFilter('all'); setStatusFilter('all'); setSearch('') }
  const hasFilters = deptFilter !== 'all' || statusFilter !== 'all' || search

  const inputCls = `px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`
  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  if (selectedStaffId != null) {
    return <StaffAttendanceDetail staffId={selectedStaffId} onBack={() => setSelectedStaffId(null)} isDark={isDark} />
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
          <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-900 border-dark-700/60 text-white placeholder:text-dark-500' : 'bg-white border-dark-200/60 text-dark-900 placeholder:text-dark-400'}`} />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={inputCls}>
          {deptOptions.map((d) => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="all">All Statuses</option>
          {STAFF_STATUS_KEYS.map((k) => <option key={k} value={k}>{STAFF_STATUS[k].label}</option>)}
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
          { label: 'Total Staff', value: summary.total, cls: isDark ? 'text-white' : 'text-dark-900' },
          { label: 'Present', value: summary.present, cls: 'text-emerald-500' },
          { label: 'Absent', value: summary.absent, cls: 'text-rose-500' },
          { label: 'Late', value: summary.late, cls: 'text-amber-500' },
          { label: 'On Leave', value: summary.onLeave, cls: 'text-violet-500' },
          { label: 'Avg. Working Hours', value: isAdmin ? (summary.avgHours != null ? `${summary.avgHours.toFixed(1)}h` : '—') : '—', cls: isDark ? 'text-white' : 'text-dark-900' },
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

      {!isAdmin && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'bg-dark-800 text-dark-400' : 'bg-dark-100 text-dark-500'}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Login Time, Logout Time, and Working Hours are only visible to administrators.
        </div>
      )}

      {sessionsError && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Couldn&apos;t load login session data — status marking still works below.
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
      {staffLoading ? (
        <div className={`rounded-2xl p-10 text-center text-sm flex items-center justify-center gap-2 ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          <Loader2 className="w-4 h-4 animate-spin" />Loading staff...
        </div>
      ) : staffError ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>
          Couldn&apos;t load staff. Try refreshing the page.
        </div>
      ) : staffList.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          No team members yet.
        </div>
      ) : rows.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          No employees match these filters.
        </div>
      ) : (
        <div className={`rounded-2xl overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                  {['Employee', 'Department', 'Role', 'Status', ...(isAdmin ? ['Login Time', 'Logout Time', 'Working Hours'] : []), 'Action'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                {rows.map(({ member, record, login, logout, stillOpen, workingHours }) => {
                  const canEdit = isToday && (!record || canManageTeam)
                  return (
                    <tr key={member.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => setSelectedStaffId(member.id)}
                          className={`font-medium hover:underline ${isDark ? 'text-white hover:text-primary-400' : 'text-dark-900 hover:text-primary-600'}`}>
                          {member.name}
                        </button>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{member.department || '—'}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{roleLabels[member.role] || member.role}</td>
                      <td className="px-4 py-3"><StaffStatusChip status={record?.status} isDark={isDark} /></td>
                      {isAdmin && (
                        <>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                            {sessionsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : formatTime(login)}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                            {sessionsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : stillOpen ? <span className="text-emerald-500 font-medium">Still online</span> : formatTime(logout)}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                            {sessionsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : workingHours != null ? (
                              <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{workingHours.toFixed(1)}h</span>
                            ) : '—'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        {!canEdit ? (
                          <span className={`text-xs ${isDark ? 'text-dark-600' : 'text-dark-300'}`}>{record && !canManageTeam ? 'Locked' : '—'}</span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {savingId === member.id ? (
                              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-dark-400' : 'text-dark-500'}`} />
                            ) : STAFF_STATUS_KEYS.map((k) => (
                              <button key={k} onClick={() => handleMark(member.id, k)}
                                title={STAFF_STATUS[k].label}
                                className={`w-6 h-6 rounded-md text-white text-[10px] font-bold flex items-center justify-center transition-opacity ${STAFF_STATUS[k].btn} ${record?.status === k ? 'ring-2 ring-offset-1 ring-primary-400' : 'opacity-60 hover:opacity-100'} ${isDark ? 'ring-offset-dark-900' : 'ring-offset-white'}`}>
                                {STAFF_STATUS[k].label[0]}
                              </button>
                            ))}
                          </div>
                        )}
                        {rowError === member.id && (
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
          title="Mark all unmarked staff Present?"
          body={`This will mark ${unmarkedCount} employee${unmarkedCount === 1 ? '' : 's'} across the current filter as Present for ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Already-marked staff are left as they are — change them individually if needed.`}
          confirmLabel="Mark Present"
          busy={bulkSaving}
          onConfirm={handleBulkPresent}
          onCancel={() => setConfirmBulk(false)}
        />
      )}
    </div>
  )
}
