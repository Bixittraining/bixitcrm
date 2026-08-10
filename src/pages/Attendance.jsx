import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, GraduationCap, Users, ClipboardCheck, Calendar, LogIn, Target } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import AttendanceRegister from '../components/attendance/AttendanceRegister'
import AttendanceOverview from '../components/attendance/AttendanceOverview'
import StudentAttendanceTable from '../components/attendance/StudentAttendanceTable'
import TeamActivity from './TeamActivity'
import TeamPerformance from './TeamPerformance'

const todayStr = new Date().toISOString().slice(0, 10)
const todayLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function pctFor(records) {
  return records.length ? Math.round((records.filter((r) => r.status === 'present').length / records.length) * 100) : null
}

function StaffTab({ isDark }) {
  const { teamMembers, staffAttendance, markStaffAttendance } = useData()

  const dayAttendance = useMemo(
    () => staffAttendance.filter((a) => a.date === todayStr).map((a) => ({ ...a, personId: a.staff_id })),
    [staffAttendance]
  )

  const roster = teamMembers.map((m) => ({ id: m.id, name: m.name }))

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Team Attendance</p>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-dark-800 text-dark-200' : 'bg-dark-100 text-dark-700'}`}>
          <Calendar className="w-3.5 h-3.5" />{todayLabel} &middot; Today
        </span>
      </div>
      <AttendanceRegister
        roster={roster}
        records={dayAttendance}
        date={todayStr}
        onMark={(staffId, status) => markStaffAttendance(todayStr, [{ staffId, status }])}
        isDark={isDark}
        statusKeys={['present', 'absent', 'leave']}
        contextKey="staff"
      />
    </div>
  )
}

export default function Attendance() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { isAdmin } = useAuth()
  const { attendance, staffAttendance, batches, teamMembers } = useData()
  const [tab, setTab] = useState('overview')

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const studentPctOverall = pctFor(attendance)
  const staffPctOverall = pctFor(staffAttendance)
  const studentDaysRecorded = new Set(attendance.map((a) => a.date)).size
  const staffDaysRecorded = new Set(staffAttendance.map((a) => a.date)).size

  const stats = [
    { label: 'Student Attendance', value: studentPctOverall != null ? `${studentPctOverall}%` : '—', sub: studentDaysRecorded ? `${studentDaysRecorded} day${studentDaysRecorded === 1 ? '' : 's'} recorded` : 'No records yet', icon: GraduationCap, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
    { label: 'Staff Attendance', value: staffPctOverall != null ? `${staffPctOverall}%` : '—', sub: staffDaysRecorded ? `${staffDaysRecorded} day${staffDaysRecorded === 1 ? '' : 's'} recorded` : 'No records yet', icon: Users, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
    { label: 'Batches', value: batches.length, sub: 'Available to mark', icon: ClipboardCheck, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
    { label: 'Team Members', value: teamMembers.length, sub: 'Available to mark', icon: Users, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
  ]

  // Employee login/logout tracking, work activity, and productivity reports
  // used to live as three separate top-level modules (Team Activity, Team
  // Performance) alongside Attendance. They're all "who's doing what, when"
  // for the same team, so they're tabs of one module now instead of three
  // separate sidebar entries.
  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'students', label: 'Student Attendance', icon: GraduationCap },
    { key: 'staff', label: 'Staff Attendance', icon: Users },
    ...(isAdmin ? [
      { key: 'login', label: 'Login Activity', icon: LogIn },
      { key: 'productivity', label: 'Productivity', icon: Target },
    ] : []),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-dark-900'}`}>Attendance &amp; Productivity</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Attendance, login activity, and team productivity in one place</p>
      </div>

      {tab === 'staff' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-2xl p-4 ${cardClass}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{s.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{s.value}</p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{s.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${s.bg}`}><s.icon size={18} className={s.color} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`flex items-center rounded-xl p-1 w-fit flex-wrap ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'staff' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 ${cardClass}`}>
          <StaffTab isDark={isDark} />
        </motion.div>
      )}

      {tab === 'overview' && <AttendanceOverview onNavigateTab={setTab} isDark={isDark} />}
      {tab === 'students' && <StudentAttendanceTable isDark={isDark} />}
      {tab === 'login' && isAdmin && <TeamActivity embedded />}
      {tab === 'productivity' && isAdmin && <TeamPerformance embedded />}
    </div>
  )
}
