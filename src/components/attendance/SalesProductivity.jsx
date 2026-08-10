import { useState, useMemo, useEffect } from 'react'
import {
  Users, User, PhoneCall, Clock3, UserCheck, CheckCircle2,
  ClipboardCheck, GraduationCap, IndianRupee, TrendingUp, Calendar, Loader2, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { supabase } from '../../lib/supabase'
import { calculateEmployeeProductivity, calculateTeamProductivity } from '../../lib/productivity'
import { getProductivityScope } from '../../lib/permissions'

const todayStr = new Date().toISOString().slice(0, 10)
const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

const PERIODS = ['Today', 'This Week', 'This Month', 'Custom Range']

function resolvePeriod(period, customFrom, customTo) {
  const today = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  if (period === 'This Week') {
    const day = today.getDay() === 0 ? 7 : today.getDay()
    const monday = new Date(today); monday.setDate(monday.getDate() - (day - 1))
    return { from: iso(monday), to: todayStr }
  }
  if (period === 'This Month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: iso(first), to: todayStr }
  }
  if (period === 'Custom Range') return { from: customFrom || todayStr, to: customTo || todayStr }
  return { from: todayStr, to: todayStr } // Today
}

const METRIC_DEFS = [
  { key: 'leadsContacted', label: 'Leads Contacted', icon: UserCheck, color: 'text-sky-500', bgLight: 'bg-sky-50', bgDark: 'bg-sky-500/10' },
  { key: 'callsMade', label: 'Calls Made', icon: PhoneCall, color: 'text-primary-500', bgLight: 'bg-primary-50', bgDark: 'bg-primary-500/10' },
  { key: 'connectedCalls', label: 'Connected Calls', icon: PhoneCall, color: 'text-emerald-500', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-500/10' },
  { key: 'talkTime', label: 'Talk Time', icon: Clock3, color: 'text-amber-500', bgLight: 'bg-amber-50', bgDark: 'bg-amber-500/10' },
  { key: 'followUpsCompleted', label: 'Follow-ups Completed', icon: CheckCircle2, color: 'text-violet-500', bgLight: 'bg-violet-50', bgDark: 'bg-violet-500/10' },
  { key: 'tasksCompleted', label: 'Tasks Completed', icon: ClipboardCheck, color: 'text-indigo-500', bgLight: 'bg-indigo-50', bgDark: 'bg-indigo-500/10' },
  { key: 'admissions', label: 'Admissions', icon: GraduationCap, color: 'text-emerald-500', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-500/10' },
  { key: 'revenue', label: 'Revenue Generated', icon: IndianRupee, color: 'text-emerald-500', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-500/10' },
  { key: 'conversionRate', label: 'Conversion Rate', icon: TrendingUp, color: 'text-primary-500', bgLight: 'bg-primary-50', bgDark: 'bg-primary-500/10' },
]

function formatMetric(key, metric) {
  if (!metric || metric.missing) return 'Telephony integration required'
  if (metric.value == null) return '—'
  if (key === 'revenue') return `₹${metric.value.toLocaleString('en-IN')}`
  if (key === 'conversionRate') return `${metric.value}%`
  return metric.value
}

// Sales Productivity — reads calculateEmployeeProductivity/
// calculateTeamProductivity from lib/productivity.js, which derive every
// number from real CRM tables (see that file's header for the full
// source inventory). Nothing here is entered by hand or cached — every
// render recomputes straight from useData(), so any CRM activity change
// (a follow-up marked complete, a payment recorded, a lead reassigned)
// is reflected the next time this renders, with no separate refresh step.
export default function SalesProductivity({ isDark }) {
  const { profile } = useAuth()
  const { leads, followUps, students, invoices, installments, leadNotes, studentNotes, emailMessages, attendance, staffAttendance, batches } = useData()
  // 'all' (admin) and 'team' (manager) behave identically here — both can
  // browse/switch between every employee. 'own' (sales) locks the view to
  // themselves: no Team View, no employee picker. See lib/permissions.js.
  const scope = getProductivityScope(profile)

  const [viewMode, setViewMode] = useState(scope === 'own' ? 'individual' : 'team')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(scope === 'own' ? profile?.id : null)
  const [period, setPeriod] = useState('Today')
  const [customFrom, setCustomFrom] = useState(todayStr)
  const [customTo, setCustomTo] = useState(todayStr)

  // DataContext's shared teamMembers only carries id/name/role — the same
  // gap already worked around in Staff Attendance and Login Activity.
  const [profiles, setProfiles] = useState([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    supabase.from('profiles').select('*').order('name', { ascending: true }).then(({ data, error }) => {
      setProfilesLoading(false)
      if (error) { console.error('profiles error', error); setLoadError(true); return }
      setProfiles(data || [])
    })
  }, [])

  const salesReps = useMemo(() => profiles.filter((p) => p.role === 'sales' || p.role === 'manager'), [profiles])

  useEffect(() => {
    if (scope === 'own') { setSelectedEmployeeId(profile?.id); return }
    if (!selectedEmployeeId && salesReps.length) setSelectedEmployeeId(salesReps[0].id)
  }, [salesReps, selectedEmployeeId, scope, profile])

  const { from, to } = useMemo(() => resolvePeriod(period, customFrom, customTo), [period, customFrom, customTo])

  const data = useMemo(() => ({
    leads, followUps, students, invoices, installments, leadNotes, studentNotes, emailMessages, attendance, staffAttendance, batches, profiles,
  }), [leads, followUps, students, invoices, installments, leadNotes, studentNotes, emailMessages, attendance, staffAttendance, batches, profiles])

  const individualResult = useMemo(
    () => (selectedEmployeeId ? calculateEmployeeProductivity(selectedEmployeeId, data, { from, to }) : null),
    [selectedEmployeeId, data, from, to]
  )

  const teamResults = useMemo(
    () => calculateTeamProductivity(data, { employeeIds: salesReps.map((r) => r.id), from, to }),
    [data, salesReps, from, to]
  )

  const teamTotals = useMemo(() => {
    const totals = { leadsContacted: 0, followUpsCompleted: 0, tasksCompleted: 0, admissions: 0, revenue: 0 }
    teamResults.forEach((r) => {
      if (!r.sales) return
      Object.keys(totals).forEach((k) => { if (!r.sales[k].missing) totals[k] += r.sales[k].value || 0 })
    })
    return totals
  }, [teamResults])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const inputCls = `px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
        {scope === 'own' ? (
          <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Showing your own productivity</p>
        ) : (
          <div className={`flex items-center rounded-xl p-1 w-fit ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
            <button onClick={() => setViewMode('individual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'individual' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
              <User className="w-4 h-4" />Individual View
            </button>
            <button onClick={() => setViewMode('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'team' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
              <Users className="w-4 h-4" />Team View
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'individual' && scope !== 'own' && (
            <select value={selectedEmployeeId || ''} onChange={(e) => setSelectedEmployeeId(e.target.value)} className={inputCls}>
              {salesReps.length === 0 && <option value="">No sales staff</option>}
              {salesReps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <div className={`flex items-center rounded-xl p-1 ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
                {p === 'Today' ? "Today's" : p === 'This Week' ? 'Weekly' : p === 'This Month' ? 'Monthly' : 'Custom'}
              </button>
            ))}
          </div>
          {period === 'Custom Range' && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className={isDark ? 'text-dark-500' : 'text-dark-400'} />
              <input type="date" value={customFrom} max={customTo || todayStr} onChange={(e) => setCustomFrom(e.target.value)}
                className={`px-2.5 py-2 rounded-lg text-xs border ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
              <span className={isDark ? 'text-dark-500' : 'text-dark-400'}>to</span>
              <input type="date" value={customTo} min={customFrom} max={todayStr} onChange={(e) => setCustomTo(e.target.value)}
                className={`px-2.5 py-2 rounded-lg text-xs border ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
            </div>
          )}
        </div>
      </div>

      {loadError && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />Couldn&apos;t load staff data. Try refreshing the page.
        </div>
      )}

      {profilesLoading ? (
        <div className={`rounded-2xl p-10 text-center text-sm flex items-center justify-center gap-2 ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          <Loader2 className="w-4 h-4 animate-spin" />Loading...
        </div>
      ) : salesReps.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          No sales staff yet.
        </div>
      ) : viewMode === 'individual' ? (
        individualResult?.sales ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {METRIC_DEFS.map((m) => (
              <div key={m.key} className={`rounded-2xl p-4 ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{m.label}</p>
                    <p className={`font-bold mt-0.5 ${individualResult.sales[m.key].missing ? 'text-xs' : 'text-xl'} ${isDark ? 'text-white' : 'text-dark-900'}`}>
                      {formatMetric(m.key, individualResult.sales[m.key])}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? m.bgDark : m.bgLight}`}><m.icon size={18} className={m.color} /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
            This employee has no Sales Productivity data — they aren&apos;t in a sales/manager role.
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Leads Contacted', value: teamTotals.leadsContacted, icon: UserCheck, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
              { label: 'Follow-ups Completed', value: teamTotals.followUpsCompleted, icon: CheckCircle2, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
              { label: 'Tasks Completed', value: teamTotals.tasksCompleted, icon: ClipboardCheck, color: 'text-indigo-500', bg: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50' },
              { label: 'Admissions', value: teamTotals.admissions, icon: GraduationCap, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
              { label: 'Revenue Generated', value: `₹${teamTotals.revenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
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

          <div className={`rounded-2xl overflow-hidden ${cardClass}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                    {['Employee', ...METRIC_DEFS.map((m) => m.label)].map((h) => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                  {teamResults.map((r) => (
                    <tr key={r.employee.id} className={isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{r.employee.name}</p>
                        <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{roleLabels[r.employee.role] || r.employee.role}</p>
                      </td>
                      {METRIC_DEFS.map((m) => (
                        <td key={m.key} className={`px-4 py-3 whitespace-nowrap ${r.sales[m.key].missing ? (isDark ? 'text-dark-600 text-xs italic' : 'text-dark-300 text-xs italic') : isDark ? 'text-dark-200' : 'text-dark-700'}`}>
                          {formatMetric(m.key, r.sales[m.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
