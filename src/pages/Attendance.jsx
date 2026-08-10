import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LayoutGrid, GraduationCap, Users, LogIn, Target, IndianRupee, Presentation } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import AttendanceOverview from '../components/attendance/AttendanceOverview'
import StudentAttendanceTable from '../components/attendance/StudentAttendanceTable'
import StaffAttendanceList from '../components/attendance/StaffAttendanceList'
import LoginActivityList from '../components/attendance/LoginActivityList'
import SalesProductivity from '../components/attendance/SalesProductivity'
import TrainerProductivity from '../components/attendance/TrainerProductivity'

export default function Attendance() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { isAdmin } = useAuth()
  const location = useLocation()
  // Dashboard KPI cards (and anything else) can deep-link straight into a
  // tab — e.g. navigate('/attendance', { state: { tab: 'staff' } }) —
  // reusing the same location.state convention already used across this
  // app (Leads' openAddLeadModal, Students' openStudentId, etc.) instead
  // of inventing a new routing mechanism.
  const [tab, setTab] = useState(location.state?.tab || 'overview')
  const [productivityView, setProductivityView] = useState(location.state?.productivityView || 'sales')

  // Employee login/logout tracking, work activity, and productivity reports
  // used to live as three separate top-level modules (Team Activity, Team
  // Performance) alongside Attendance. They're all "who's doing what, when"
  // for the same team, so they're tabs of one module now instead of three
  // separate sidebar entries.
  //
  // Productivity is visible to everyone now (not just admins) — non-admins
  // just get an "own numbers only" view inside it (see
  // lib/permissions.js:getProductivityScope), same real roles, no new
  // permission system. Login Activity stays admin-only: RLS on
  // user_sessions only bypasses "own rows only" for role='admin', so
  // showing this tab to anyone else would just render an empty/wrong list.
  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'students', label: 'Student Attendance', icon: GraduationCap },
    { key: 'staff', label: 'Staff Attendance', icon: Users },
    { key: 'productivity', label: 'Productivity', icon: Target },
    ...(isAdmin ? [{ key: 'login', label: 'Login Activity', icon: LogIn }] : []),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-dark-900'}`}>Attendance &amp; Productivity</h1>
        <p className={`mt-1 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Attendance, login activity, and team productivity in one place</p>
      </div>

      <div className={`flex items-center rounded-xl p-1 w-fit flex-wrap ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AttendanceOverview onNavigateTab={setTab} isDark={isDark} />}
      {tab === 'students' && <StudentAttendanceTable isDark={isDark} />}
      {tab === 'staff' && <StaffAttendanceList isDark={isDark} />}
      {tab === 'login' && isAdmin && <LoginActivityList isDark={isDark} />}

      {tab === 'productivity' && (
        <div className="space-y-5">
          <div className={`flex items-center rounded-xl p-1 w-fit ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
            <button onClick={() => setProductivityView('sales')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${productivityView === 'sales' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
              <IndianRupee className="w-4 h-4" />Sales
            </button>
            <button onClick={() => setProductivityView('trainer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${productivityView === 'trainer' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
              <Presentation className="w-4 h-4" />Trainer
            </button>
          </div>
          {productivityView === 'sales' ? <SalesProductivity isDark={isDark} /> : <TrainerProductivity isDark={isDark} />}
        </div>
      )}
    </div>
  )
}
