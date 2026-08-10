import { useState, useMemo, useEffect } from 'react'
import {
  Users, User, ClipboardCheck, GraduationCap, CalendarCheck, CheckSquare,
  Activity, Layers, TrendingUp, Calendar, Loader2, AlertCircle,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { supabase } from '../../lib/supabase'
import { calculateEmployeeProductivity, calculateTeamProductivity, TRAINER_ACTIVITY_METRICS } from '../../lib/productivity'

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
  return { from: todayStr, to: todayStr }
}

const METRIC_DEFS = [
  { key: 'classesConducted', label: 'Classes Conducted', icon: CalendarCheck, color: 'text-primary-500', bgLight: 'bg-primary-50', bgDark: 'bg-primary-500/10' },
  { key: 'studentsHandled', label: 'Students Handled', icon: GraduationCap, color: 'text-sky-500', bgLight: 'bg-sky-50', bgDark: 'bg-sky-500/10' },
  { key: 'attendanceMarked', label: 'Attendance Marked', icon: ClipboardCheck, color: 'text-emerald-500', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-500/10' },
  { key: 'academicTasksCompleted', label: 'Assignments / Tasks Completed', icon: CheckSquare, color: 'text-violet-500', bgLight: 'bg-violet-50', bgDark: 'bg-violet-500/10' },
  { key: 'batchActivities', label: 'Batch Activities', icon: Layers, color: 'text-amber-500', bgLight: 'bg-amber-50', bgDark: 'bg-amber-500/10' },
  { key: 'courseProgress', label: 'Course Progress', icon: TrendingUp, color: 'text-indigo-500', bgLight: 'bg-indigo-50', bgDark: 'bg-indigo-500/10' },
  { key: 'overallActivity', label: 'Overall Activity', icon: Activity, color: 'text-rose-500', bgLight: 'bg-rose-50', bgDark: 'bg-rose-500/10' },
]

// Team table only needs the columns the brief asked for; Individual View
// below shows the full metric set including Batch Activities/Course
// Progress.
const TABLE_METRICS = ['classesConducted', 'studentsHandled', 'attendanceMarked', 'academicTasksCompleted', 'overallActivity']

function formatMetric(metric) {
  if (!metric || metric.missing || metric.value == null) return '—'
  return metric.value
}

// Trainer Productivity — same engine as Sales Productivity
// (lib/productivity.js), different bucket. "Overall Activity" is a
// documented, equal-weighted sum (see TRAINER_ACTIVITY_METRICS in the
// engine) — not an invented score. Change that one constant to change
// what counts toward it; nothing here recomputes its own formula.
export default function TrainerProductivity({ isDark }) {
  const { leads, followUps, students, invoices, installments, leadNotes, studentNotes, emailMessages, attendance, staffAttendance, batches } = useData()

  const [viewMode, setViewMode] = useState('team')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [period, setPeriod] = useState('Today')
  const [customFrom, setCustomFrom] = useState(todayStr)
  const [customTo, setCustomTo] = useState(todayStr)

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

  // A trainer is whoever instructs at least one batch — the role column
  // has no "trainer" value (see productivity.js), so this is derived from
  // real data, not from profiles.role.
  const trainers = useMemo(() => profiles.filter((p) => batches.some((b) => b.instructor_id === p.id)), [profiles, batches])

  useEffect(() => {
    if (!selectedEmployeeId && trainers.length) setSelectedEmployeeId(trainers[0].id)
  }, [trainers, selectedEmployeeId])

  const { from, to } = useMemo(() => resolvePeriod(period, customFrom, customTo), [period, customFrom, customTo])

  const data = useMemo(() => ({
    leads, followUps, students, invoices, installments, leadNotes, studentNotes, emailMessages, attendance, staffAttendance, batches, profiles,
  }), [leads, followUps, students, invoices, installments, leadNotes, studentNotes, emailMessages, attendance, staffAttendance, batches, profiles])

  const individualResult = useMemo(
    () => (selectedEmployeeId ? calculateEmployeeProductivity(selectedEmployeeId, data, { from, to }) : null),
    [selectedEmployeeId, data, from, to]
  )

  const teamResults = useMemo(
    () => calculateTeamProductivity(data, { employeeIds: trainers.map((r) => r.id), from, to }),
    [data, trainers, from, to]
  )

  const teamTotals = useMemo(() => {
    const totals = { classesConducted: 0, studentsHandled: 0, attendanceMarked: 0, overallActivity: 0 }
    teamResults.forEach((r) => {
      if (!r.trainer) return
      Object.keys(totals).forEach((k) => { if (!r.trainer[k].missing) totals[k] += r.trainer[k].value || 0 })
    })
    return totals
  }, [teamResults])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const inputCls = `px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
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

        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'individual' && (
            <select value={selectedEmployeeId || ''} onChange={(e) => setSelectedEmployeeId(e.target.value)} className={inputCls}>
              {trainers.length === 0 && <option value="">No trainers</option>}
              {trainers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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

      <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
        Overall Activity = {TRAINER_ACTIVITY_METRICS.join(' + ')} for the selected range — an equal-weighted count, not a 0–100 score.
      </p>

      {loadError && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />Couldn&apos;t load staff data. Try refreshing the page.
        </div>
      )}

      {profilesLoading ? (
        <div className={`rounded-2xl p-10 text-center text-sm flex items-center justify-center gap-2 ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          <Loader2 className="w-4 h-4 animate-spin" />Loading...
        </div>
      ) : trainers.length === 0 ? (
        <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          No trainers yet — a team member becomes one by being set as a batch's instructor.
        </div>
      ) : viewMode === 'individual' ? (
        individualResult?.trainer ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRIC_DEFS.map((m) => (
              <div key={m.key} className={`rounded-2xl p-4 ${cardClass}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{m.label}</p>
                    <p className={`font-bold mt-0.5 ${individualResult.trainer[m.key].missing ? 'text-xs' : 'text-xl'} ${isDark ? 'text-white' : 'text-dark-900'}`}>
                      {individualResult.trainer[m.key].missing ? individualResult.trainer[m.key].reason : formatMetric(individualResult.trainer[m.key])}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? m.bgDark : m.bgLight}`}><m.icon size={18} className={m.color} /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-2xl p-10 text-center text-sm ${cardClass} ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
            This employee has no Trainer Productivity data — they don&apos;t instruct any batch.
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Classes Conducted', value: teamTotals.classesConducted, icon: CalendarCheck, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
              { label: 'Students Handled', value: teamTotals.studentsHandled, icon: GraduationCap, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
              { label: 'Attendance Marked', value: teamTotals.attendanceMarked, icon: ClipboardCheck, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
              { label: 'Overall Activity', value: teamTotals.overallActivity, icon: Activity, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
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
                    {['Trainer', 'Department', 'Classes', 'Students', 'Attendance', 'Tasks', 'Overall Activity'].map((h) => (
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
                      <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{r.employee.department || '—'}</td>
                      {TABLE_METRICS.map((key) => (
                        <td key={key} className={`px-4 py-3 whitespace-nowrap ${r.trainer[key].missing ? (isDark ? 'text-dark-600 text-xs italic' : 'text-dark-300 text-xs italic') : isDark ? 'text-dark-200' : 'text-dark-700'}`}
                          title={r.trainer[key].missing ? r.trainer[key].reason : r.trainer[key].source}>
                          {r.trainer[key].missing ? r.trainer[key].reason : formatMetric(r.trainer[key])}
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
