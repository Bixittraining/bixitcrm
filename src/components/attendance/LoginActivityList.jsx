import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Calendar, AlertCircle, Loader2, Circle, LogIn, LogOut, Clock3, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const todayStr = new Date().toISOString().slice(0, 10)
const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

function formatDateTime(iso) {
  return iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}
function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
}
function formatDuration(ms) {
  if (ms < 0) return '—'
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// This is the only place employee CRM login/logout is tracked, and it's
// read directly from the existing auth session records (user_sessions,
// written by AuthContext.signIn/signOut) — no separate tracking mechanism,
// no activity/keystroke/page-view logging. Login and logout are the only
// two real events that exist, so those are the only two things shown.
export default function LoginActivityList({ isDark }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [date, setDate] = useState(todayStr)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Profiles for the Employee/Department columns (DataContext's shared
  // teamMembers only carries id/name/role) — same fix already applied to
  // Staff Attendance, same reason: fetch what this view needs locally
  // instead of widening a context many unrelated screens depend on.
  useEffect(() => {
    if (!isAdmin) return
    setStaffLoading(true)
    supabase.from('profiles').select('*').order('name', { ascending: true }).then(({ data, error }) => {
      setStaffLoading(false)
      if (error) { console.error('profiles error', error); setLoadError(true); return }
      setStaffList(data || [])
    })
  }, [isAdmin])

  // All sessions are fetched once (not re-fetched per date filter click) —
  // the date filter only changes which rows are shown, not what's queried,
  // since the "Currently Active" summary needs to see every open session
  // regardless of which day is selected in the history table below.
  useEffect(() => {
    if (!isAdmin) return
    setSessionsLoading(true)
    supabase.from('user_sessions').select('id,user_id,login_at,logout_at').order('login_at', { ascending: false }).then(({ data, error }) => {
      setSessionsLoading(false)
      if (error) { console.error('user_sessions error', error); setLoadError(true); return }
      setSessions(data || [])
    })
  }, [isAdmin])

  const deptOptions = useMemo(() => ['all', ...new Set(staffList.map((m) => m.department).filter(Boolean))], [staffList])

  // "Currently Active" only counts sessions that started today and are
  // still open. An open session from an earlier day almost certainly means
  // the tab was closed without signing out (an abandoned session), not that
  // someone has been working continuously for days — counting it as live
  // would misrepresent who's actually online right now.
  const activeToday = useMemo(
    () => sessions.filter((s) => !s.logout_at && s.login_at.slice(0, 10) === todayStr),
    [sessions]
  )
  const activeUserIds = useMemo(() => new Set(activeToday.map((s) => s.user_id)), [activeToday])

  const loginsToday = useMemo(() => sessions.filter((s) => s.login_at.slice(0, 10) === todayStr), [sessions])
  const avgDurationToday = useMemo(() => {
    const closedToday = loginsToday.filter((s) => s.logout_at)
    if (!closedToday.length) return null
    const totalMs = closedToday.reduce((sum, s) => sum + (new Date(s.logout_at) - new Date(s.login_at)), 0)
    return totalMs / closedToday.length
  }, [loginsToday])

  const rows = useMemo(() => {
    return sessions
      .filter((s) => s.login_at.slice(0, 10) === date)
      .map((s) => {
        const member = staffList.find((m) => m.id === s.user_id)
        return { session: s, member }
      })
      .filter((r) => !employeeSearch || r.member?.name?.toLowerCase().includes(employeeSearch.toLowerCase()))
      .filter((r) => deptFilter === 'all' || r.member?.department === deptFilter)
      .filter((r) => {
        if (statusFilter === 'all') return true
        const isActive = !r.session.logout_at
        return statusFilter === 'active' ? isActive : !isActive
      })
  }, [sessions, staffList, date, employeeSearch, deptFilter, statusFilter])

  const clearFilters = () => { setEmployeeSearch(''); setDeptFilter('all'); setStatusFilter('all') }
  const hasFilters = employeeSearch || deptFilter !== 'all' || statusFilter !== 'all'

  const inputCls = `px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`
  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const loading = staffLoading || sessionsLoading

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Team Members', value: staffList.length, icon: LogIn, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
          { label: 'Currently Active', value: activeUserIds.size, icon: Circle, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
          { label: 'Logins Today', value: loginsToday.length, icon: LogIn, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
          { label: 'Avg. Session Today', value: avgDurationToday != null ? formatDuration(avgDurationToday) : '—', icon: Clock3, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{s.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{s.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon size={18} className={s.color} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative">
          <Calendar size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
          <input type="date" value={date} max={todayStr} onChange={(e) => setDate(e.target.value)}
            className={`pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`} />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
          <input type="text" placeholder="Search employee..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-900 border-dark-700/60 text-white placeholder:text-dark-500' : 'bg-white border-dark-200/60 text-dark-900 placeholder:text-dark-400'}`} />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={inputCls}>
          {deptOptions.map((d) => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="logged_out">Logged Out</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
            <X size={14} />Clear
          </button>
        )}
      </div>

      {loadError && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />Couldn&apos;t load login activity. Try refreshing the page.
        </div>
      )}

      {/* Login history */}
      {loading ? (
        <div className={`rounded-2xl p-10 text-center text-sm flex items-center justify-center gap-2 ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          <Loader2 className="w-4 h-4 animate-spin" />Loading login activity...
        </div>
      ) : rows.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          {sessions.length === 0 ? 'No login activity recorded yet.' : 'No sessions match these filters.'}
        </div>
      ) : (
        <div className={`rounded-2xl overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                  {['Employee', 'Login Time', 'Logout Time', 'Session Duration', 'Current Status', 'Last Activity', ''].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                {rows.map(({ session, member }) => {
                  const isOpen = !session.logout_at
                  const loginIsToday = session.login_at.slice(0, 10) === todayStr
                  const isActive = isOpen && loginIsToday
                  const isAbandoned = isOpen && !loginIsToday
                  const durationMs = session.logout_at
                    ? new Date(session.logout_at) - new Date(session.login_at)
                    : isActive ? Date.now() - new Date(session.login_at) : null
                  const lastActivity = session.logout_at || session.login_at

                  return (
                    <tr key={session.id} onClick={() => member && navigate(`/team-activity/${member.id}`)}
                      className={`${member ? 'cursor-pointer' : ''} ${isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{member?.name || 'Unknown'}</p>
                        {member && <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{roleLabels[member.role] || member.role}{member.department ? ` · ${member.department}` : ''}</p>}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                        <span className="inline-flex items-center gap-1"><LogIn className="w-3 h-3 text-emerald-500" />{formatTime(session.login_at)}</span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                        {session.logout_at ? (
                          <span className="inline-flex items-center gap-1"><LogOut className="w-3 h-3 text-rose-500" />{formatTime(session.logout_at)}</span>
                        ) : '—'}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                        {isAbandoned ? (
                          <span className={isDark ? 'text-dark-500' : 'text-dark-400'} title="Session never closed — likely a tab closed without signing out">Ongoing (not closed)</span>
                        ) : durationMs != null ? formatDuration(durationMs) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500"><Circle className="w-2 h-2 fill-emerald-500" />Currently Active</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-dark-500' : 'text-dark-400'}`}><Circle className="w-2 h-2" />Logged Out</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{formatDateTime(lastActivity)}</td>
                      <td className="px-4 py-3 text-right">
                        {member && <ChevronRight className={`w-4 h-4 inline ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
