import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, ChevronDown, ChevronRight, GraduationCap, Users, UserCheck, UserX,
  AlarmClock, ClipboardCheck, Target, LogIn, PhoneCall, CheckCircle2, TrendingUp, Clock3,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { supabase } from '../../lib/supabase'

const todayStr = new Date().toISOString().slice(0, 10)

function pctFor(present, total) {
  return total > 0 ? Math.round((present / total) * 100) : null
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// This module's date filter always resolves to a real [from, to] pair — no
// range ever silently falls back to "everything" or "nothing".
const RANGE_OPTIONS = ['Today', 'Yesterday', 'This Week', 'This Month', 'Custom Range']

function resolveRange(range, customFrom, customTo) {
  const today = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  if (range === 'Yesterday') {
    const y = new Date(today); y.setDate(y.getDate() - 1)
    return { from: iso(y), to: iso(y) }
  }
  if (range === 'This Week') {
    const day = today.getDay() === 0 ? 7 : today.getDay() // Monday-start week
    const monday = new Date(today); monday.setDate(monday.getDate() - (day - 1))
    return { from: iso(monday), to: todayStr }
  }
  if (range === 'This Month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: iso(first), to: todayStr }
  }
  if (range === 'Custom Range') {
    return { from: customFrom || todayStr, to: customTo || todayStr }
  }
  return { from: todayStr, to: todayStr } // Today
}

function KpiCard({ label, value, sub, icon: Icon, color, bg, isDark }) {
  return (
    <div className={`rounded-2xl p-4 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className={`text-xs font-medium truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{label}</p>
          <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{value}</p>
          {sub && <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${bg}`}><Icon size={18} className={color} /></div>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, isDark, children, action }) {
  return (
    <div className={`rounded-2xl p-5 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
          <Icon className="w-4 h-4" />{title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ isDark, children }) {
  return <div className={`rounded-xl p-8 text-center text-sm ${isDark ? 'bg-dark-800/50 text-dark-500' : 'bg-dark-50 text-dark-400'}`}>{children}</div>
}

function DateFilter({ isDark, range, setRange, customFrom, setCustomFrom, customTo, setCustomTo }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${isDark ? 'bg-dark-800 text-dark-200 border border-dark-700 hover:bg-dark-700' : 'bg-white text-dark-700 border border-dark-200 hover:bg-dark-50'}`}>
          <Calendar className="w-4 h-4 opacity-60" />{range}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </button>
        {open && (
          <div className={`absolute right-0 mt-1 w-44 rounded-xl border shadow-xl py-1 z-30 ${isDark ? 'bg-dark-900 border-dark-700' : 'bg-white border-dark-200'}`}>
            {RANGE_OPTIONS.map((r) => (
              <button key={r} onClick={() => { setRange(r); setOpen(false) }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${range === r ? 'text-primary-500 font-medium' : isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'}`}>
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
      {range === 'Custom Range' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} max={customTo || todayStr}
            onChange={(e) => setCustomFrom(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
          <span className={isDark ? 'text-dark-500' : 'text-dark-400'}>to</span>
          <input type="date" value={customTo} min={customFrom} max={todayStr}
            onChange={(e) => setCustomTo(e.target.value)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
        </div>
      )}
    </div>
  )
}

export default function AttendanceOverview({ onNavigateTab, isDark }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { attendance, staffAttendance, batches, students, teamMembers, leads, followUps } = useData()

  const [range, setRange] = useState('Today')
  const [customFrom, setCustomFrom] = useState(todayStr)
  const [customTo, setCustomTo] = useState(todayStr)
  const { from, to } = useMemo(() => resolveRange(range, customFrom, customTo), [range, customFrom, customTo])

  // Average working hours needs raw login/logout timestamps, which only
  // live in user_sessions — DataContext doesn't carry that table, so it's
  // fetched the same way Team Activity / Team Performance already do.
  const [todaySessions, setTodaySessions] = useState([])
  useEffect(() => {
    if (!isAdmin) return
    supabase.from('user_sessions').select('user_id,login_at,logout_at')
      .gte('login_at', `${todayStr}T00:00:00`).lte('login_at', `${todayStr}T23:59:59`)
      .then(({ data, error }) => { if (error) console.error('user_sessions error', error); else setTodaySessions(data || []) })
  }, [isAdmin])

  // ── Today's KPI row — always "today", independent of the filter above,
  // since these cards are literally titled "Today's Overview".
  const studentAttToday = useMemo(() => attendance.filter((a) => a.date === todayStr), [attendance])
  const staffAttToday = useMemo(() => staffAttendance.filter((a) => a.date === todayStr), [staffAttendance])
  const presentStudentsToday = studentAttToday.filter((a) => a.status === 'present').length
  const absentStudentsToday = studentAttToday.filter((a) => a.status === 'absent').length
  const presentStaffToday = staffAttToday.filter((a) => a.status === 'present').length
  const absentStaffToday = staffAttToday.filter((a) => a.status === 'absent').length
  const studentPctToday = pctFor(presentStudentsToday, studentAttToday.length)
  const staffPctToday = pctFor(presentStaffToday, staffAttToday.length)

  const kpis = [
    { label: 'Student Attendance', value: studentPctToday != null ? `${studentPctToday}%` : '—', sub: `${presentStudentsToday} of ${students.length} students`, icon: GraduationCap, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
    { label: 'Staff Attendance', value: staffPctToday != null ? `${staffPctToday}%` : '—', sub: `${presentStaffToday} of ${teamMembers.length} staff`, icon: Users, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
    { label: 'Present Today', value: presentStudentsToday + presentStaffToday, sub: 'Students + staff', icon: UserCheck, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
    { label: 'Absent Today', value: absentStudentsToday + absentStaffToday, sub: 'Students + staff', icon: UserX, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
    { label: 'Late Today', value: 0, sub: 'Late marking not tracked yet', icon: AlarmClock, color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
  ]

  // ── Batch-wise student attendance, summed over the selected range. Total
  // is the current roster size (a fact about the batch); Present/Absent are
  // the count of marks in the range, so they read as "12 total, 10 marked
  // present" for a single day and as a period total once a wider range is
  // picked (the % stays meaningful either way: present marks / total marks).
  const batchRows = useMemo(() => batches.map((b) => {
    const roster = students.filter((s) => s.batch_id === b.id)
    const rangeAtt = attendance.filter((a) => a.batch_id === b.id && a.date >= from && a.date <= to)
    const present = rangeAtt.filter((a) => a.status === 'present').length
    const absent = rangeAtt.filter((a) => a.status === 'absent').length
    return { batch: b, total: roster.length, present, absent, late: 0, pct: pctFor(present, present + absent) }
  }), [batches, students, attendance, from, to])

  // ── Staff attendance summary for the range
  const staffRangeAtt = useMemo(() => staffAttendance.filter((a) => a.date >= from && a.date <= to), [staffAttendance, from, to])
  const staffPresent = staffRangeAtt.filter((a) => a.status === 'present').length
  const staffAbsent = staffRangeAtt.filter((a) => a.status === 'absent').length
  const staffLeave = staffRangeAtt.filter((a) => a.status === 'leave').length

  const avgWorkingHours = useMemo(() => {
    if (!todaySessions.length) return null
    const now = Date.now()
    const totalMs = todaySessions.reduce((sum, s) => sum + (new Date(s.logout_at || now) - new Date(s.login_at)), 0)
    return (totalMs / todaySessions.length / 3600000).toFixed(1)
  }, [todaySessions])

  // ── Productivity summary — only real, existing data. No call metrics
  // (no telephony integration) and no separate "tasks" entity — follow-ups
  // are the closest existing equivalent, so that's what's shown.
  const leadsContacted = useMemo(
    () => leads.filter((l) => l.status !== 'new' && l.date >= from && l.date <= to).length,
    [leads, from, to]
  )
  const followUpsCompleted = useMemo(
    () => followUps.filter((f) => f.status === 'completed' && f.date >= from && f.date <= to).length,
    [followUps, from, to]
  )
  const admissions = useMemo(
    () => students.filter((s) => s.enrollDate && s.enrollDate >= from && s.enrollDate <= to).length,
    [students, from, to]
  )
  const hasProductivityActivity = leadsContacted > 0 || followUpsCompleted > 0 || admissions > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className={`text-sm max-w-xl ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
          Attendance, employee activity, and productivity insights for BIX Academy — all in one place.
        </p>
        <DateFilter isDark={isDark} range={range} setRange={setRange} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
      </div>

      {/* Today's KPI cards */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Today&apos;s Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map((k) => <KpiCard key={k.label} {...k} isDark={isDark} />)}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => onNavigateTab('students')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors">
          <GraduationCap className="w-4 h-4" />Mark Student Attendance
        </button>
        <button onClick={() => onNavigateTab('staff')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-dark-800 text-dark-200 hover:bg-dark-700' : 'bg-dark-100 text-dark-700 hover:bg-dark-200'}`}>
          <Users className="w-4 h-4" />Mark Staff Attendance
        </button>
        <button onClick={() => navigate('/reports')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-dark-800 text-dark-200 hover:bg-dark-700' : 'bg-dark-100 text-dark-700 hover:bg-dark-200'}`}>
          <ClipboardCheck className="w-4 h-4" />View Attendance Report
        </button>
        {isAdmin && (
          <button onClick={() => onNavigateTab('productivity')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-dark-800 text-dark-200 hover:bg-dark-700' : 'bg-dark-100 text-dark-700 hover:bg-dark-200'}`}>
            <Target className="w-4 h-4" />View Productivity
          </button>
        )}
      </div>

      {/* Student Attendance Summary */}
      <SectionCard title={`Student Attendance — ${range}`} icon={GraduationCap} isDark={isDark}>
        {batches.length === 0 ? (
          <EmptyRow isDark={isDark}>No batches yet.</EmptyRow>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                  {['Batch', 'Course', 'Total', 'Present', 'Absent', 'Late', 'Attendance %', ''].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                {batchRows.map(({ batch, total, present, absent, late, pct }) => (
                  <tr key={batch.id} onClick={() => navigate(`/batches/${batch.id}`)}
                    className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}`}>
                    <td className={`px-4 py-3 font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-dark-900'}`}>{batch.name}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{batch.course}</td>
                    <td className={`px-4 py-3 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{total}</td>
                    <td className="px-4 py-3 text-emerald-500 font-medium">{present}</td>
                    <td className="px-4 py-3 text-rose-500 font-medium">{absent}</td>
                    <td className={`px-4 py-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{late}</td>
                    <td className="px-4 py-3">
                      {pct != null ? (
                        <span className={`font-semibold ${pct >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>{pct}%</span>
                      ) : (
                        <span className={isDark ? 'text-dark-500' : 'text-dark-400'}>No records</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className={`w-4 h-4 inline ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Staff Attendance Summary */}
      <SectionCard title={`Staff Attendance — ${range}`} icon={Users} isDark={isDark}>
        {teamMembers.length === 0 ? (
          <EmptyRow isDark={isDark}>No staff members yet.</EmptyRow>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div><p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Total Staff</p><p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{teamMembers.length}</p></div>
            <div><p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Present</p><p className="text-lg font-bold text-emerald-500">{staffPresent}</p></div>
            <div><p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Absent</p><p className="text-lg font-bold text-rose-500">{staffAbsent}</p></div>
            <div><p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Late</p><p className={`text-lg font-bold ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>0</p></div>
            <div>
              <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}><Clock3 className="w-3 h-3" />Avg. Hours Today</p>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{isAdmin ? (avgWorkingHours != null ? `${avgWorkingHours}h` : '—') : '—'}</p>
            </div>
          </div>
        )}
        {staffLeave > 0 && (
          <p className={`text-xs mt-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{staffLeave} on approved leave in this period</p>
        )}
      </SectionCard>

      {/* Productivity Summary — admin only, matching the existing Productivity tab's access level */}
      {isAdmin && (
        <SectionCard title={`Productivity — ${range}`} icon={TrendingUp} isDark={isDark}
          action={<span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{formatDate(from)} – {formatDate(to)}</span>}>
          {!hasProductivityActivity ? (
            <EmptyRow isDark={isDark}>No productivity activity recorded in this period.</EmptyRow>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                <div className="flex items-center gap-2 mb-1"><PhoneCall className="w-4 h-4 text-sky-500" /><span className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Leads Contacted</span></div>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{leadsContacted}</p>
              </div>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Follow-ups Completed</span></div>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{followUpsCompleted}</p>
              </div>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                <div className="flex items-center gap-2 mb-1"><GraduationCap className="w-4 h-4 text-primary-500" /><span className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Admissions</span></div>
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{admissions}</p>
              </div>
            </div>
          )}
          <p className={`text-xs mt-4 flex items-center gap-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
            <LogIn className="w-3 h-3" />Calls and task-level metrics aren't shown — this CRM has no telephony integration and no separate task entity yet.
          </p>
        </SectionCard>
      )}
    </div>
  )
}
