import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Settings2,
  Users,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  MoreHorizontal,
  X,
  Check,
  LayoutGrid,
  BarChart3,
  IndianRupee,
  TrendingDown,
  Target,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import { LEAD_STATUSES, PIPELINE_STAGE_KEYS, statusOrder, isPipelineStage } from '../lib/leadStatus'

// Same source as Leads.jsx's status dropdown/badges — this used to be its
// own separate hardcoded 5-stage list (labeling "new" as "Inquiry", which
// Leads.jsx called "New") that had already drifted out of sync.
const PIPELINE_STAGES = PIPELINE_STAGE_KEYS.map((key) => ({ key, label: LEAD_STATUSES[key].label, color: LEAD_STATUSES[key].color }))

const COLOR_MAP = {
  sky: {
    dot: 'bg-sky-500', border: 'border-t-sky-500',
    badge: 'bg-sky-500/15 text-sky-600', badgeDark: 'bg-sky-500/20 text-sky-400',
    avatar: 'bg-sky-500/15 text-sky-600', avatarDark: 'bg-sky-500/20 text-sky-400',
  },
  accent: {
    dot: 'bg-accent-500', border: 'border-t-accent-500',
    badge: 'bg-accent-500/15 text-accent-600', badgeDark: 'bg-accent-500/20 text-accent-400',
    avatar: 'bg-accent-500/15 text-accent-600', avatarDark: 'bg-accent-500/20 text-accent-400',
  },
  violet: {
    dot: 'bg-violet-500', border: 'border-t-violet-500',
    badge: 'bg-violet-500/15 text-violet-600', badgeDark: 'bg-violet-500/20 text-violet-400',
    avatar: 'bg-violet-500/15 text-violet-600', avatarDark: 'bg-violet-500/20 text-violet-400',
  },
  rose: {
    dot: 'bg-rose-500', border: 'border-t-rose-500',
    badge: 'bg-rose-500/15 text-rose-600', badgeDark: 'bg-rose-500/20 text-rose-400',
    avatar: 'bg-rose-500/15 text-rose-600', avatarDark: 'bg-rose-500/20 text-rose-400',
  },
  emerald: {
    dot: 'bg-emerald-500', border: 'border-t-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-600', badgeDark: 'bg-emerald-500/20 text-emerald-400',
    avatar: 'bg-emerald-500/15 text-emerald-600', avatarDark: 'bg-emerald-500/20 text-emerald-400',
  },
  primary: {
    dot: 'bg-primary-500', border: 'border-t-primary-500',
    badge: 'bg-primary-500/15 text-primary-600', badgeDark: 'bg-primary-500/20 text-primary-400',
    avatar: 'bg-primary-500/15 text-primary-600', avatarDark: 'bg-primary-500/20 text-primary-400',
  },
  indigo: {
    dot: 'bg-indigo-500', border: 'border-t-indigo-500',
    badge: 'bg-indigo-500/15 text-indigo-600', badgeDark: 'bg-indigo-500/20 text-indigo-400',
    avatar: 'bg-indigo-500/15 text-indigo-600', avatarDark: 'bg-indigo-500/20 text-indigo-400',
  },
  cyan: {
    dot: 'bg-cyan-500', border: 'border-t-cyan-500',
    badge: 'bg-cyan-500/15 text-cyan-600', badgeDark: 'bg-cyan-500/20 text-cyan-400',
    avatar: 'bg-cyan-500/15 text-cyan-600', avatarDark: 'bg-cyan-500/20 text-cyan-400',
  },
  amber: {
    dot: 'bg-amber-500', border: 'border-t-amber-500',
    badge: 'bg-amber-500/15 text-amber-600', badgeDark: 'bg-amber-500/20 text-amber-400',
    avatar: 'bg-amber-500/15 text-amber-600', avatarDark: 'bg-amber-500/20 text-amber-400',
  },
}

const PRIORITY_COLORS = { high: 'bg-rose-500', medium: 'bg-accent-500', low: 'bg-emerald-500' }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const columnVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
}

const PRIORITY_LABELS = { high: 'Hot', medium: 'Warm', low: 'Cold' }

