import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Users, GraduationCap, IndianRupee, TrendingUp, TrendingDown, ArrowUpRight,
  UserPlus, CreditCard, Phone, BookOpen, CalendarPlus, Plus, ChevronRight
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import {
  monthlyRevenueData, leadSourceData, recentActivities
} from '../data/mockData'

// ---------- helpers ----------
const formatCurrency = (val) => {
  if (val >= 100000) return `Rs ${(val / 100000).toFixed(2)}L`
  if (val >= 1000) return `Rs ${(val / 1000).toFixed(1)}K`
  return `Rs ${val}`
}

const formatStatValue = (key, val) => {
  if (key === 'revenue') return formatCurrency(val)
  if (key === 'conversion') return `${val}%`
  return val.toLocaleString('en-IN')
}

// ---------- animated counter hook ----------
function useAnimatedCounter(target, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const startTime = performance.now()
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * target
      setCount(current)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return count
}

// ---------- animation variants ----------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

// ---------- KPI stat card ----------
function StatCard({ icon: Icon, label, value, valueKey, change, positive, color, theme }) {
  const animated = useAnimatedCounter(value)

  const colorMap = {
    primary: { bg: 'bg-primary-100', iconColor: 'text-primary-600', darkBg: 'bg-primary-900/40', darkIcon: 'text-primary-400' },
    emerald: { bg: 'bg-emerald-100', iconColor: 'text-emerald-600', darkBg: 'bg-emerald-700/30', darkIcon: 'text-emerald-400' },
    accent: { bg: 'bg-accent-100', iconColor: 'text-accent-600', darkBg: 'bg-accent-700/30', darkIcon: 'text-accent-400' },
    violet: { bg: 'bg-violet-100', iconColor: 'text-violet-600', darkBg: 'bg-violet-600/30', darkIcon: 'text-violet-400' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, boxShadow: theme === 'dark' ? '0 8px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.08)' }}
      className={`rounded-2xl p-6 transition-colors ${
        theme === 'dark'
          ? 'bg-dark-900 border border-dark-700/60'
          : 'bg-white border border-dark-200/60 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${theme === 'dark' ? c.darkBg : c.bg}`}>
          <Icon className={`w-6 h-6 ${theme === 'dark' ? c.darkIcon : c.iconColor}`} />
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
          positive
            ? theme === 'dark' ? 'bg-emerald-700/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            : theme === 'dark' ? 'bg-rose-600/20 text-rose-400' : 'bg-rose-50 text-rose-600'
        }`}>
          {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {change}
        </span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${
        theme === 'dark' ? 'text-dark-50' : 'text-dark-900'
      }`}>
        {formatStatValue(valueKey, Math.round(animated * 100) / 100)}
      </p>
      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-dark-400' : 'text-dark-500'}`}>{label}</p>
    </motion.div>
  )
}

// ---------- custom recharts tooltip ----------
function CustomTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null
  return (
    <div className={`px-4 py-3 rounded-xl border shadow-lg ${
      theme === 'dark'
        ? 'bg-dark-800 border-dark-700 text-dark-100'
        : 'bg-white border-dark-200 text-dark-800'
    }`}>
      <p className="text-sm font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm">
          <span className="text-primary-500 font-medium">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ---------- activity icon map ----------
const activityIconMap = {
  'user-plus': UserPlus,
  'credit-card': CreditCard,
  'graduation-cap': GraduationCap,
  'phone': Phone,
  'book-open': BookOpen,
}

const activityBorderColor = {
  lead: { light: 'border-l-primary-500', dark: 'border-l-primary-400' },
  payment: { light: 'border-l-emerald-500', dark: 'border-l-emerald-400' },
  enrollment: { light: 'border-l-accent-500', dark: 'border-l-accent-400' },
  followup: { light: 'border-l-sky-500', dark: 'border-l-sky-400' },
  course: { light: 'border-l-violet-500', dark: 'border-l-violet-400' },
}

const activityIconBg = {
  lead: { light: 'bg-primary-100 text-primary-600', dark: 'bg-primary-900/40 text-primary-400' },
  payment: { light: 'bg-emerald-100 text-emerald-600', dark: 'bg-emerald-700/30 text-emerald-400' },
  enrollment: { light: 'bg-accent-100 text-accent-600', dark: 'bg-accent-700/30 text-accent-400' },
  followup: { light: 'bg-sky-100 text-sky-600', dark: 'bg-sky-600/20 text-sky-400' },
  course: { light: 'bg-violet-100 text-violet-600', dark: 'bg-violet-600/20 text-violet-400' },
}

// ---------- pipeline data ----------
const pipelineStages = [
  { key: 'new', label: 'New', color: 'bg-primary-500' },
  { key: 'contacted', label: 'Contacted', color: 'bg-sky-500' },
  { key: 'qualified', label: 'Qualified', color: 'bg-accent-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-violet-500' },
  { key: 'enrolled', label: 'Enrolled', color: 'bg-emerald-500' },
]

// ---------- custom pie legend ----------
function CustomPieLegend({ payload, theme }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className={`text-xs font-medium ${theme === 'dark' ? 'text-dark-300' : 'text-dark-600'}`}>
            {entry.value} ({leadSourceData[i]?.value}%)
          </span>
        </div>
      ))}
    </div>
  )
}

