import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Target, GraduationCap, UserX, ShieldAlert, CheckCircle2,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

export default function TeamPerformance({ embedded = false }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { isAdmin } = useAuth()
  const { teamMembers, leads, followUps } = useData()

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  // A follow-up has no rep of its own — it only carries the lead's name —
  // so "completed by this rep" is resolved through whichever lead the
  // follow-up belongs to and who that lead is assigned to.
  const leadAssigneeByName = useMemo(() => {
    const map = new Map()
    leads.forEach((l) => map.set(l.name, l.assigned_to))
    return map
  }, [leads])

  // Real, derived-from-data metrics only. No calls/missed/talk-time here —
  // this CRM has no telephony integration, so those numbers would just be
  // fabricated. Everything below comes straight from the leads/follow_ups tables.
  const rows = useMemo(() => {
    return teamMembers.map((member) => {
      const memberLeads = leads.filter((l) => l.assigned_to === member.id)
      const byStatus = (status) => memberLeads.filter((l) => l.status === status).length
      const notAttempted = byStatus('new')
      const contacted = byStatus('contacted')
      const qualified = byStatus('qualified')
      const negotiation = byStatus('negotiation')
      const enrolled = byStatus('enrolled')
      const lost = byStatus('lost')
      const total = memberLeads.length
      const conversionRate = total > 0 ? Math.round((enrolled / total) * 100) : 0
      const followUpsCompleted = followUps.filter((f) => f.status === 'completed' && leadAssigneeByName.get(f.lead) === member.id).length
      return { member, total, notAttempted, contacted, qualified, negotiation, enrolled, lost, conversionRate, followUpsCompleted }
    }).sort((a, b) => b.total - a.total)
  }, [teamMembers, leads, followUps, leadAssigneeByName])

  const teamTotals = useMemo(() => rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    enrolled: acc.enrolled + r.enrolled,
    lost: acc.lost + r.lost,
    followUpsCompleted: acc.followUpsCompleted + r.followUpsCompleted,
  }), { total: 0, enrolled: 0, lost: 0, followUpsCompleted: 0 }), [rows])

  if (!isAdmin) {
    return (
      <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
        <ShieldAlert className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Admins only</p>
        <p className={`text-xs mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Team performance is restricted to administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Team Performance</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Lead volume and conversion per team member</p>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Team Leads', value: teamTotals.total, icon: Users, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
          { label: 'Team Enrolled', value: teamTotals.enrolled, icon: GraduationCap, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
          { label: 'Team Lost', value: teamTotals.lost, icon: UserX, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
          { label: 'Follow-ups Completed', value: teamTotals.followUpsCompleted, icon: CheckCircle2, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
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
                {['Agent', 'Role', 'Total Assigned', 'Not Attempted', 'Contacted', 'Qualified', 'Negotiation', 'Enrolled', 'Lost', 'Follow-ups Done', 'Conversion'].map((h) => (
                  <th key={h} className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
              {rows.map(({ member, total, notAttempted, contacted, qualified, negotiation, enrolled, lost, conversionRate, followUpsCompleted }) => (
                <tr key={member.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-primary-500 to-accent-500">
                        {member.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className={`font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-dark-900'}`}>{member.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3.5 whitespace-nowrap ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{roleLabels[member.role] || member.role}</td>
                  <td className={`px-4 py-3.5 font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{total}</td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{notAttempted}</td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-accent-400' : 'text-accent-600'}`}>{contacted}</td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{qualified}</td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{negotiation}</td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{enrolled}</td>
                  <td className={`px-4 py-3.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{lost}</td>
                  <td className={`px-4 py-3.5 font-medium ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>{followUpsCompleted}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${conversionRate}%` }} />
                      </div>
                      <span className={`text-xs font-semibold ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{conversionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className={`px-6 py-12 text-center ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No team members yet</p>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-4 flex items-start gap-3 ${cardClass}`}>
        <div className={`p-2 rounded-lg shrink-0 ${isDark ? 'bg-sky-500/10' : 'bg-sky-50'}`}>
          <Target className={`w-4 h-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
        </div>
        <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
          This shows real lead volume, conversion, and follow-ups completed per agent, all derived from actual lead assignment, status, and follow-up records. Call-level metrics (calls made, missed calls, talk-time) aren't shown because this CRM has no phone/telephony integration to measure them — adding those would mean showing fabricated numbers.
        </p>
      </motion.div>
    </div>
  )
}