const formatINR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0)

// ─── PIPELINE ANALYTICS — every number below comes straight from real
// leads/lead_activities/invoices/packages rows already in context. No
// estimates beyond the same "match course to a package price" fallback the
// Kanban card already uses for its per-lead value badge, and no AI/guessed
// numbers anywhere.
const FUNNEL_STEPS = [
  { from: 'new', to: 'contacted', label: 'Lead → Contacted' },
  { from: 'contacted', to: 'qualified', label: 'Contacted → Qualified' },
  { from: 'qualified', to: 'counselling', label: 'Qualified → Counselling' },
  { from: 'counselling', to: 'package_shared', label: 'Counselling → Package' },
  { from: 'package_shared', to: 'enrolled', label: 'Package → Enrolled' },
]

// Minimum completed stays required before an "average time in stage"
// number is shown — one data point isn't an average, it's a coincidence.
const MIN_STAGE_SAMPLES = 2

function buildActivitiesByLead(leadActivities) {
  const map = {}
  for (const a of leadActivities || []) {
    if (!map[a.lead_id]) map[a.lead_id] = []
    map[a.lead_id].push(a)
  }
  return map
}

// A lead currently on an active stage is simply at that stage's order. A
// closed lead (lost/nurture) has no active status to compare — so its
// effective stage is whichever active stage it was actually in right
// before it closed, read from the closing activity's from_status (real
// history), not assumed from where lost/nurture happen to sort.
function effectiveStageOrder(lead, activitiesByLead) {
  if (isPipelineStage(lead.status)) return statusOrder(lead.status)
  const closing = (activitiesByLead[lead.id] || [])
    .filter((a) => a.to_status === lead.status)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  if (closing?.from_status && isPipelineStage(closing.from_status)) return statusOrder(closing.from_status)
  return -1
}

function reachedStage(lead, key, activitiesByLead) {
  return effectiveStageOrder(lead, activitiesByLead) >= statusOrder(key)
}

// Prefer a real fee bill (invoice.amount) when one already exists —
// exact and already billed. Otherwise fall back to the matched package's
// list price, same convention the Kanban card already uses.
function dealValueForLead(lead, packages, invoices) {
  const invoice = invoices.find((inv) => inv.student === lead.name && inv.course === lead.course)
  if (invoice) return invoice.amount || 0
  const pkg = packages.find((p) => p.name.toLowerCase() === lead.course.toLowerCase())
  return pkg?.price || 0
}

function paidForLead(lead, invoices) {
  return invoices.find((inv) => inv.student === lead.name && inv.course === lead.course)?.paid || 0
}

// Average days between two consecutive genuine status changes, per stage.
// Only counts stays that actually ended — a lead still sitting in a stage
// today isn't counted, so it can't drag the average down just because
// nobody has followed up yet.
function computeStageTimes(leads, activitiesByLead) {
  const byStage = {}
  for (const lead of leads) {
    const transitions = (activitiesByLead[lead.id] || [])
      .filter((a) => a.to_status && a.from_status !== a.to_status)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    for (let i = 0; i < transitions.length - 1; i++) {
      const stageKey = transitions[i].to_status
      if (!isPipelineStage(stageKey) || stageKey === 'enrolled') continue
      const ms = new Date(transitions[i + 1].created_at) - new Date(transitions[i].created_at)
      if (ms <= 0) continue
      if (!byStage[stageKey]) byStage[stageKey] = []
      byStage[stageKey].push(ms)
    }
  }
  const out = {}
  for (const key of PIPELINE_STAGE_KEYS) {
    if (key === 'enrolled') continue
    const samples = byStage[key] || []
    out[key] = samples.length >= MIN_STAGE_SAMPLES
      ? { days: samples.reduce((s, v) => s + v, 0) / samples.length / 86400000, samples: samples.length }
      : null
  }
  return out
}

const DATE_RANGE_OPTIONS = ['All Time', 'Last 7 Days', 'Last 30 Days', 'Last 3 Months', 'Last 6 Months']
const DATE_RANGE_DAYS = { 'Last 7 Days': 7, 'Last 30 Days': 30, 'Last 3 Months': 90, 'Last 6 Months': 180 }

