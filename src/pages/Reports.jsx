import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Users, Target, Wallet, ChevronDown, Download,
  FileText, DollarSign, Filter, UserCheck, CalendarCheck,
  ArrowUpRight, ArrowDownRight, Sparkles, Layers, FileSpreadsheet,
  FileType2, AlertCircle, X, ClipboardCheck,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'

const REPORT_COURSE_OPTIONS = [
  'Full Stack Development', 'Data Science & AI', 'UI/UX Design', 'Digital Marketing',
  'Cloud Computing', 'Cybersecurity', 'Mobile App Development', 'DevOps Engineering', 'Python Programming',
]

const LEAD_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' },
]

const STUDENT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const BATCH_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
]

const FEE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'paid', label: 'Fully Paid' },
  { value: 'due', label: 'Pending Dues' },
]

const STUDENT_ATTENDANCE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
]

const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const REPORT_TYPES = [
  { key: 'leads', label: 'Leads', icon: Filter },
  { key: 'students', label: 'Students', icon: UserCheck },
  { key: 'batches', label: 'Batches', icon: Layers },
  { key: 'fees', label: 'Fees & Billing', icon: DollarSign },
  { key: 'student_attendance', label: 'Student Attendance', icon: ClipboardCheck },
  { key: 'attendance', label: 'Team Attendance', icon: CalendarCheck },
  { key: 'performance', label: 'Sales Activity', icon: TrendingUp },
  { key: 'funnel', label: 'Sales Funnel', icon: Target },
]

// Stage progression a lead can be tracked through — excludes "Lost" since
// that's a terminal outcome, not a forward funnel stage.
const FUNNEL_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'enrolled', label: 'Enrolled' },
]

function inReportDateRange(dateStr, from, to) {
  if (!from && !to) return true
  if (!dateStr) return false
  const d = dateStr.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

function formatDuration(ms) {
  if (ms < 0) return '—'
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function exportReportCSV(filename, columns, rows) {
  const csv = [columns.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportReportExcel(filename, sheetName, columns, rows) {
  const ws = XLSX.utils.aoa_to_sheet([columns, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, filename)
}

function exportReportPDF(filename, title, columns, rows) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text(title, 40, 40)
  doc.setFontSize(9)
  doc.setTextColor(130)
  doc.text(`Generated ${new Date().toLocaleString('en-IN')} · ${rows.length} record${rows.length === 1 ? '' : 's'}`, 40, 56)
  autoTable(doc, {
    head: [columns],
    body: rows.map((r) => r.map((v) => String(v ?? ''))),
    startY: 68,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241] },
    margin: { left: 40, right: 40 },
  })
  doc.save(filename)
}

// --- Date range helpers ---

const RANGE_DAYS = {
  'Last 7 Days': 7,
  'Last 30 Days': 30,
  'Last 3 Months': 90,
  'Last 6 Months': 180,
}

function getRangeDayCount(rangeLabel) {
  if (rangeLabel === 'This Year') {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    return Math.floor((now - start) / 86400000) + 1
  }
  return RANGE_DAYS[rangeLabel] || 30
}

function getDateBounds(rangeLabel) {
  const days = getRangeDayCount(rangeLabel)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)
  start.setHours(0, 0, 0, 0)
  return { start, end, days }
}

function getPreviousDateBounds(start, days) {
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  prevEnd.setHours(23, 59, 59, 999)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  prevStart.setHours(0, 0, 0, 0)
  return { start: prevStart, end: prevEnd }
}

function isInRange(dateStr, start, end) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  return d >= start && d <= end
}

function getLastNMonthBuckets(n) {
  const now = new Date()
  const buckets = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString('en-IN', { month: 'short' }) })
  }
  return buckets
}

const LEAD_SOURCE_COLORS = {
  Website: '#6366f1',
  'Google Ads': '#f59e0b',
  Referral: '#10b981',
  Instagram: '#ec4899',
  LinkedIn: '#0ea5e9',
  Facebook: '#3b82f6',
  WhatsApp: '#22c55e',
  'Walk-in': '#8b5cf6',
  Other: '#64748b',
}
// Any lead.source value outside this known set (e.g. stray data from a CSV import)
// gets bucketed under "Other" instead of polluting the chart with raw junk values.
const KNOWN_LEAD_SOURCES = new Set(['Website', 'Google Ads', 'Referral', 'Instagram', 'LinkedIn', 'Facebook', 'WhatsApp', 'Walk-in'])

// --- Animation variants ---

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// --- Custom tooltip ---

function CustomTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className={`rounded-xl px-4 py-3 shadow-lg border text-sm ${
        theme === 'dark'
          ? 'bg-dark-800 border-dark-700 text-dark-100'
          : 'bg-white border-dark-200 text-dark-800'
      }`}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {typeof entry.value === 'number' && entry.value >= 1000
            ? `Rs. ${entry.value.toLocaleString('en-IN')}`
            : entry.value}
        </p>
      ))}
    </div>
  )
}

// --- Mini sparkline component ---

function MiniSparkline({ data, color }) {
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// --- Glass card wrapper ---

function GlassCard({ children, className = '', theme }) {
  return (
    <div
      className={`rounded-2xl p-6 ${
        theme === 'dark'
          ? 'bg-dark-900 border border-dark-700/60'
          : 'bg-white border border-dark-200/60 shadow-sm'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// --- Main component ---

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { theme } = useTheme()
  const { students, leads, invoices, installments, batches, teamMembers, followUps, leadActivities, attendance } = useData()
  const [dateRange, setDateRange] = useState('Last 30 Days')
  const [showDateMenu, setShowDateMenu] = useState(false)
  const [notification, setNotification] = useState(null)
  const dateMenuRef = useRef(null)

  const showToast = (msg, type = 'success') => setNotification({ message: msg, type })

  // ── Report Builder state ──────────────────────────────────
  const [reportType, setReportType] = useState('leads')
  const [rbDateFrom, setRbDateFrom] = useState('')
  const [rbDateTo, setRbDateTo] = useState('')
  const [rbCourse, setRbCourse] = useState('all')
  const [rbBatch, setRbBatch] = useState('all')
  const [rbStatus, setRbStatus] = useState('all')
  const [rbPriority, setRbPriority] = useState('all')
  const [rbUser, setRbUser] = useState('all')
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    supabase.from('user_sessions').select('*').order('login_at', { ascending: false }).then(({ data, error }) => {
      if (error) { console.error('user_sessions error', error); return }
      setSessions(data || [])
    })
  }, [])

  // Filters reset to a safe default whenever the report type changes, since
  // e.g. a "Priority" or "Batch" filter from Leads doesn't mean anything on
  // a Batches report and would silently produce an always-empty result.
  useEffect(() => {
    setRbStatus('all'); setRbCourse('all'); setRbBatch('all'); setRbPriority('all'); setRbUser('all')
  }, [reportType])

  const builtReport = useMemo(() => {
    if (reportType === 'leads') {
      const rows = leads.filter((l) =>
        inReportDateRange(l.date, rbDateFrom, rbDateTo) &&
        (rbCourse === 'all' || l.course === rbCourse) &&
        (rbStatus === 'all' || l.status === rbStatus) &&
        (rbPriority === 'all' || l.priority === rbPriority)
      )
      return {
        title: 'Leads Report',
        columns: ['Name', 'Email', 'Phone', 'Course', 'Source', 'Status', 'Priority', 'Assigned To', 'Date'],
        rows: rows.map((l) => [
          l.name, l.email, l.phone, l.course, l.source,
          LEAD_STATUS_FILTER_OPTIONS.find((o) => o.value === l.status)?.label || l.status,
          l.priority ? l.priority.charAt(0).toUpperCase() + l.priority.slice(1) : '—',
          teamMembers.find((m) => m.id === l.assigned_to)?.name || 'Unassigned',
          l.date || '—',
        ]),
      }
    }
    if (reportType === 'students') {
      const rows = students.filter((s) =>
        inReportDateRange(s.enrollDate, rbDateFrom, rbDateTo) &&
        (rbCourse === 'all' || s.course === rbCourse) &&
        (rbBatch === 'all' || String(s.batch_id) === rbBatch) &&
        (rbStatus === 'all' || s.status === rbStatus)
      )
      return {
        title: 'Students Report',
        columns: ['Name', 'Email', 'Phone', 'Course', 'Batch', 'Enroll Date', 'Status', 'Fee Paid', 'Fee Total', 'Balance'],
        rows: rows.map((s) => [
          s.name, s.email, s.phone, s.course, s.batch || 'Unassigned', s.enrollDate || '—',
          s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : '—',
          s.feePaid || 0, s.feeTotal || 0, Math.max((s.feeTotal || 0) - (s.feePaid || 0), 0),
        ]),
      }
    }
    if (reportType === 'batches') {
      const rows = batches.filter((b) =>
        inReportDateRange(b.start_date, rbDateFrom, rbDateTo) &&
        (rbCourse === 'all' || b.course === rbCourse) &&
        (rbStatus === 'all' || b.status === rbStatus)
      )
      return {
        title: 'Batches Report',
        columns: ['Batch Name', 'Course', 'Instructor', 'Start Date', 'End Date', 'Schedule', 'Enrolled', 'Capacity', 'Status'],
        rows: rows.map((b) => {
          const enrolled = students.filter((s) => s.batch_id === b.id).length
          const instructor = teamMembers.find((m) => m.id === b.instructor_id)?.name || 'Unassigned'
          const days = b.schedule_days?.length ? b.schedule_days.join(', ') : null
          const time = b.start_time && b.end_time ? `${b.start_time} - ${b.end_time}` : null
          const schedule = [days, time].filter(Boolean).join(' · ') || 'Not set'
          return [
            b.name, b.course, instructor, b.start_date || '—', b.end_date || '—', schedule,
            enrolled, b.capacity, BATCH_STATUS_FILTER_OPTIONS.find((o) => o.value === b.status)?.label || b.status,
          ]
        }),
      }
    }
    if (reportType === 'fees') {
      const rows = invoices.filter((inv) =>
        inReportDateRange(inv.date, rbDateFrom, rbDateTo) &&
        (rbCourse === 'all' || inv.course === rbCourse) &&
        (rbStatus === 'all' || (rbStatus === 'paid' ? inv.status === 'paid' : inv.status !== 'paid'))
      )
      return {
        title: 'Fees & Billing Report',
        columns: ['Invoice ID', 'Student', 'Course', 'Amount', 'Paid', 'Balance', 'Status', 'Plan', 'Invoice Date', 'Due Date'],
        rows: rows.map((inv) => {
          const invInstallments = installments.filter((i) => i.invoice_id === inv.id)
          const plan = invInstallments.length
            ? `${invInstallments.filter((i) => i.status === 'paid').length}/${invInstallments.length} installments paid`
            : 'Full Payment'
          return [
            inv.id, inv.student, inv.course, inv.amount || 0, inv.paid || 0, inv.balance || 0,
            inv.status === 'paid' ? 'Fully Paid' : 'Due', plan, inv.date || '—', inv.dueDate || '—',
          ]
        }),
      }
    }
    if (reportType === 'performance') {
      const leadAssigneeByName = new Map(leads.map((l) => [l.name, l.assigned_to]))
      const members = rbUser === 'all' ? teamMembers : teamMembers.filter((m) => m.id === rbUser)
      const rows = members.map((member) => {
        const memberLeads = leads.filter((l) => l.assigned_to === member.id && inReportDateRange(l.date, rbDateFrom, rbDateTo))
        const byStatus = (status) => memberLeads.filter((l) => l.status === status).length
        const total = memberLeads.length
        const enrolled = byStatus('enrolled')
        const followUpsCompleted = followUps.filter((f) => f.status === 'completed' && leadAssigneeByName.get(f.lead) === member.id).length
        const conversionRate = total > 0 ? Math.round((enrolled / total) * 100) : 0
        return [
          member.name, member.role === 'admin' ? 'Administrator' : member.role === 'manager' ? 'Manager' : 'Sales Executive',
          total, byStatus('new'), byStatus('contacted'), byStatus('qualified'), byStatus('negotiation'), enrolled, byStatus('lost'),
          followUpsCompleted, `${conversionRate}%`,
        ]
      })
      return {
        title: 'Sales Activity Report',
        columns: ['Agent', 'Role', 'Total Assigned', 'Not Attempted', 'Contacted', 'Qualified', 'Negotiation', 'Enrolled', 'Lost', 'Follow-ups Completed', 'Conversion'],
        rows,
      }
    }
    if (reportType === 'funnel') {
      const rangeLeads = leads.filter((l) => inReportDateRange(l.date, rbDateFrom, rbDateTo))
      const stageIndex = Object.fromEntries(FUNNEL_STAGES.map((s, i) => [s.key, i]))
      const leadIds = new Set(rangeLeads.map((l) => l.id))
      const maxStageByLead = new Map(rangeLeads.map((l) => [l.id, stageIndex[l.status] ?? 0]))
      leadActivities.forEach((a) => {
        if (!leadIds.has(a.lead_id)) return
        const idx = stageIndex[a.to_status]
        if (idx == null) return
        if (idx > (maxStageByLead.get(a.lead_id) ?? 0)) maxStageByLead.set(a.lead_id, idx)
      })
      const reached = [...maxStageByLead.values()]
      let prevCount = null
      const rows = FUNNEL_STAGES.map((s, i) => {
        const count = reached.filter((v) => v >= i).length
        const dropPct = prevCount != null && prevCount > 0 ? `${Math.round((count / prevCount) * 100)}%` : '—'
        prevCount = count
        return [s.label, count, dropPct]
      })
      return {
        title: 'Sales Funnel Report',
        columns: ['Stage', 'Leads Reached', '% of Previous Stage'],
        rows,
      }
    }
    if (reportType === 'student_attendance') {
      const rows = attendance.filter((a) => {
        const student = students.find((s) => s.id === a.student_id)
        return inReportDateRange(a.date, rbDateFrom, rbDateTo) &&
          (rbCourse === 'all' || student?.course === rbCourse) &&
          (rbBatch === 'all' || String(a.batch_id) === rbBatch) &&
          (rbStatus === 'all' || a.status === rbStatus)
      })
      return {
        title: 'Student Attendance Report',
        columns: ['Student', 'Course', 'Batch', 'Date', 'Status', 'Marked By'],
        rows: rows.map((a) => {
          const student = students.find((s) => s.id === a.student_id)
          const batch = batches.find((b) => b.id === a.batch_id)
          return [
            student?.name || 'Unknown', student?.course || '—', batch?.name || 'Unassigned',
            a.date, a.status === 'present' ? 'Present' : 'Absent', a.marked_by_name || '—',
          ]
        }),
      }
    }
    // attendance (team login/logout)
    const rows = sessions.filter((s) =>
      inReportDateRange(s.login_at, rbDateFrom, rbDateTo) &&
      (rbUser === 'all' || s.user_id === rbUser)
    )
    return {
      title: 'Team Attendance Report',
      columns: ['Team Member', 'Login Date', 'Login Time', 'Logout Date', 'Logout Time', 'Duration'],
      rows: rows.map((s) => {
        const name = teamMembers.find((m) => m.id === s.user_id)?.name || 'Unknown'
        const loginD = new Date(s.login_at)
        const logoutD = s.logout_at ? new Date(s.logout_at) : null
        return [
          name,
          loginD.toLocaleDateString('en-IN'),
          loginD.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          logoutD ? logoutD.toLocaleDateString('en-IN') : '—',
          logoutD ? logoutD.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Still logged in',
          logoutD ? formatDuration(logoutD - loginD) : '—',
        ]
      }),
    }
  }, [reportType, rbDateFrom, rbDateTo, rbCourse, rbBatch, rbStatus, rbPriority, rbUser, leads, students, batches, invoices, installments, teamMembers, sessions, followUps, leadActivities, attendance])

  const handleReportDownload = (format) => {
    const { title, columns, rows } = builtReport
    if (rows.length === 0) { showToast('No records match these filters', 'error'); return }
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp}`
    if (format === 'csv') exportReportCSV(`${base}.csv`, columns, rows)
    else if (format === 'excel') exportReportExcel(`${base}.xlsx`, title, columns, rows)
    else exportReportPDF(`${base}.pdf`, title, columns, rows)
    showToast(`${title} exported as ${format.toUpperCase()} — ${rows.length} record${rows.length === 1 ? '' : 's'}`)
  }

  useEffect(() => {
    function handleClick(e) {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) setShowDateMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isDark = theme === 'dark'
  const axisColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? '#334155' : '#e2e8f0'

  // ── Date range window + previous equivalent window ──────
  const { start: rangeStart, end: rangeEnd, days: rangeDays } = useMemo(
    () => getDateBounds(dateRange),
    [dateRange]
  )
  const { start: prevRangeStart, end: prevRangeEnd } = useMemo(
    () => getPreviousDateBounds(rangeStart, rangeDays),
    [rangeStart, rangeDays]
  )

  const invoicesInRange = useMemo(
    () => invoices.filter((inv) => isInRange(inv.date, rangeStart, rangeEnd)),
    [invoices, rangeStart, rangeEnd]
  )
  const invoicesInPrevRange = useMemo(
    () => invoices.filter((inv) => isInRange(inv.date, prevRangeStart, prevRangeEnd)),
    [invoices, prevRangeStart, prevRangeEnd]
  )
  const leadsInRange = useMemo(
    () => leads.filter((l) => isInRange(l.date, rangeStart, rangeEnd)),
    [leads, rangeStart, rangeEnd]
  )
  const studentsEnrolledInRange = useMemo(
    () => students.filter((s) => isInRange(s.enrollDate, rangeStart, rangeEnd)),
    [students, rangeStart, rangeEnd]
  )

  // ── KPI 1: Revenue Growth ────────────────────────────────
  const revenueInRange = invoicesInRange.reduce((sum, inv) => sum + (inv.paid || 0), 0)
  const revenueInPrevRange = invoicesInPrevRange.reduce((sum, inv) => sum + (inv.paid || 0), 0)
  const revenueGrowthPct = revenueInPrevRange > 0
    ? Math.round(((revenueInRange - revenueInPrevRange) / revenueInPrevRange) * 100 * 10) / 10
    : (revenueInRange > 0 ? 100 : 0)

  // ── KPI 2: Student Enrollment ─────────────────────────────
  const activeEnrolledInRange = studentsEnrolledInRange.filter((s) => s.status === 'active').length

  // ── KPI 3: Lead Conversion ────────────────────────────────
  const enrolledLeadsInRange = leadsInRange.filter((l) => l.status === 'enrolled').length
  const conversionPct = leadsInRange.length > 0
    ? Math.round((enrolledLeadsInRange / leadsInRange.length) * 100 * 10) / 10
    : 0

  // ── KPI 4: Fee Collection Rate ────────────────────────────
  const amountInRange = invoicesInRange.reduce((sum, inv) => sum + (inv.amount || 0), 0)
  const pendingInRange = amountInRange - revenueInRange
  const collectionRatePct = amountInRange > 0 ? Math.round((revenueInRange / amountInRange) * 100) : 0

  // ── Shared monthly bucketing (last 6 calendar months) — backs Revenue Trend,
  // Monthly Lead vs Enrollment, and every KPI sparkline, all from real data ──
  const monthlyMetrics = useMemo(() => {
    const buckets = getLastNMonthBuckets(6)
    const map = new Map(buckets.map((b) => [
      b.key,
      { month: b.month, revenue: 0, amount: 0, newStudents: 0, leadsCount: 0, enrolledCount: 0 },
    ]))
    invoices.forEach((inv) => {
      if (!inv.date) return
      const key = `${new Date(inv.date).getFullYear()}-${new Date(inv.date).getMonth()}`
      const bucket = map.get(key)
      if (!bucket) return
      bucket.revenue += inv.paid || 0
      bucket.amount += inv.amount || 0
    })
    students.forEach((s) => {
      if (!s.enrollDate) return
      const key = `${new Date(s.enrollDate).getFullYear()}-${new Date(s.enrollDate).getMonth()}`
      const bucket = map.get(key)
      if (bucket) bucket.newStudents += 1
    })
    leads.forEach((l) => {
      if (!l.date) return
      const key = `${new Date(l.date).getFullYear()}-${new Date(l.date).getMonth()}`
      const bucket = map.get(key)
      if (!bucket) return
      bucket.leadsCount += 1
      if (l.status === 'enrolled') bucket.enrolledCount += 1
    })
    return buckets.map((b) => map.get(b.key))
  }, [invoices, students, leads])

  // ── Revenue Trend chart ──
  const revenueTrendData = useMemo(
    () => monthlyMetrics.map((m) => ({ month: m.month, revenue: m.revenue, students: m.newStudents })),
    [monthlyMetrics]
  )
  const hasRevenueTrendData = revenueTrendData.some((d) => d.revenue > 0)

  // ── Monthly Lead vs Enrollment chart ──
  const monthlyLeadVsEnrollmentData = useMemo(
    () => monthlyMetrics.map((m) => ({ month: m.month, leads: m.leadsCount, enrollments: m.newStudents })),
    [monthlyMetrics]
  )

  // ── Sales Funnel — how many leads (in range) ever reached each stage ──
  // A lead's `status` is only its current stage, which would undercount a
  // Lost lead that genuinely passed through Contacted/Qualified before
  // falling out. The real activity log (lead_activities.to_status) already
  // records every stage a lead has actually been through, so the funnel is
  // built from the highest stage each lead reached historically, not just
  // where it sits today.
  const funnelData = useMemo(() => {
    const stageIndex = Object.fromEntries(FUNNEL_STAGES.map((s, i) => [s.key, i]))
    const leadIds = new Set(leadsInRange.map((l) => l.id))
    const maxStageByLead = new Map(leadsInRange.map((l) => [l.id, stageIndex[l.status] ?? 0]))
    leadActivities.forEach((a) => {
      if (!leadIds.has(a.lead_id)) return
      const idx = stageIndex[a.to_status]
      if (idx == null) return
      if (idx > (maxStageByLead.get(a.lead_id) ?? 0)) maxStageByLead.set(a.lead_id, idx)
    })
    const reached = [...maxStageByLead.values()]
    return FUNNEL_STAGES.map((s, i) => {
      const count = reached.filter((v) => v >= i).length
      return { stage: s.label, count }
    })
  }, [leadsInRange, leadActivities])
  const hasFunnelData = funnelData.some((f) => f.count > 0)

  // ── Per-KPI sparklines, derived from the same real monthly data ──
  const revenueSparkline = useMemo(() => monthlyMetrics.map((m) => ({ v: m.revenue })), [monthlyMetrics])
  const enrollmentSparkline = useMemo(() => monthlyMetrics.map((m) => ({ v: m.newStudents })), [monthlyMetrics])
  const conversionSparkline = useMemo(
    () => monthlyMetrics.map((m) => ({ v: m.leadsCount > 0 ? Math.round((m.enrolledCount / m.leadsCount) * 100) : 0 })),
    [monthlyMetrics]
  )
  const collectionSparkline = useMemo(
    () => monthlyMetrics.map((m) => ({ v: m.amount > 0 ? Math.round((m.revenue / m.amount) * 100) : 0 })),
    [monthlyMetrics]
  )

  // ── Course-wise Enrollment (students enrolled per course, filtered by the selected range) ──
  const courseEnrollmentData = useMemo(() => {
    const counts = {}
    studentsEnrolledInRange.forEach((s) => {
      const course = s.course || 'Unknown'
      counts[course] = (counts[course] || 0) + 1
    })
    return Object.entries(counts)
      .map(([course, count]) => ({ course, students: count }))
      .sort((a, b) => b.students - a.students)
  }, [studentsEnrolledInRange])
  const hasCourseEnrollmentData = courseEnrollmentData.length > 0

  // ── Lead Sources Distribution (real leads, filtered by range; unknown/dirty
  // source values collapse into "Other" instead of fragmenting the chart) ──
  const leadSourceChartData = useMemo(() => {
    const counts = {}
    leadsInRange.forEach((l) => {
      const src = KNOWN_LEAD_SOURCES.has(l.source) ? l.source : 'Other'
      counts[src] = (counts[src] || 0) + 1
    })
    const total = leadsInRange.length
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        color: LEAD_SOURCE_COLORS[name],
      }))
      .sort((a, b) => b.value - a.value)
  }, [leadsInRange])

  const kpiCards = [
    {
      title: 'Revenue Growth',
      value: `${revenueGrowthPct >= 0 ? '+' : ''}${revenueGrowthPct}%`,
      sub: `Rs. ${revenueInRange.toLocaleString('en-IN')} collected`,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      sparkColor: '#10b981',
      sparklineData: revenueSparkline,
      trend: revenueGrowthPct >= 0 ? 'up' : 'down',
    },
    {
      title: 'Student Enrollment',
      value: `${activeEnrolledInRange} Active`,
      sub: `${studentsEnrolledInRange.length} enrolled in period`,
      icon: Users,
      color: 'text-primary-500',
      bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50',
      sparkColor: '#6366f1',
      sparklineData: enrollmentSparkline,
      trend: 'up',
    },
    {
      title: 'Lead Conversion',
      value: `${conversionPct}%`,
      sub: `${leadsInRange.length} leads in period`,
      icon: Target,
      color: 'text-accent-500',
      bg: isDark ? 'bg-accent-500/10' : 'bg-accent-50',
      sparkColor: '#f59e0b',
      sparklineData: conversionSparkline,
      trend: 'up',
    },
    {
      title: 'Fee Collection Rate',
      value: `${collectionRatePct}%`,
      sub: `Rs. ${pendingInRange.toLocaleString('en-IN')} pending`,
      icon: Wallet,
      color: 'text-rose-500',
      bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
      sparkColor: '#f43f5e',
      sparklineData: collectionSparkline,
      trend: 'up',
    },
  ]


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ============ Page Header ============ */}
      <motion.div
        variants={cardVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1
            className={`text-2xl font-bold ${
              isDark ? 'text-dark-50' : 'text-dark-900'
            }`}
          >
            Reports & Analytics
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            Comprehensive insights into your academy's performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="relative" ref={dateMenuRef}>
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-dark-800 text-dark-200 border border-dark-700 hover:bg-dark-700'
                  : 'bg-white text-dark-700 border border-dark-200 hover:bg-dark-50'
              }`}
            >
              {dateRange}
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            {showDateMenu && (
              <div className={`absolute right-0 mt-1 w-44 rounded-xl border shadow-xl py-1 z-30 ${isDark ? 'bg-dark-900 border-dark-700' : 'bg-white border-dark-200'}`}>
                {['Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last 6 Months', 'This Year'].map(range => (
                  <button key={range} onClick={() => { setDateRange(range); setShowDateMenu(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${dateRange === range ? 'text-primary-500 font-medium' : isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'}`}>
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const csv = 'Month,Revenue,Students\n' + revenueTrendData.map(d => `${d.month},${d.revenue},${d.students}`).join('\n')
              downloadCSV('bix-academy-report.csv', csv)
              showToast('Report downloaded')
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors border ${
              isDark
                ? 'border-primary-500/40 text-primary-400 hover:bg-primary-500/10'
                : 'border-primary-300 text-primary-600 hover:bg-primary-50'
            }`}
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </motion.div>

      {/* ============ Report Builder Section ============ */}
      <motion.div variants={cardVariants}>
        <GlassCard theme={theme}>
          <div className="mb-5">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
              Report Builder
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
              Pick a report type, filter it, then download as PDF, Excel or CSV — all three come from the exact same filtered data
            </p>
          </div>

          {/* Report type tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.key}
                onClick={() => setReportType(rt.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  reportType === rt.key
                    ? isDark ? 'border-primary-500 bg-primary-500/15 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                    : isDark ? 'border-dark-700 text-dark-400 hover:border-dark-600' : 'border-dark-200 text-dark-500 hover:border-dark-300'
                }`}
              >
                <rt.icon className="w-3.5 h-3.5" />{rt.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className={`rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
            <div>
              <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>From Date</label>
              <input type="date" value={rbDateFrom} onChange={(e) => setRbDateFrom(e.target.value)}
                className={`w-full px-2.5 py-2 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
            </div>
            <div>
              <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>To Date</label>
              <input type="date" value={rbDateTo} onChange={(e) => setRbDateTo(e.target.value)}
                className={`w-full px-2.5 py-2 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
            </div>

            {['leads', 'students', 'batches', 'fees', 'student_attendance'].includes(reportType) && (
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Course</label>
                <select value={rbCourse} onChange={(e) => setRbCourse(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-lg border text-xs outline-none cursor-pointer focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`}>
                  <option value="all">All Courses</option>
                  {REPORT_COURSE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {['students', 'student_attendance'].includes(reportType) && (
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Batch</label>
                <select value={rbBatch} onChange={(e) => setRbBatch(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-lg border text-xs outline-none cursor-pointer focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`}>
                  <option value="all">All Batches</option>
                  {batches.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
              </div>
            )}

            {reportType === 'leads' && (
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Priority</label>
                <select value={rbPriority} onChange={(e) => setRbPriority(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-lg border text-xs outline-none cursor-pointer focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`}>
                  {PRIORITY_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {['leads', 'students', 'batches', 'fees', 'student_attendance'].includes(reportType) && (
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Status</label>
                <select value={rbStatus} onChange={(e) => setRbStatus(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-lg border text-xs outline-none cursor-pointer focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`}>
                  {(reportType === 'leads' ? LEAD_STATUS_FILTER_OPTIONS
                    : reportType === 'students' ? STUDENT_STATUS_FILTER_OPTIONS
                    : reportType === 'batches' ? BATCH_STATUS_FILTER_OPTIONS
                    : reportType === 'student_attendance' ? STUDENT_ATTENDANCE_STATUS_FILTER_OPTIONS
                    : FEE_STATUS_FILTER_OPTIONS
                  ).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {(reportType === 'attendance' || reportType === 'performance') && (
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Team Member</label>
                <select value={rbUser} onChange={(e) => setRbUser(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-lg border text-xs outline-none cursor-pointer focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-dark-900 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`}>
                  <option value="all">All Team Members</option>
                  {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Preview + download */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              <span className={`font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>{builtReport.rows.length}</span> record{builtReport.rows.length === 1 ? '' : 's'} match{builtReport.rows.length === 1 ? 'es' : ''} the current filters
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleReportDownload('csv')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all border ${isDark ? 'border-dark-700 text-dark-200 hover:bg-dark-800' : 'border-dark-200 text-dark-700 hover:bg-dark-50'}`}>
                <FileType2 className="w-4 h-4" />CSV
              </button>
              <button onClick={() => handleReportDownload('excel')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all border ${isDark ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'}`}>
                <FileSpreadsheet className="w-4 h-4" />Excel
              </button>
              <button onClick={() => handleReportDownload('pdf')}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all">
                <FileText className="w-4 h-4" />PDF
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ============ KPI Summary Row ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <motion.div key={kpi.title} variants={cardVariants}>
            <GlassCard theme={theme}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                    {kpi.title}
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
                    {kpi.value}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {kpi.trend === 'up' ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      {kpi.sub}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <MiniSparkline data={kpi.sparklineData} color={kpi.sparkColor} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ============ Charts Grid (2x2) ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Revenue Trend (AreaChart) --- */}
        <motion.div variants={cardVariants}>
          <GlassCard theme={theme}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
                  Revenue Trend
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  Monthly revenue over the last 6 months
                </p>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-primary-500/10' : 'bg-primary-50'}`}>
                <TrendingUp className="w-5 h-5 text-primary-500" />
              </div>
            </div>
            <div className="h-72">
              {hasRevenueTrendData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={{ stroke: gridColor }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={`h-full flex items-center justify-center text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                  No revenue data yet
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* --- Lead Sources Distribution (PieChart donut) --- */}
        <motion.div variants={cardVariants}>
          <GlassCard theme={theme}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
                  Lead Sources Distribution
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  Where your leads are coming from
                </p>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-accent-500/10' : 'bg-accent-50'}`}>
                <Target className="w-5 h-5 text-accent-500" />
              </div>
            </div>
            <div className="h-72 relative">
              {leadSourceChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadSourceChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {leadSourceChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip theme={theme} />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className={`text-xs ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 36 }}>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
                        {leadsInRange.length}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                        Leads
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`h-full flex items-center justify-center text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                  No leads in this period
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* --- Course-wise Enrollment (Horizontal BarChart) --- */}
        <motion.div variants={cardVariants}>
          <GlassCard theme={theme}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
                  Course-wise Enrollment
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  Students enrolled per course in this period
                </p>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="h-72">
              {hasCourseEnrollmentData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={courseEnrollmentData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="course"
                      tick={{ fill: axisColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                    />
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                    <Bar
                      dataKey="students"
                      name="Students"
                      fill="url(#barGradient)"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={`h-full flex items-center justify-center text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                  No enrollments in this period
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* --- Monthly Lead vs Enrollment (LineChart) --- */}
        <motion.div variants={cardVariants}>
          <GlassCard theme={theme}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
                  Monthly Lead vs Enrollment
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  Comparing leads acquired to enrollments
                </p>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-sky-500/10' : 'bg-sky-50'}`}>
                <Sparkles className="w-5 h-5 text-sky-500" />
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyLeadVsEnrollmentData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridColor} opacity={0.4} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: axisColor, fontSize: 12 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip theme={theme} />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className={`text-xs ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enrollments"
                    name="Enrollments"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#ffffff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ============ Sales Funnel ============ */}
      <motion.div variants={cardVariants}>
        <GlassCard theme={theme}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
                Sales Funnel
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                How many leads (in this period) reached each stage, and the drop-off between stages
              </p>
            </div>
            <div className={`p-2 rounded-lg ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
              <Filter className="w-5 h-5 text-violet-500" />
            </div>
          </div>
          {hasFunnelData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
                    <defs>
                      <linearGradient id="funnelGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="stage" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<CustomTooltip theme={theme} />} />
                    <Bar dataKey="count" name="Leads" fill="url(#funnelGradient)" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {funnelData.map((f, i) => {
                  const prev = i > 0 ? funnelData[i - 1] : null
                  const dropPct = prev && prev.count > 0 ? Math.round((f.count / prev.count) * 100) : null
                  return (
                    <div key={f.stage} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                      <span className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{f.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{f.count}</span>
                        {dropPct !== null && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-dark-700 text-dark-400' : 'bg-dark-200 text-dark-500'}`}>
                            {dropPct}% of {prev.stage}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className={`h-40 flex items-center justify-center text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
              No leads in this period
            </div>
          )}
        </GlassCard>
      </motion.div>

      {notification && (
        <div className="fixed top-6 right-6 z-[100]">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
            notification.type === 'error'
              ? isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
              : isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
            ref={el => { if (el) setTimeout(() => setNotification(null), 3000) }}>
            {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            <span className="text-sm font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