// ========== MAIN COMPONENT ==========
export default function Dashboard() {
  const { theme } = useTheme()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { leads, students, invoices } = useData()

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const pipelineCounts = pipelineStages.map(s => ({
    ...s,
    count: leads.filter(l => l.status === s.key).length,
  }))

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.paid || 0), 0)
  const activeStudents = students.filter(s => s.status === 'active').length
  const enrolledLeads = leads.filter(l => l.status === 'enrolled').length
  const conversionRate = leads.length > 0 ? Math.round((enrolledLeads / leads.length) * 100 * 10) / 10 : 0

  // ---------- stat card configs ----------
  const statCards = [
    { icon: Users, label: 'Total Leads', value: leads.length, valueKey: 'leads', change: '+12.5%', positive: true, color: 'primary' },
    { icon: GraduationCap, label: 'Active Students', value: activeStudents, valueKey: 'students', change: '+8.3%', positive: true, color: 'emerald' },
    { icon: IndianRupee, label: 'Revenue', value: totalRevenue, valueKey: 'revenue', change: '+15.2%', positive: true, color: 'accent' },
    { icon: TrendingUp, label: 'Conversion Rate', value: conversionRate, valueKey: 'conversion', change: '+2.1%', positive: true, color: 'violet' },
  ]

  // card wrapper class
  const glass = theme === 'dark'
    ? 'bg-dark-900 border border-dark-700/60'
    : 'bg-white border border-dark-200/60 shadow-sm'

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* --------- WELCOME HEADER --------- */}
      <motion.div variants={cardVariants}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-dark-50' : 'text-dark-900'
            }`}>
              Welcome back, <span className="text-primary-500">{profile.name.split(' ')[0]}</span>
            </h1>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-dark-400' : 'text-dark-500'}`}>
              Here is what is happening at BIX Academy today. Keep up the great work!
            </p>
          </div>
          <p className={`text-sm font-medium whitespace-nowrap ${
            theme === 'dark' ? 'text-dark-400' : 'text-dark-500'
          }`}>
            {currentDate}
          </p>
        </div>
      </motion.div>

      {/* --------- KPI STATS ROW --------- */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        variants={containerVariants}
      >
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} theme={theme} />
        ))}
      </motion.div>

      {/* --------- CHARTS ROW --------- */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        variants={containerVariants}
      >
        {/* Revenue Area Chart */}
        <motion.div
          variants={cardVariants}
          className={`lg:col-span-3 rounded-2xl p-6 ${glass}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-dark-50' : 'text-dark-900'}`}>
                Revenue Overview
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-dark-400' : 'text-dark-500'}`}>
                Monthly revenue trend
              </p>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              theme === 'dark' ? 'bg-emerald-700/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <ArrowUpRight className="w-3.5 h-3.5" /> +15.2% vs last quarter
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? '#334155' : '#e2e8f0'}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip theme={theme} />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: theme === 'dark' ? '#0f172a' : '#ffffff' }}
                  activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: theme === 'dark' ? '#0f172a' : '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Lead Sources Donut */}
        <motion.div
          variants={cardVariants}
          className={`lg:col-span-2 rounded-2xl p-6 ${glass}`}
        >
          <div className="mb-4">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-dark-50' : 'text-dark-900'}`}>
              Lead Sources
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-dark-400' : 'text-dark-500'}`}>
              Distribution by channel
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    fontSize: '13px',
                    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                  }}
                />
                <Legend content={<CustomPieLegend theme={theme} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      {/* --------- ACTIVITY + PIPELINE ROW --------- */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        variants={containerVariants}
      >
        {/* Recent Activity */}
        <motion.div
          variants={cardVariants}
          className={`lg:col-span-3 rounded-2xl p-6 ${glass} flex flex-col`}
        >
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div>
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-dark-50' : 'text-dark-900'}`}>
                Recent Activity
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-dark-400' : 'text-dark-500'}`}>
                Latest updates across the academy
              </p>
            </div>
          </div>
          <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
            {recentActivities.map((activity, index) => {
              const IconComp = activityIconMap[activity.icon] || BookOpen
              const borderColor = activityBorderColor[activity.type] || activityBorderColor.course
              const iconBg = activityIconBg[activity.type] || activityIconBg.course

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.07, duration: 0.4, ease: 'easeOut' }}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-l-[3px] ${
                    theme === 'dark' ? borderColor.dark : borderColor.light
                  } ${
                    theme === 'dark' ? 'bg-dark-800/50 hover:bg-dark-800' : 'bg-dark-50/70 hover:bg-dark-100/80'
                  } transition-colors`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${theme === 'dark' ? iconBg.dark : iconBg.light}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${theme === 'dark' ? 'text-dark-200' : 'text-dark-700'}`}>
                      {activity.message}
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-dark-500' : 'text-dark-400'}`}>
                      {activity.time}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Enrollment Pipeline + Quick Actions */}
        <motion.div
          variants={cardVariants}
          className={`lg:col-span-2 rounded-2xl p-6 ${glass} flex flex-col`}
        >
          <div className="mb-5">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-dark-50' : 'text-dark-900'}`}>
              Enrollment Pipeline
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-dark-400' : 'text-dark-500'}`}>
              Current lead flow overview
            </p>
          </div>

          {/* Pipeline funnel */}
          <div className="space-y-3 flex-1">
            {pipelineCounts.map((stage, index) => {
              const maxCount = Math.max(...pipelineCounts.map(s => s.count), 1)
              const widthPct = Math.max((stage.count / maxCount) * 100, 18)
              return (
                <motion.div
                  key={stage.key}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5, ease: 'easeOut' }}
                  style={{ originX: 0 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-dark-300' : 'text-dark-600'}`}>
                      {stage.label}
                    </span>
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-dark-200' : 'text-dark-700'}`}>
                      {stage.count}
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${
                    theme === 'dark' ? 'bg-dark-800' : 'bg-dark-100'
                  }`}>
                    <motion.div
                      className={`h-full rounded-full ${stage.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                  {index < pipelineCounts.length - 1 && (
                    <div className="flex justify-center my-1">
                      <ChevronRight className={`w-3.5 h-3.5 rotate-90 ${
                        theme === 'dark' ? 'text-dark-600' : 'text-dark-300'
                      }`} />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className={`mt-6 pt-5 border-t ${theme === 'dark' ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              theme === 'dark' ? 'text-dark-400' : 'text-dark-500'
            }`}>
              Quick Actions
            </p>
            <div className="flex gap-2">
              <button onClick={() => navigate('/leads', { state: { openAddLeadModal: true } })} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-primary-600 hover:bg-primary-500 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}>
                <Plus className="w-4 h-4" />
                Add Lead
              </button>
              <button onClick={() => navigate('/follow-ups')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-dark-800 hover:bg-dark-700 text-dark-200 border border-dark-700'
                  : 'bg-dark-50 hover:bg-dark-100 text-dark-700 border border-dark-200'
              }`}>
                <CalendarPlus className="w-4 h-4" />
                Follow-up
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
