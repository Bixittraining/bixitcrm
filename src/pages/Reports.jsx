import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, Users, Target, Wallet, ChevronDown, Download,
  FileText, DollarSign, Filter, UserCheck, CalendarCheck,
  ArrowUpRight, ArrowDownRight, Sparkles,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { monthlyRevenueData, leadSourceData } from '../data/mockData'

// --- Mock data for charts ---

const courseEnrollmentData = [
  { course: 'Python', students: 60 },
  { course: 'Digital Mktg', students: 52 },
  { course: 'Full Stack', students: 45 },
  { course: 'Data Science', students: 38 },
  { course: 'Mobile Dev', students: 30 },
  { course: 'UI/UX', students: 28 },
  { course: 'Cloud', students: 22 },
  { course: 'Cyber', students: 18 },
  { course: 'DevOps', students: 15 },
]

const monthlyLeadVsEnrollment = [
  { month: 'Jan', leads: 42, enrollments: 18 },
  { month: 'Feb', leads: 55, enrollments: 24 },
  { month: 'Mar', leads: 48, enrollments: 20 },
  { month: 'Apr', leads: 70, enrollments: 32 },
  { month: 'May', leads: 62, enrollments: 28 },
  { month: 'Jun', leads: 38, enrollments: 15 },
]

