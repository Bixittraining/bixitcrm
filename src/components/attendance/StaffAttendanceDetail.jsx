import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Mail, Phone, Shield, Building2, Users, Clock3,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { supabase } from '../../lib/supabase'
import { StaffStatusChip } from './staffAttendanceStatus'

const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
}
function pctFor(present, marked) {
  return marked > 0 ? Math.round((present / marked) * 100) : null
}
function emptyCounts() { return { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, wfh: 0 } }

// Read-only attendance history for one employee — reachable by clicking a
// name in the Staff Attendance list. Separate from StudentAttendanceDetail
// (different status set, no batch/course concept for staff).
export default function StaffAttendanceDetail({ staffId, onBack, isDark }) {
  const { user, isAdmin } = useAuth()
  const { staffAttendance } = useData()

  // Same reasoning as StaffAttendanceList: DataContext's shared
  // `teamMembers` only carries id/name/role, so department/phone/email
  // need their own fetch rather than assuming they're already loaded.
  const [member, setMember] = useState(null)
  const [memberLoading, setMemberLoading] = useState(true)
  useEffect(() => {
    setMemberLoading(true)
    supabase.from('profiles').select('*').eq('id', staffId).single().then(({ data, error }) => {
      setMemberLoading(false)
      if (error) { console.error('profiles error', error); return }
      setMember(data)
    })
  }, [staffId])

  const canSeeSessions = isAdmin || user?.id === staffId

  const records = useMemo(
    () => staffAttendance.filter((a) => a.staff_id === staffId).sort((a, b) => b.date.localeCompare(a.date)),
    [staffAttendance, staffId]
  )

  // Only fetched when allowed to see this person's sessions (self or
  // admin) — RLS would otherwise silently return nothing for other users,
  // which would misleadingly render as "no sessions" instead of "hidden".
  const [sessions, setSessions] = useState([])
  useEffect(() => {
    if (!canSeeSessions) return
    supabase.from('user_sessions').select('login_at,logout_at').eq('user_id', staffId)
      .then(({ data, error }) => { if (error) console.error('user_sessions error', error); else setSessions(data || []) })
  }, [canSeeSessions, staffId])

  const sessionsByDate = useMemo(() => {
    const map = new Map()
    sessions.forEach((s) => { const d = s.login_at.slice(0, 10); if (!map.has(d)) map.set(d, []); map.get(d).push(s) })
    return map
  }, [sessions])

  const overall = useMemo(() => {
    const counts = emptyCounts()
    records.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })
    const marked = records.length
    return { total: marked, ...counts, pct: pctFor(counts.present, marked) }
  }, [records])

  const monthly = useMemo(() => {
    const byMonth = new Map()
    records.forEach((r) => {
      const key = r.date.slice(0, 7)
      if (!byMonth.has(key)) byMonth.set(key, emptyCounts())
      byMonth.get(key)[r.status] = (byMonth.get(key)[r.status] || 0) + 1
    })
    return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([key, counts]) => {
      const marked = counts.present + counts.absent + counts.late + counts.half_day + counts.leave + counts.wfh
      const [y, m] = key.split('-').map(Number)
      return { key, label: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), counts, pct: pctFor(counts.present, marked) }
    })
  }, [records])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  if (memberLoading) {
    return (
      <div className={`rounded-2xl p-12 text-center flex items-center justify-center gap-2 ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
        Loading...
      </div>
    )
  }

  if (!member) {
    return (
      <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
        <Users className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Employee not found</p>
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

      {/* Profile */}
      <div className={`rounded-2xl p-5 ${cardClass}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-primary-500 to-violet-500 shrink-0">
            {member.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="min-w-0">
            <h2 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{member.name}</h2>
            <div className={`flex items-center gap-4 mt-1.5 text-xs flex-wrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
              <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{member.phone || '—'}</span>
              <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{member.email || '—'}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-dashed border-dark-700/40">
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Role</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><Shield className="w-3.5 h-3.5" />{roleLabels[member.role] || member.role}</p>
          </div>
          <div>
            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Department</p>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}><Building2 className="w-3.5 h-3.5" />{member.department || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total Days', value: overall.total, cls: isDark ? 'text-white' : 'text-dark-900' },
          { label: 'Present', value: overall.present, cls: 'text-emerald-500' },
          { label: 'Absent', value: overall.absent, cls: 'text-rose-500' },
          { label: 'Late', value: overall.late, cls: 'text-amber-500' },
          { label: 'On Leave', value: overall.leave + overall.half_day + overall.wfh, cls: 'text-violet-500' },
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
          No attendance recorded for this employee yet.
        </div>
      ) : (
        <>
          {/* Monthly summary */}
          <div className={`rounded-2xl p-5 ${cardClass}`}>
            <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Monthly Attendance Summary</h3>
            <div className="space-y-3">
              {monthly.map((m) => (
                <div key={m.key} className={`rounded-xl p-4 ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{m.label}</p>
                    <span className={`text-sm font-bold ${m.pct != null && m.pct >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>{m.pct != null ? `${m.pct}%` : '—'}</span>
                  </div>
                  <div className={`flex items-center gap-4 text-xs flex-wrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                    <span>Present: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.present}</b></span>
                    <span>Absent: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.absent}</b></span>
                    <span>Late: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.late}</b></span>
                    <span>On Leave: <b className={isDark ? 'text-dark-200' : 'text-dark-700'}>{m.counts.leave + m.counts.half_day + m.counts.wfh}</b></span>
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
                    {['Date', 'Status', ...(canSeeSessions ? ['Login Time', 'Logout Time', 'Working Hours'] : []), 'Marked By'].map((h) => (
                      <th key={h} className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                  {records.slice(0, 20).map((r) => {
                    const daySessions = sessionsByDate.get(r.date) || []
                    const login = daySessions[0]?.login_at
                    const stillOpen = daySessions.some((s) => !s.logout_at)
                    const logout = stillOpen ? null : [...daySessions].reverse().find((s) => s.logout_at)?.logout_at
                    const hoursMs = daySessions.reduce((sum, s) => sum + (new Date(s.logout_at || Date.now()) - new Date(s.login_at)), 0)
                    const hours = daySessions.length ? hoursMs / 3600000 : null
                    return (
                      <tr key={r.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                        <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatDate(r.date)}</td>
                        <td className="px-5 py-3"><StaffStatusChip status={r.status} isDark={isDark} /></td>
                        {canSeeSessions && (
                          <>
                            <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{formatTime(login)}</td>
                            <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stillOpen ? <span className="text-emerald-500 font-medium">Still online</span> : formatTime(logout)}</td>
                            <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                              {hours != null ? <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{hours.toFixed(1)}h</span> : '—'}
                            </td>
                          </>
                        )}
                        <td className={`px-5 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{r.marked_by_name || '—'}</td>
                      </tr>
                    )
                  })}
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
