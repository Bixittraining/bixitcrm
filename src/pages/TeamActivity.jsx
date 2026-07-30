import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, LogIn, LogOut, Shield, X, Circle, UserCheck,
  Calendar, ChevronRight, ShieldAlert,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(dateStr) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDuration(loginAt, logoutAt) {
  if (!logoutAt) return '—'
  const ms = new Date(logoutAt) - new Date(loginAt)
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

// Attendance-style view: one row per calendar day, listing every
// login/logout pair that happened that day (someone can log in and out
// more than once in a day, e.g. a lunch break).
function SessionHistoryModal({ member, sessions, isDark, onClose }) {
  const memberSessions = sessions.filter((s) => s.user_id === member.id).sort((a, b) => new Date(b.login_at) - new Date(a.login_at))

  const byDay = useMemo(() => {
    const map = new Map()
    for (const s of memberSessions) {
      const day = s.login_at.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day).push(s)
    }
    return [...map.entries()]
  }, [memberSessions])

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className={`relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{member.name}'s Attendance</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{byDay.length} day{byDay.length === 1 ? '' : 's'} logged &middot; {memberSessions.length} session{memberSessions.length === 1 ? '' : 's'}</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}>
            <X className="w-5 h-5" />
          </motion.button>
        </div>
        {byDay.length === 0 ? (
          <p className={`text-sm text-center py-8 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No sessions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {byDay.map(([day, daySessions]) => (
              <div key={day} className={`rounded-xl p-3.5 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`} />
                  <p className={`text-xs font-semibold ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{formatDayLabel(day)}</p>
                </div>
                <div className="space-y-1.5">
                  {daySessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between pl-5.5">
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`inline-flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}><LogIn className="w-3 h-3" />{formatTime(s.login_at)}</span>
                        {s.logout_at ? (
                          <span className={`inline-flex items-center gap-1 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}><LogOut className="w-3 h-3" />{formatTime(s.logout_at)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-500"><Circle className="w-2 h-2 fill-emerald-500" />Still online</span>
                        )}
                      </div>
                      <span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{formatDuration(s.login_at, s.logout_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function LeadsHandlingModal({ member, memberLeads, isDark, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className={`relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Leads handled by {member.name}</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{memberLeads.length} lead{memberLeads.length === 1 ? '' : 's'} currently assigned</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}>
            <X className="w-5 h-5" />
          </motion.button>
        </div>
        {memberLeads.length === 0 ? (
          <p className={`text-sm text-center py-8 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No leads assigned to this member yet.</p>
        ) : (
          <div className="space-y-2">
            {memberLeads.map((lead) => (
              <div key={lead.id} className={`flex items-center justify-between rounded-xl p-3 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.name}</p>
                  <p className={`text-xs truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.course}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isDark ? 'bg-dark-700 text-dark-300' : 'bg-dark-100 text-dark-600'}`}>{lead.status}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function TeamActivity() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { isAdmin } = useAuth()
  const { teamMembers, leads } = useData()

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [leadsMember, setLeadsMember] = useState(null)

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return }
    supabase.from('user_sessions').select('*').order('login_at', { ascending: false }).then(({ data, error }) => {
      if (error) console.error('user_sessions error', error)
      setSessions(data || [])
      setLoading(false)
    })
  }, [isAdmin])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const rows = useMemo(() => {
    return teamMembers.map((member) => {
      const memberSessions = sessions.filter((s) => s.user_id === member.id)
      const latest = memberSessions.sort((a, b) => new Date(b.login_at) - new Date(a.login_at))[0]
      const isOnline = memberSessions.some((s) => !s.logout_at)
      const lastLogout = memberSessions.filter((s) => s.logout_at).sort((a, b) => new Date(b.logout_at) - new Date(a.logout_at))[0]
      const leadCount = leads.filter((l) => l.assigned_to === member.id).length
      return { member, latest, isOnline, lastLogout, sessionCount: memberSessions.length, leadCount }
    }).sort((a, b) => (b.latest?.login_at || '').localeCompare(a.latest?.login_at || ''))
  }, [teamMembers, sessions, leads])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: teamMembers.length,
      online: rows.filter((r) => r.isOnline).length,
      loginsToday: sessions.filter((s) => s.login_at?.slice(0, 10) === today).length,
    }
  }, [teamMembers, rows, sessions])

  if (!isAdmin) {
    return (
      <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
        <ShieldAlert className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Admins only</p>
        <p className={`text-xs mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Team login activity is restricted to administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Team Activity</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Login/logout history and lead ownership per team member</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Team Members', value: stats.total, icon: Users, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
          { label: 'Online Now', value: stats.online, icon: Circle, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
          { label: 'Logins Today', value: stats.loginsToday, icon: LogIn, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl p-5 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon size={22} className={stat.color} /></div>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl overflow-hidden ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                {['User', 'Role', 'Status', 'Last Login', 'Last Logout', 'Leads Handling', ''].map((h) => (
                  <th key={h} className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
              {loading ? (
                <tr><td colSpan={7} className={`px-4 py-10 text-center text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Loading...</td></tr>
              ) : rows.map(({ member, latest, isOnline, lastLogout, sessionCount, leadCount }) => (
                <tr key={member.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-primary-500 to-accent-500`}>
                        {member.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{member.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                    <span className="inline-flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{roleLabels[member.role] || member.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500"><Circle className="w-2 h-2 fill-emerald-500" />Online</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-dark-500' : 'text-dark-400'}`}><Circle className="w-2 h-2" />Offline</span>
                    )}
                  </td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{formatDateTime(latest?.login_at)}</td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{formatDateTime(lastLogout?.logout_at)}</td>
                  <td className={`px-4 py-3.5`}>
                    <button onClick={() => setLeadsMember(member)} disabled={leadCount === 0}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                        leadCount === 0
                          ? isDark ? 'bg-dark-800 text-dark-500' : 'bg-dark-100 text-dark-400'
                          : isDark ? 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                      }`}>
                      <UserCheck className="w-3 h-3" />{leadCount} lead{leadCount === 1 ? '' : 's'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={() => setSelectedMember(member)} disabled={sessionCount === 0}
                      className={`inline-flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>
                      <Calendar className="w-3.5 h-3.5" />{sessionCount} session{sessionCount === 1 ? '' : 's'}<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <div className={`px-6 py-12 text-center ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No team members yet</p>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedMember && (
          <SessionHistoryModal member={selectedMember} sessions={sessions} isDark={isDark} onClose={() => setSelectedMember(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leadsMember && (
          <LeadsHandlingModal member={leadsMember} memberLeads={leads.filter((l) => l.assigned_to === leadsMember.id)} isDark={isDark} onClose={() => setLeadsMember(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