function PipelineAnalytics({ leads, packages, teamMembers, invoices, leadActivities, isDark }) {
  const [filters, setFilters] = useState({ dateRange: 'All Time', course: 'All', source: 'All', executive: 'All' })
  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  const courseOptions = useMemo(() => ['All', ...new Set(leads.map((l) => l.course).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)), [leads])
  const sourceOptions = useMemo(() => ['All', ...new Set(leads.map((l) => l.source).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)), [leads])
  const executiveOptions = useMemo(() => {
    const assignedIds = new Set(leads.map((l) => l.assigned_to).filter(Boolean))
    return teamMembers.filter((m) => assignedIds.has(m.id))
  }, [leads, teamMembers])

  const filteredLeads = useMemo(() => {
    let result = leads
    if (filters.dateRange !== 'All Time') {
      const days = DATE_RANGE_DAYS[filters.dateRange] || 30
      const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - days)
      result = result.filter((l) => l.date && new Date(l.date) >= cutoff)
    }
    if (filters.course !== 'All') result = result.filter((l) => l.course === filters.course)
    if (filters.source !== 'All') result = result.filter((l) => l.source === filters.source)
    if (filters.executive !== 'All') result = result.filter((l) => String(l.assigned_to) === filters.executive)
    return result
  }, [leads, filters])

  const activitiesByLead = useMemo(() => buildActivitiesByLead(leadActivities), [leadActivities])

  const totalLeads = filteredLeads.length
  const stageCounts = useMemo(() => {
    const counts = {}
    for (const key of PIPELINE_STAGE_KEYS) counts[key] = filteredLeads.filter((l) => l.status === key).length
    return counts
  }, [filteredLeads])

  const funnelReachedCounts = useMemo(() => {
    const counts = {}
    for (const key of PIPELINE_STAGE_KEYS) counts[key] = filteredLeads.filter((l) => reachedStage(l, key, activitiesByLead)).length
    return counts
  }, [filteredLeads, activitiesByLead])

  const conversions = FUNNEL_STEPS.map((step) => {
    const fromCount = step.from === 'new' ? totalLeads : funnelReachedCounts[step.from]
    const toCount = step.to === 'enrolled' ? stageCounts.enrolled : funnelReachedCounts[step.to]
    const pct = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : null
    return { ...step, fromCount, toCount, pct }
  })

  const activeLeads = filteredLeads.filter((l) => isPipelineStage(l.status) && l.status !== 'enrolled')
  const enrolledLeads = filteredLeads.filter((l) => l.status === 'enrolled')
  const lostLeads = filteredLeads.filter((l) => l.status === 'lost')
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + dealValueForLead(l, packages, invoices), 0)
  const wonRevenue = enrolledLeads.reduce((sum, l) => sum + paidForLead(l, invoices), 0)
  const lostValue = lostLeads.reduce((sum, l) => sum + dealValueForLead(l, packages, invoices), 0)

  const stageTimes = useMemo(() => computeStageTimes(filteredLeads, activitiesByLead), [filteredLeads, activitiesByLead])

  const sourceRows = useMemo(() => {
    const sources = [...new Set(filteredLeads.map((l) => l.source).filter(Boolean))]
    return sources.map((source) => {
      const sourceLeads = filteredLeads.filter((l) => l.source === source)
      const qualified = sourceLeads.filter((l) => reachedStage(l, 'qualified', activitiesByLead)).length
      const enrolled = sourceLeads.filter((l) => l.status === 'enrolled')
      const revenue = enrolled.reduce((sum, l) => sum + paidForLead(l, invoices), 0)
      return {
        source, leads: sourceLeads.length, qualified, enrolled: enrolled.length, revenue,
        conversionRate: sourceLeads.length ? Math.round((enrolled.length / sourceLeads.length) * 100) : 0,
      }
    }).sort((a, b) => b.leads - a.leads)
  }, [filteredLeads, activitiesByLead, invoices])

  const cardCls = `rounded-xl p-4 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`
  const sectionTitleCls = `text-sm font-semibold mb-3 ${isDark ? 'text-dark-100' : 'text-dark-800'}`
  const selectCls = `px-3 py-2 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-700'}`
  const mutedCls = isDark ? 'text-dark-500' : 'text-dark-400'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* Filters */}
      <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>Filters</span>
        <select value={filters.dateRange} onChange={(e) => setFilter('dateRange', e.target.value)} className={selectCls}>
          {DATE_RANGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.course} onChange={(e) => setFilter('course', e.target.value)} className={selectCls}>
          {courseOptions.map((o) => <option key={o} value={o}>{o === 'All' ? 'All Courses' : o}</option>)}
        </select>
        <select value={filters.source} onChange={(e) => setFilter('source', e.target.value)} className={selectCls}>
          {sourceOptions.map((o) => <option key={o} value={o}>{o === 'All' ? 'All Sources' : o}</option>)}
        </select>
        <select value={filters.executive} onChange={(e) => setFilter('executive', e.target.value)} className={selectCls}>
          <option value="All">All Executives</option>
          {executiveOptions.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
        </select>
        <span className={`text-xs ml-auto ${mutedCls}`}>{totalLeads} lead{totalLeads === 1 ? '' : 's'} in view</span>
      </div>

      {/* Top Metrics */}
      <div>
        <h3 className={sectionTitleCls}>Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className={cardCls}>
            <p className={`text-xs font-medium ${mutedCls}`}>Total Leads</p>
            <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{totalLeads}</p>
          </div>
          {PIPELINE_STAGE_KEYS.map((key) => (
            <div key={key} className={cardCls}>
              <p className={`text-xs font-medium truncate ${mutedCls}`}>{LEAD_STATUSES[key].label}</p>
              <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{stageCounts[key]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion */}
      <div>
        <h3 className={sectionTitleCls}>Conversion</h3>
        <div className={cardCls}>
          <div className="space-y-3">
            {conversions.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className={`text-xs sm:text-sm flex-1 min-w-0 truncate ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{c.label}</span>
                <div className={`flex-1 h-2 rounded-full overflow-hidden hidden sm:block ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
                  <div className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full" style={{ width: `${Math.min(c.pct ?? 0, 100)}%` }} />
                </div>
                <span className={`text-sm font-semibold w-20 text-right shrink-0 ${isDark ? 'text-white' : 'text-dark-900'}`}>
                  {c.pct === null ? '—' : `${c.pct}%`}
                </span>
                <span className={`text-xs w-16 text-right shrink-0 ${mutedCls}`}>({c.toCount}/{c.fromCount})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Value */}
      <div>
        <h3 className={sectionTitleCls}>Pipeline Value</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-1"><Target className={`w-4 h-4 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} /><p className={`text-xs font-medium ${mutedCls}`}>Active Pipeline Value</p></div>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(activePipelineValue)}</p>
            <p className={`text-xs mt-0.5 ${mutedCls}`}>{activeLeads.length} active lead{activeLeads.length === 1 ? '' : 's'}</p>
          </div>
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-1"><IndianRupee className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} /><p className={`text-xs font-medium ${mutedCls}`}>Won Revenue</p></div>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(wonRevenue)}</p>
            <p className={`text-xs mt-0.5 ${mutedCls}`}>{enrolledLeads.length} enrolled</p>
          </div>
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-1"><TrendingDown className={`w-4 h-4 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} /><p className={`text-xs font-medium ${mutedCls}`}>Lost Value</p></div>
            {lostLeads.length > 0 ? (
              <>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(lostValue)}</p>
                <p className={`text-xs mt-0.5 ${mutedCls}`}>{lostLeads.length} lost lead{lostLeads.length === 1 ? '' : 's'}</p>
              </>
            ) : (
              <p className={`text-sm mt-1 ${mutedCls}`}>No lost leads in view</p>
            )}
          </div>
        </div>
      </div>

      {/* Stage Time */}
      <div>
        <h3 className={sectionTitleCls}>Average Time in Stage</h3>
        <div className={cardCls}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PIPELINE_STAGE_KEYS.filter((k) => k !== 'enrolled').map((key) => {
              const t = stageTimes[key]
              return (
                <div key={key}>
                  <p className={`text-xs font-medium truncate ${mutedCls}`}>{LEAD_STATUSES[key].label}</p>
                  {t ? (
                    <p className={`text-base font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{t.days.toFixed(1)} days</p>
                  ) : (
                    <p className={`text-sm mt-0.5 ${mutedCls}`}>Not enough data</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Source Performance */}
      <div>
        <h3 className={sectionTitleCls}>Source Performance</h3>
        <div className={`${cardCls} p-0 overflow-hidden`}>
          {sourceRows.length === 0 ? (
            <p className={`text-sm p-4 ${mutedCls}`}>No leads match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                    {['Source', 'Leads', 'Qualified', 'Enrolled', 'Revenue', 'Conversion'].map((h) => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider ${mutedCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map((row) => (
                    <tr key={row.source} className={`border-b last:border-0 ${isDark ? 'border-dark-800' : 'border-dark-100'}`}>
                      <td className={`px-4 py-2.5 font-medium ${isDark ? 'text-dark-100' : 'text-dark-800'}`}>{row.source}</td>
                      <td className={`px-4 py-2.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{row.leads}</td>
                      <td className={`px-4 py-2.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{row.qualified}</td>
                      <td className={`px-4 py-2.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{row.enrolled}</td>
                      <td className={`px-4 py-2.5 font-medium ${isDark ? 'text-dark-100' : 'text-dark-800'}`}>{formatINR(row.revenue)}</td>
                      <td className={`px-4 py-2.5 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{row.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Card shows exactly six things — name, course, assigned exec, priority,
// next follow-up, package value — and nothing else. It used to also show
// a source badge and creation date, which the brief explicitly says to
// drop in favor of the info someone actually needs at a glance.
function LeadCard({ lead, stageColor, isDark, onMoveNext, onMovePrev, onOpen, assignedName, nextFollowUpLabel, packageValue }) {
  const colors = COLOR_MAP[stageColor]
  const stop = (fn) => (e) => { e.stopPropagation(); fn() }

  return (
    <motion.div
      variants={cardVariants}
      layout
      onClick={onOpen}
      whileHover={{ y: -4, boxShadow: isDark ? '0 8px 25px rgba(0,0,0,0.4)' : '0 8px 25px rgba(0,0,0,0.1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`group relative rounded-xl p-4 cursor-pointer transition-colors duration-200 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`}
    >
      <div className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${isDark ? colors.avatarDark : colors.avatar}`}>
          {lead.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-dark-100' : 'text-dark-900'}`}>{lead.name}</h4>
          <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.course}</p>
        </div>
      </div>
      <div className={`space-y-1.5 mb-3 text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">Assigned: {assignedName || 'Unassigned'}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${isDark ? colors.avatarDark : colors.avatar}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[lead.priority]}`} />{PRIORITY_LABELS[lead.priority] || lead.priority}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{nextFollowUpLabel ? `Follow-up: ${nextFollowUpLabel}` : 'No follow-up scheduled'}</span>
          {packageValue > 0 && <span className={`font-semibold shrink-0 ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{formatINR(packageValue)}</span>}
        </div>
      </div>
      <div className={`flex items-center gap-1 pt-3 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
        <button
          onClick={stop(() => window.open(`tel:${lead.phone}`))}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-emerald-400' : 'hover:bg-dark-100 text-dark-500 hover:text-emerald-600'}`}
          title="Call"
        >
          <Phone className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={stop(() => window.open(`mailto:${lead.email}`))}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-sky-400' : 'hover:bg-dark-100 text-dark-500 hover:text-sky-600'}`}
          title="Email"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={stop(() => onMovePrev(lead))}
          disabled={lead.status === 'new' || lead.status === 'enrolled'}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-primary-400' : 'hover:bg-dark-100 text-dark-500 hover:text-primary-600'}`}
          title={lead.status === 'enrolled' ? "Can't revert an enrolled lead — it already has a student & invoice" : lead.status === 'new' ? 'Already at the first stage' : 'Move back to previous stage'}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={stop(() => onMoveNext(lead))}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-primary-400' : 'hover:bg-dark-100 text-dark-500 hover:text-primary-600'}`}
          title="Move to next stage"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
        <button onClick={stop(onOpen)} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-dark-200' : 'hover:bg-dark-100 text-dark-500 hover:text-dark-700'}`} title="Open lead">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

function PipelineColumn({ stage, stageLeads, isDark, onMoveNext, onMovePrev, onAddLead, onOpenLead, teamMembers, followUps, packages }) {
  const colors = COLOR_MAP[stage.color]
  const today = new Date().toISOString().slice(0, 10)
  const formatFollowUpDate = (dateStr) => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    if (dateStr === today) return 'Today'
    if (dateStr === tomorrow) return 'Tomorrow'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <motion.div
      variants={columnVariants}
      className={`flex flex-col min-w-[280px] w-[280px] lg:w-auto lg:flex-1 rounded-xl border-t-[3px] ${colors.border} ${isDark ? 'bg-dark-800/50 border-dark-700/40' : 'bg-dark-50/50 border-dark-200/40'} border`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-100' : 'text-dark-800'}`}>{stage.label}</h3>
        </div>
        <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold ${isDark ? colors.badgeDark : colors.badge}`}>
          {stageLeads.length}
        </span>
      </div>
      <motion.div className="flex flex-col gap-3 px-3 pb-3 overflow-y-auto max-h-[calc(100vh-340px)] kanban-scrollbar" variants={containerVariants} initial="hidden" animate="visible">
        <AnimatePresence mode="popLayout">
          {stageLeads.map(lead => {
            const assignedName = teamMembers.find((m) => m.id === lead.assigned_to)?.name
            const nextFollowUp = followUps
              .filter((f) => f.lead === lead.name && f.status === 'pending')
              .sort((a, b) => a.date.localeCompare(b.date))[0]
            const matchingPackage = packages.find((p) => p.name.toLowerCase() === lead.course.toLowerCase())
            return (
              <LeadCard key={lead.id} lead={lead} stageColor={stage.color} isDark={isDark} onMoveNext={onMoveNext} onMovePrev={onMovePrev}
                onOpen={() => onOpenLead(lead)}
                assignedName={assignedName}
                nextFollowUpLabel={nextFollowUp ? formatFollowUpDate(nextFollowUp.date) : null}
                packageValue={matchingPackage?.price || 0}
              />
            )
          })}
        </AnimatePresence>
      </motion.div>
      <div className="px-3 pb-3 mt-auto">
        <button
          onClick={() => onAddLead(stage.key)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed transition-colors text-sm font-medium ${isDark ? 'border-dark-700 text-dark-500 hover:border-dark-500 hover:text-dark-300 hover:bg-dark-800/50' : 'border-dark-300 text-dark-400 hover:border-dark-400 hover:text-dark-600 hover:bg-dark-100/50'}`}
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>
    </motion.div>
  )
}

function AddLeadModal({ isDark, defaultStage, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', course: '', source: 'Website', priority: 'medium', status: defaultStage })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500' : 'bg-white border-dark-200 text-dark-900 placeholder-dark-400'}`
  const labelCls = `block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div
        variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'}`}
      >
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Add New Lead</h2>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></motion.button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Arjun Mehta" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="arjun@email.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Course Interest *</label>
            <input value={form.course} onChange={e => set('course', e.target.value)} placeholder="Full Stack Development" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className={inputCls}>
                {['Website', 'Instagram', 'Facebook', 'Google Ads', 'LinkedIn', 'Referral', 'Walk-in', 'Other'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Stage</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className={`flex justify-end gap-3 p-5 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <button onClick={onClose} className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          <button
            onClick={() => { if (!form.name || !form.course) return; onSave(form); onClose() }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25"
          >
            <span className="flex items-center gap-2"><Plus className="w-4 h-4" />Add Lead</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SettingsModal({ isDark, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div
        variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'}`}
      >
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Pipeline Settings</h2>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></motion.button>
        </div>
        <div className="p-5 space-y-3">
          <p className={`text-sm font-medium mb-3 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Pipeline Stages</p>
          {PIPELINE_STAGES.map((stage, i) => {
            const colors = COLOR_MAP[stage.color]
            return (
              <div key={stage.key} className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-dark-800 border-dark-700/40' : 'bg-dark-50 border-dark-200/40'}`}>
                <span className={`text-xs font-medium w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-dark-700 text-dark-300' : 'bg-dark-200 text-dark-600'}`}>{i + 1}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                <span className={`text-sm font-medium flex-1 ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{stage.label}</span>
                <Check className="w-4 h-4 text-emerald-500" />
              </div>
            )
          })}
          <p className={`text-xs mt-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
            Drag leads using the → button on each card to advance them through the pipeline.
          </p>
        </div>
        <div className={`flex justify-end p-5 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25">
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Pipeline() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const { leads, addLead, updateLeadStatus, enrollLead, packages, teamMembers, followUps, invoices, leadActivities } = useData()

  const [view, setView] = useState('board')
  const [showAddLead, setShowAddLead] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [defaultStage, setDefaultStage] = useState('new')
  const [toast, setToast] = useState(null)

  const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // Lost and Nurture are closed/alternative outcomes, not active pipeline
  // stages — they don't get a Kanban column, same as before for Lost;
  // Nurture is new and follows the same rule.
  const pipelineLeads = leads.filter(l => l.status !== 'lost' && l.status !== 'nurture')
  const getStageLeads = (statusKey) => pipelineLeads.filter(l => l.status === statusKey)
  const handleOpenLead = (lead) => navigate('/leads', { state: { openLeadId: lead.id } })

  const handleAddLead = async (formData) => {
    const avatar = formData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const result = await addLead({
      id: Date.now(),
      ...formData,
      avatar,
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    if (result?.duplicate) { showToastMsg(`Already exists as a lead: ${result.existing.name} (${result.existing.status})`); return }
    if (result?.error) { showToastMsg(`Couldn't add lead: ${result.error}`); return }
    showToastMsg(`Lead "${formData.name}" added to pipeline`)
  }

  const handleMoveNext = (lead) => {
    const stageKeys = PIPELINE_STAGES.map(s => s.key)
    const currentIdx = stageKeys.indexOf(lead.status)
    if (currentIdx < stageKeys.length - 1) {
      const nextStage = stageKeys[currentIdx + 1]
      if (nextStage === 'enrolled') {
        // Enrolled needs a real student + invoice created, not just a status
        // flip — updateLeadStatus alone left leads sitting in "Enrolled"
        // with no matching row in Students. Batch isn't picked here, so it
        // enrolls Unassigned; staff can assign a batch later from Students.
        const pkg = packages.find((p) => p.name.toLowerCase() === lead.course.toLowerCase())
        enrollLead(lead, pkg, null)
      } else {
        updateLeadStatus(lead.id, nextStage)
      }
      showToastMsg(`${lead.name} moved to ${PIPELINE_STAGES[currentIdx + 1].label}`)
    }
  }

  // Reverting an accidental stage change. Blocked out of 'enrolled' — that
  // transition already created a real student + invoice, and stepping back
  // here would only flip the status flag, leaving those records orphaned
  // with no corresponding lead stage. Undoing an enrollment is a separate,
  // more deliberate action than fixing a misclick.
  const handleMovePrev = (lead) => {
    const stageKeys = PIPELINE_STAGES.map(s => s.key)
    const currentIdx = stageKeys.indexOf(lead.status)
    if (lead.status === 'enrolled') {
      showToastMsg(`Can't revert ${lead.name} — already enrolled with a student & invoice`)
      return
    }
    if (currentIdx > 0) {
      const prevStage = stageKeys[currentIdx - 1]
      updateLeadStatus(lead.id, prevStage)
      showToastMsg(`${lead.name} moved back to ${PIPELINE_STAGES[currentIdx - 1].label}`)
    }
  }

  const handleColumnAddLead = (stageKey) => {
    setDefaultStage(stageKey)
    setShowAddLead(true)
  }

  // Real average time from a lead's first activity entry to the activity
  // that enrolled them — not a guessed/rounded figure. Needs at least a
  // couple of enrolled leads with logged history before it means anything.
  const avgDaysToConvert = (() => {
    const activitiesByLead = buildActivitiesByLead(leadActivities)
    const durations = leads
      .filter((l) => l.status === 'enrolled')
      .map((l) => {
        const acts = (activitiesByLead[l.id] || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        const first = acts[0]
        const enrolledAt = acts.filter((a) => a.to_status === 'enrolled').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        if (!first || !enrolledAt) return null
        const ms = new Date(enrolledAt.created_at) - new Date(first.created_at)
        return ms > 0 ? ms : null
      })
      .filter((ms) => ms !== null)
    if (durations.length < MIN_STAGE_SAMPLES) return null
    return durations.reduce((s, v) => s + v, 0) / durations.length / 86400000
  })()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className={`text-2xl lg:text-3xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>
            Enrollment Pipeline
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className={`mt-1 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            Visual pipeline to track student enrollment journey
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="flex items-center gap-3">
          <div className={`inline-flex items-center p-1 rounded-xl border ${isDark ? 'border-dark-700 bg-dark-900' : 'border-dark-200 bg-white'}`}>
            <button
              onClick={() => setView('board')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${view === 'board' ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white' : isDark ? 'text-dark-300 hover:text-dark-100' : 'text-dark-600 hover:text-dark-800'}`}
            >
              <LayoutGrid className="w-4 h-4" />Board
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${view === 'analytics' ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white' : isDark ? 'text-dark-300 hover:text-dark-100' : 'text-dark-600 hover:text-dark-800'}`}
            >
              <BarChart3 className="w-4 h-4" />Analytics
            </button>
          </div>
          {view === 'board' && (
            <>
              <button
                onClick={() => setShowSettings(true)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800 hover:text-dark-100' : 'border-dark-300 text-dark-600 hover:bg-dark-100 hover:text-dark-800'}`}
              >
                <Settings2 className="w-4 h-4" />
                Pipeline Settings
              </button>
              <button
                onClick={() => { setDefaultStage('new'); setShowAddLead(true) }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/25 transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Lead
              </button>
            </>
          )}
        </motion.div>
      </div>

      {view === 'analytics' ? (
        <PipelineAnalytics leads={leads} packages={packages} teamMembers={teamMembers} invoices={invoices} leadActivities={leadActivities} isDark={isDark} />
      ) : (
        <>
          {/* Stats Row */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total in Pipeline', value: pipelineLeads.length, icon: Users, iconColor: isDark ? 'text-primary-400' : 'text-primary-600', iconBg: isDark ? 'bg-primary-500/15' : 'bg-primary-500/10' },
              { label: 'Conversion Rate', value: `${pipelineLeads.length ? Math.round((getStageLeads('enrolled').length / pipelineLeads.length) * 100) : 0}%`, icon: TrendingUp, iconColor: isDark ? 'text-emerald-400' : 'text-emerald-600', iconBg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-500/10' },
              { label: 'Avg. Days to Convert', value: avgDaysToConvert === null ? 'Not enough data' : `${avgDaysToConvert.toFixed(1)} days`, icon: Clock, iconColor: isDark ? 'text-accent-400' : 'text-accent-600', iconBg: isDark ? 'bg-accent-500/15' : 'bg-accent-500/10' },
            ].map(stat => (
              <div key={stat.label} className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`}>
                <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Kanban Board */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
            {PIPELINE_STAGES.map(stage => (
              <PipelineColumn
                key={stage.key}
                stage={stage}
                stageLeads={getStageLeads(stage.key)}
                isDark={isDark}
                onMoveNext={handleMoveNext}
                onMovePrev={handleMovePrev}
                onAddLead={handleColumnAddLead}
                onOpenLead={handleOpenLead}
                teamMembers={teamMembers}
                followUps={followUps}
                packages={packages}
              />
            ))}
          </motion.div>
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddLead && (
          <AddLeadModal isDark={isDark} defaultStage={defaultStage} onClose={() => setShowAddLead(false)} onSave={handleAddLead} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && <SettingsModal isDark={isDark} onClose={() => setShowSettings(false)} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border bg-emerald-500/20 border-emerald-500/40 text-emerald-300">
            <Check className="w-5 h-5" />
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
