import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Shield, Circle, LogIn, LogOut, Calendar, Clock,
  UserCheck, GraduationCap, ShieldAlert, Users, Activity,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

// Tailwind can't see dynamically-built class strings like `bg-${color}-500`
// at build time and would purge them, so status colors are pre-baked as
// full class strings instead of assembled at render time.
const statusBadgeClasses = {
  dark: {
    new: 'bg-sky-500/15 text-sky-400', contacted: 'bg-accent-500/15 text-accent-400', qualified: 'bg-emerald-500/15 text-emerald-400',
    negotiation: 'bg-violet-500/15 text-violet-400', enrolled: 'bg-primary-500/15 text-primary-400', lost: 'bg-rose-500/15 text-rose-400',
  },
  light: {
    new: 'bg-sky-50 text-sky-600', contacted: 'bg-accent-50 text-accent-600', qualified: 'bg-emerald-50 text-emerald-600',
    negotiation: 'bg-violet-50 text-violet-600', enrolled: 'bg-primary-50 text-primary-600', lost: 'bg-rose-50 text-rose-600',
  },
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

export default function TeamMemberDetail() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { isAdmin } = useAuth()
  const { teamMembers, leads } = useData()

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const member = teamMembers.find((m) => m.id === memberId)

  useEffect(() => {
    if (!isAdmin || !memberId) { setLoading(false); return }
    supabase.from('user_sessions').select('*').eq('user_id', memberId).order('login_at', { ascending: false }).then(({ data, error }) => {
      if (error) console.error('user_sessions error', error)
      setSessions(data || [])
      setLoading(false)
    })
  }, [isAdmin, memberId])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const memberLeads = useMemo(() => leads.filter((l) => l.assigned_to === memberId), [leads, memberId])
  const isOnline = sessions.some((s) => !s.logout_at)

  const byDay = useMemo(() => {
    const map = new Map()
    for (const s of sessions) {
      const day = s.login_at.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day).push(s)
    }
    return [...map.entries()]
  }, [sessions])

  const leadStats = useMemo(() => {
    const enrolled = memberLeads.filter((l) => l.status === 'enrolled').length
    const lost = memberLeads.filter((l) => l.status === 'lost').length
    const active = memberLeads.length - enrolled - lost
    return { enrolled, lost, active }
  }, [memberLeads])

  if (!isAdmin) {
    return (
      <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
        <ShieldAlert className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Admins only</p>
      </div>
    )
  }

  if (!loading && !member) {
    return (
      <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
        <Users className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Team member not found</p>
        <button onClick={() => navigate('/team-activity')} className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-400">
          <ArrowLeft className="w-4 h-4" />Back to Team Activity
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/team-activity')}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
        <ArrowLeft className="w-4 h-4" />Back to Team Activity
      </motion.button>

      {member && (
        <>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-6 ${cardClass}`}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br from-primary-500 to-accent-500">
                  {member.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${isDark ? 'border-dark-900' : 'border-white'} ${isOnline ? 'bg-emerald-500' : 'bg-dark-400'}`} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{member.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-dark-800 text-dark-300' : 'bg-dark-100 text-dark-600'}`}>
                    <Shield className="w-3 h-3" />{roleLabels[member.role] || member.role}
                  </span>
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500"><Circle className="w-2 h-2 fill-emerald-500" />Online now</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDark ? 'text-dark-500' : 'text-dark-400'}`}><Circle className="w-2 h-2" />Offline</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Days Logged', value: byDay.length, icon: Calendar, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
              { label: 'Total Sessions', value: sessions.length, icon: Activity, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
              { label: 'Leads Handling', value: memberLeads.length, icon: UserCheck, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
              { label: 'Enrolled', value: leadStats.enrolled, icon: GraduationCap, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
              { label: 'Lost', value: leadStats.lost, icon: Users, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl p-4 ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
                    <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon size={18} className={stat.color} /></div>
                </div>
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardClass}`}>
              <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                <Calendar className="w-4 h-4" />Login Activity
              </h3>
              {loading ? (
                <p className={`text-sm text-center py-8 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Loading...</p>
              ) : byDay.length === 0 ? (
                <p className={`text-sm text-center py-8 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No sessions recorded yet.</p>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {byDay.map(([day, daySessions]) => (
                    <div key={day} className={`rounded-xl p-3.5 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{formatDayLabel(day)}</p>
                      <div className="space-y-1.5">
                        {daySessions.map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`inline-flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}><LogIn className="w-3 h-3" />{formatTime(s.login_at)}</span>
                              {s.logout_at ? (
                                <span className={`inline-flex items-center gap-1 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}><LogOut className="w-3 h-3" />{formatTime(s.logout_at)}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-500"><Circle className="w-2 h-2 fill-emerald-500" />Still online</span>
                              )}
                            </div>
                            <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}><Clock className="w-3 h-3" />{formatDuration(s.login_at, s.logout_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Leads Handling */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardClass}`}>
              <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                <UserCheck className="w-4 h-4" />Leads Handling ({memberLeads.length})
              </h3>
              {memberLeads.length === 0 ? (
                <p className={`text-sm text-center py-8 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No leads assigned to this member yet.</p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {memberLeads.map((lead) => {
                    const badgeCls = (isDark ? statusBadgeClasses.dark : statusBadgeClasses.light)[lead.status] || (isDark ? statusBadgeClasses.dark.new : statusBadgeClasses.light.new)
                    return (
                      <button key={lead.id} onClick={() => navigate('/leads', { state: { openLeadId: lead.id } })}
                        className={`w-full text-left flex items-center justify-between rounded-xl p-3 transition-colors ${isDark ? 'bg-dark-800/60 hover:bg-dark-800' : 'bg-dark-50 hover:bg-dark-100'}`}>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.name}</p>
                          <p className={`text-xs truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.course} &middot; {lead.source}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badgeCls}`}>{lead.status}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