const sparklineData = [
  { v: 40 }, { v: 55 }, { v: 48 }, { v: 62 }, { v: 58 }, { v: 72 }, { v: 68 }, { v: 80 },
]

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
  const { students, leads, invoices } = useData()
  const [dateRange, setDateRange] = useState('Last 30 Days')
  const [showDateMenu, setShowDateMenu] = useState(false)
  const [notification, setNotification] = useState(null)
  const dateMenuRef = useRef(null)

  const showToast = (msg) => setNotification({ message: msg, type: 'success' })

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

  const totalLeadSources = leadSourceData.reduce((sum, d) => sum + d.value, 0)

  const liveRevenue = invoices.reduce((sum, inv) => sum + (inv.paid || 0), 0)
  const liveActiveStudents = students.filter(s => s.status === 'active').length
  const liveEnrolled = leads.filter(l => l.status === 'enrolled').length
  const liveConversion = leads.length > 0 ? Math.round((liveEnrolled / leads.length) * 100 * 10) / 10 : 0
  const livePending = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0)

  const kpiCards = [
    {
      title: 'Revenue Growth',
      value: '+15.2%',
      sub: `Rs. ${liveRevenue.toLocaleString('en-IN')} collected`,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      sparkColor: '#10b981',
      trend: 'up',
    },
    {
      title: 'Student Enrollment',
      value: `${liveActiveStudents} Active`,
      sub: `${students.length} total students`,
      icon: Users,
      color: 'text-primary-500',
      bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50',
      sparkColor: '#6366f1',
      trend: 'up',
    },
    {
      title: 'Lead Conversion',
      value: `${liveConversion}%`,
      sub: `${leads.length} total leads`,
      icon: Target,
      color: 'text-accent-500',
      bg: isDark ? 'bg-accent-500/10' : 'bg-accent-50',
      sparkColor: '#f59e0b',
      trend: 'up',
    },
    {
      title: 'Fee Collection Rate',
      value: liveRevenue + livePending > 0 ? `${Math.round((liveRevenue / (liveRevenue + livePending)) * 100)}%` : '0%',
      sub: `Rs. ${livePending.toLocaleString('en-IN')} pending`,
      icon: Wallet,
      color: 'text-rose-500',
      bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
      sparkColor: '#f43f5e',
      trend: 'down',
    },
  ]

  const quickReports = [
    {
      title: 'Student Report',
      description: 'Comprehensive student data including attendance, grades, and enrollment history.',
      icon: UserCheck,
      color: 'text-primary-500',
      bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50',
      onGenerate: () => {
        const csv = 'Name,Email,Phone,Course,Batch,Enroll Date,Status,Fee Paid,Fee Total,Attendance\n' +
          students.map(s => `"${s.name}","${s.email}","${s.phone}","${s.course}","${s.batch}","${s.enrollDate}","${s.status}",${s.feePaid},${s.feeTotal},${s.attendance}%`).join('\n')
        downloadCSV('student-report.csv', csv)
        showToast('Student Report downloaded')
      },
    },
    {
      title: 'Financial Report',
      description: 'Detailed revenue, fee collection, pending payments, and financial projections.',
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      onGenerate: () => {
        const csv = 'Invoice ID,Student,Course,Amount,Paid,Balance,Date,Due Date,Status,Payment Mode\n' +
          invoices.map(inv => `"${inv.id}","${inv.student}","${inv.course}",${inv.amount},${inv.paid},${inv.balance},"${inv.date}","${inv.dueDate}","${inv.status}","${inv.paymentMode}"`).join('\n')
        downloadCSV('financial-report.csv', csv)
        showToast('Financial Report downloaded')
      },
    },
    {
      title: 'Lead Funnel Report',
      description: 'Lead acquisition, conversion rates, source performance, and pipeline analysis.',
      icon: Filter,
      color: 'text-accent-500',
      bg: isDark ? 'bg-accent-500/10' : 'bg-accent-50',
      onGenerate: () => {
        const csv = 'Name,Email,Phone,Course,Source,Status,Priority,Date,Notes\n' +
          leads.map(l => `"${l.name}","${l.email}","${l.phone}","${l.course}","${l.source}","${l.status}","${l.priority}","${l.date}","${l.notes}"`).join('\n')
        downloadCSV('lead-funnel-report.csv', csv)
        showToast('Lead Funnel Report downloaded')
      },
    },
    {
      title: 'Attendance Report',
      description: 'Daily and monthly attendance tracking, absentee alerts, and batch-wise stats.',
      icon: CalendarCheck,
      color: 'text-violet-500',
      bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
      onGenerate: () => {
        const csv = 'Name,Course,Batch,Attendance %,Status\n' +
          students.map(s => `"${s.name}","${s.course}","${s.batch}",${s.attendance}%,"${s.attendance >= 75 ? 'Good' : 'Low'}"`).join('\n')
        downloadCSV('attendance-report.csv', csv)
        showToast('Attendance Report downloaded')
      },
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
              const csv = 'Month,Revenue,Students\n' + monthlyRevenueData.map(d => `${d.month},${d.revenue},${d.students}`).join('\n')
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
                  <MiniSparkline data={sparklineData} color={kpi.sparkColor} />
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {leadSourceData.map((entry, index) => (
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
                    {totalLeadSources}%
                  </p>
                  <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                    Total
                  </p>
                </div>
              </div>
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
                  Current students per course
                </p>
              </div>
              <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="h-72">
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
                    width={85}
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
                <LineChart data={monthlyLeadVsEnrollment} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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

      {/* ============ Quick Reports Section ============ */}
      <motion.div variants={cardVariants}>
        <div className="mb-4">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-dark-50' : 'text-dark-900'}`}>
            Quick Reports
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            Generate and download detailed reports instantly
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickReports.map((report) => (
            <motion.div key={report.title} variants={cardVariants}>
              <GlassCard theme={theme} className="flex flex-col h-full">
                <div className={`p-3 rounded-xl w-fit ${report.bg}`}>
                  <report.icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <h3
                  className={`text-sm font-semibold mt-4 ${
                    isDark ? 'text-dark-100' : 'text-dark-800'
                  }`}
                >
                  {report.title}
                </h3>
                <p
                  className={`text-xs mt-1.5 leading-relaxed flex-1 ${
                    isDark ? 'text-dark-400' : 'text-dark-500'
                  }`}
                >
                  {report.description}
                </p>
                <button
                  onClick={report.onGenerate}
                  className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all w-full justify-center ${
                    isDark
                      ? 'bg-dark-800 text-dark-200 border border-dark-700 hover:bg-dark-700 hover:text-dark-50'
                      : 'bg-dark-50 text-dark-700 border border-dark-200 hover:bg-dark-100 hover:text-dark-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generate
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {notification && (
        <div className="fixed top-6 right-6 z-[100]">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
            ref={el => { if (el) setTimeout(() => setNotification(null), 3000) }}>
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
