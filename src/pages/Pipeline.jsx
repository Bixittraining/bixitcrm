import { useState } from 'react'
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
  GripVertical,
  MoreHorizontal,
  X,
  Check,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'

const PIPELINE_STAGES = [
  { key: 'new', label: 'Inquiry', color: 'sky' },
  { key: 'contacted', label: 'Contacted', color: 'accent' },
  { key: 'qualified', label: 'Qualified', color: 'violet' },
  { key: 'negotiation', label: 'Negotiation', color: 'rose' },
  { key: 'enrolled', label: 'Enrolled', color: 'emerald' },
]

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

function LeadCard({ lead, stageColor, isDark, onMoveNext }) {
  const colors = COLOR_MAP[stageColor]
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <motion.div
      variants={cardVariants}
      layout
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
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-dark-100' : 'text-dark-900'}`}>{lead.name}</h4>
            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[lead.priority]}`} title={`${lead.priority} priority`} />
          </div>
          <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.course}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${isDark ? 'bg-dark-800 text-dark-300' : 'bg-dark-100 text-dark-600'}`}>
          {lead.source}
        </span>
        <span className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{formatDate(lead.date)}</span>
      </div>
      <div className={`flex items-center gap-1 pt-3 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
        <button
          onClick={() => window.open(`tel:${lead.phone}`)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-emerald-400' : 'hover:bg-dark-100 text-dark-500 hover:text-emerald-600'}`}
          title="Call"
        >
          <Phone className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.open(`mailto:${lead.email}`)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-sky-400' : 'hover:bg-dark-100 text-dark-500 hover:text-sky-600'}`}
          title="Email"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMoveNext(lead)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-primary-400' : 'hover:bg-dark-100 text-dark-500 hover:text-primary-600'}`}
          title="Move to next stage"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
        <button className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400 hover:text-dark-200' : 'hover:bg-dark-100 text-dark-500 hover:text-dark-700'}`} title="More options">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

function PipelineColumn({ stage, stageLeads, isDark, onMoveNext, onAddLead }) {
  const colors = COLOR_MAP[stage.color]

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
          {stageLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} stageColor={stage.color} isDark={isDark} onMoveNext={onMoveNext} />
          ))}
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
  const { leads, addLead, updateLeadStatus } = useData()

  const [showAddLead, setShowAddLead] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [defaultStage, setDefaultStage] = useState('new')
  const [toast, setToast] = useState(null)

  const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const pipelineLeads = leads.filter(l => l.status !== 'lost')
  const getStageLeads = (statusKey) => pipelineLeads.filter(l => l.status === statusKey)

  const handleAddLead = (formData) => {
    const avatar = formData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    addLead({
      id: Date.now(),
      ...formData,
      avatar,
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    showToastMsg(`Lead "${formData.name}" added to pipeline`)
  }

  const handleMoveNext = (lead) => {
    const stageKeys = PIPELINE_STAGES.map(s => s.key)
    const currentIdx = stageKeys.indexOf(lead.status)
    if (currentIdx < stageKeys.length - 1) {
      const nextStage = stageKeys[currentIdx + 1]
      updateLeadStatus(lead.id, nextStage)
      showToastMsg(`${lead.name} moved to ${PIPELINE_STAGES[currentIdx + 1].label}`)
    }
  }

  const handleColumnAddLead = (stageKey) => {
    setDefaultStage(stageKey)
    setShowAddLead(true)
  }

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
        </motion.div>
      </div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total in Pipeline', value: pipelineLeads.length, icon: Users, iconColor: isDark ? 'text-primary-400' : 'text-primary-600', iconBg: isDark ? 'bg-primary-500/15' : 'bg-primary-500/10' },
          { label: 'Conversion Rate', value: `${pipelineLeads.length ? Math.round((getStageLeads('enrolled').length / pipelineLeads.length) * 100) : 0}%`, icon: TrendingUp, iconColor: isDark ? 'text-emerald-400' : 'text-emerald-600', iconBg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-500/10' },
          { label: 'Avg. Days to Convert', value: '12 days', icon: Clock, iconColor: isDark ? 'text-accent-400' : 'text-accent-600', iconBg: isDark ? 'bg-accent-500/15' : 'bg-accent-500/10' },
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
            onAddLead={handleColumnAddLead}
          />
        ))}
      </motion.div>

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
