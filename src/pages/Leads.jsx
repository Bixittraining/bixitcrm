import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Upload, Download, Pencil, Phone, UserPlus, Users, UserCheck,
  MessageSquare, GraduationCap, UserX, ChevronDown, ChevronLeft, ChevronRight, X,
  Trash2, Mail, Calendar, Clock, MapPin, Star, MessageCircle,
  PhoneCall, Video, CheckCircle2, AlertCircle, Package, IndianRupee, FileText,
  Activity, ArrowLeft, Key, CreditCard, Award, Receipt, PhoneMissed
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'

// ─── CONFIG ────────────────────────────────────────────────────────────
const statusConfig = {
  new: { label: 'New', color: 'sky', icon: UserPlus },
  contacted: { label: 'Contacted', color: 'accent', icon: MessageSquare },
  qualified: { label: 'Qualified', color: 'emerald', icon: UserCheck },
  negotiation: { label: 'Negotiation', color: 'violet', icon: Users },
  enrolled: { label: 'Enrolled', color: 'primary', icon: GraduationCap },
  lost: { label: 'Lost', color: 'rose', icon: UserX },
}

const priorityConfig = { high: 'rose', medium: 'accent', low: 'emerald' }
const LEADS_PER_PAGE = 10
const sourceOptions = ['All', 'Website', 'Google', 'Referral', 'Social', 'Walk-in']
const statusOptions = ['All', 'Today', 'Meeting', 'Not Attempted', 'Contacted', 'Qualified', 'Negotiation', 'Enrolled', 'Lost']

const courseOptions = [
  'Full Stack Development', 'Data Science & AI', 'UI/UX Design', 'Digital Marketing',
  'Cloud Computing', 'Cybersecurity', 'Mobile App Development', 'DevOps Engineering', 'Python Programming',
]

const sourceFormOptions = ['Website', 'Google Ads', 'Referral', 'Instagram', 'LinkedIn', 'Facebook', 'Walk-in']

const followUpTypes = [
  { key: 'call', label: 'Call', icon: PhoneCall },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'meeting', label: 'Meeting', icon: Video },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

const profileTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'requirement', label: 'Requirement' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'package', label: 'Package' },
  { key: 'feebill', label: 'Fee Bill' },
  { key: 'course', label: 'Course' },
  { key: 'notes', label: 'Notes' },
]

// ─── ANIMATION VARIANTS ───────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}
const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
}
const toastVariants = {
  hidden: { opacity: 0, x: 80, scale: 0.9 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } },
  exit: { opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } },
}

// ─── STYLE MAPS ───────────────────────────────────────────────────────
const badgeStylesDark = {
  sky: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  accent: 'bg-accent-500/20 text-accent-400 border border-accent-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  violet: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
  primary: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
  rose: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
}
const badgeStylesLight = {
  sky: 'bg-sky-50 text-sky-600 border border-sky-200',
  accent: 'bg-accent-50 text-accent-600 border border-accent-200',
  emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  violet: 'bg-violet-50 text-violet-600 border border-violet-200',
  primary: 'bg-primary-50 text-primary-600 border border-primary-200',
  rose: 'bg-rose-50 text-rose-600 border border-rose-200',
}
const avatarColorsDark = {
  sky: 'bg-sky-500/20 text-sky-400', accent: 'bg-accent-500/20 text-accent-400',
  emerald: 'bg-emerald-500/20 text-emerald-400', violet: 'bg-violet-500/20 text-violet-400',
  primary: 'bg-primary-500/20 text-primary-400', rose: 'bg-rose-500/20 text-rose-400',
}
const avatarColorsLight = {
  sky: 'bg-sky-100 text-sky-700', accent: 'bg-accent-100 text-accent-700',
  emerald: 'bg-emerald-100 text-emerald-700', violet: 'bg-violet-100 text-violet-700',
  primary: 'bg-primary-100 text-primary-700', rose: 'bg-rose-100 text-rose-700',
}
const avatarGradients = {
  sky: 'from-sky-500 to-sky-600', accent: 'from-accent-500 to-accent-600',
  emerald: 'from-emerald-500 to-emerald-600', violet: 'from-violet-500 to-violet-600',
  primary: 'from-primary-500 to-primary-600', rose: 'from-rose-500 to-rose-600',
}
const iconColorMap = {
  sky: 'text-sky-500', accent: 'text-accent-500', emerald: 'text-emerald-500',
  violet: 'text-violet-500', primary: 'text-primary-500', rose: 'text-rose-500',
  slate: 'text-dark-500',
}
const bgSubtleMap = (isDark) => ({
  sky: isDark ? 'bg-sky-500/10' : 'bg-sky-50',
  accent: isDark ? 'bg-accent-500/10' : 'bg-accent-50',
  emerald: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
  violet: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
  primary: isDark ? 'bg-primary-500/10' : 'bg-primary-50',
  rose: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
  slate: isDark ? 'bg-dark-500/10' : 'bg-dark-100',
})

// ─── HELPERS ──────────────────────────────────────────────────────────
function getStatusColor(status) {
  return statusConfig[status]?.color || 'sky'
}

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function relativeDate(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`
  return `${Math.floor(diff / 30)} months ago`
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────
function StatusBadge({ status, isDark, onClick, className = '' }) {
  const config = statusConfig[status]
  if (!config) return null
  const styles = isDark ? badgeStylesDark : badgeStylesLight
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[config.color]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
    >
      {config.label}
    </span>
  )
}

function PriorityBadge({ priority, isDark }) {
  const color = priorityConfig[priority]
  if (!color) return null
  const dotColors = { rose: 'bg-rose-500', accent: 'bg-accent-500', emerald: 'bg-emerald-500' }
  const styles = {
    rose: isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600',
    accent: isDark ? 'bg-accent-500/15 text-accent-400' : 'bg-accent-50 text-accent-600',
    emerald: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />
      {priority}
    </span>
  )
}

function Toast({ notification, onDismiss, isDark }) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onDismiss, 3000)
      return () => clearTimeout(timer)
    }
  }, [notification, onDismiss])
  return (
    <div className="fixed top-6 right-6 z-[100]">
      <AnimatePresence>
        {notification && (
          <motion.div
            variants={toastVariants} initial="hidden" animate="visible" exit="exit"
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
              notification.type === 'success'
                ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{notification.message}</span>
            <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, isDark }) {
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}><Trash2 className="w-6 h-6 text-rose-500" /></div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Confirm Delete</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{message}</p>
          <div className="flex items-center gap-3 w-full">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCancel}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors"
            >Delete</motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function InlineStatusDropdown({ currentStatus, onSelect, onClose, isDark }) {
  const ref = useRef(null)
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }}
      className={`absolute z-30 mt-1 w-40 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80 shadow-black/40' : 'bg-white border-dark-200 shadow-dark-200/30'}`}
    >
      {Object.entries(statusConfig).map(([key, cfg]) => (
        <button key={key} onClick={() => onSelect(key)}
          className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
            key === currentStatus
              ? isDark ? 'bg-primary-500/15 text-primary-400' : 'bg-primary-50 text-primary-600'
              : isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'
          }`}
        >
          <cfg.icon className="w-3.5 h-3.5" />{cfg.label}
          {key === currentStatus && <CheckCircle2 className="w-3 h-3 ml-auto" />}
        </button>
      ))}
    </motion.div>
  )
}

// ─── ACTION DROPDOWN (per-lead row) ────────────────────────────────────
function LeadActionMenu({ lead, isDark, onClose, onScheduleFollowUp, onScheduleMeeting, onRNR, onEnroll, onLost, onTakeOver, onEdit, onDelete }) {
  const ref = useRef(null)
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const itemCls = `w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
    isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'
  }`
  const dividerCls = `my-1 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-100'}`
  const item = (icon, label, onClick, extraCls = '') => (
    <button onClick={() => { onClick(); onClose() }} className={`${itemCls} ${extraCls}`}>
      {icon}{label}
    </button>
  )

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }} transition={{ duration: 0.15 }}
      className={`absolute right-0 z-30 mt-1 w-52 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80 shadow-black/40' : 'bg-white border-dark-200 shadow-dark-200/30'}`}
    >
      {item(<UserCheck className="w-3.5 h-3.5" />, 'Take Over Lead', () => onTakeOver(lead))}
      {item(<Calendar className="w-3.5 h-3.5" />, 'Schedule Follow-up', () => onScheduleFollowUp(lead))}
      {item(<Video className="w-3.5 h-3.5" />, 'Schedule Meeting', () => onScheduleMeeting(lead))}
      {item(<PhoneMissed className="w-3.5 h-3.5" />, 'RNR (Ring No Response)', () => onRNR(lead))}
      {item(<GraduationCap className="w-3.5 h-3.5" />, 'Mark Enrolled', () => onEnroll(lead), isDark ? 'text-emerald-400' : 'text-emerald-600')}
      {item(<UserX className="w-3.5 h-3.5" />, 'Mark Lost', () => onLost(lead), isDark ? 'text-rose-400' : 'text-rose-600')}
      <div className={dividerCls} />
      {item(<Pencil className="w-3.5 h-3.5" />, 'Edit Lead', () => onEdit(lead))}
      {item(<Trash2 className="w-3.5 h-3.5" />, 'Delete Lead', () => onDelete(lead), isDark ? 'text-rose-400' : 'text-rose-600')}
    </motion.div>
  )
}

// ─── RNR MODAL (Ring No Response — schedule next attempt) ──────────────
function RNRModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [form, setForm] = useState({ date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '10:00', notes: '' })
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(lead, form) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><PhoneMissed className="w-5 h-5 text-accent-500" />Ring No Response</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>When should we try {lead.name} again?</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Next Attempt Date</label>
              <div className="relative">
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                <input type="date" required value={form.date} onChange={(e) => handleChange('date', e.target.value)} className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Time</label>
              <div className="relative">
                <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                <input type="time" required value={form.time} onChange={(e) => handleChange('time', e.target.value)} className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
              </div>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="e.g. tried at lunchtime, will call again in the evening..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            ><PhoneMissed className="w-4 h-4" />Save & Schedule Next Attempt</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── LOST REASON MODAL ───────────────────────────────────────────────
function LostReasonModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [reason, setReason] = useState('')
  const handleSubmit = (e) => { e.preventDefault(); if (reason.trim()) onSubmit(lead, reason.trim()) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><UserX className="w-5 h-5 text-rose-500" />Mark as Lost</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Why is {lead.name} being marked lost?</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Reason *</label>
            <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. too expensive, chose another institute, not interested anymore..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-500/25 transition-all"
            ><UserX className="w-4 h-4" />Mark Lost</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── EDIT LEAD MODAL ─────────────────────────────────────────────────
function EditLeadModal({ lead, isDark, onClose, onSave, inputClass }) {
  const [form, setForm] = useState({
    name: lead.name, email: lead.email, phone: lead.phone, course: lead.course,
    source: lead.source, priority: lead.priority, status: lead.status, notes: lead.notes,
  })
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const handleSubmit = (e) => { e.preventDefault(); onSave({ ...lead, ...form }) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-lg rounded-2xl p-6 z-10 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Edit Lead</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Update {lead.name}'s information</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Full Name</label>
            <input type="text" required value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Email</label>
              <input type="email" required value={form.email} onChange={(e) => handleChange('email', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Phone</label>
              <input type="tel" required value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Course</label>
              <select required value={form.course} onChange={(e) => handleChange('course', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select course</option>
                {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Source</label>
              <select required value={form.source} onChange={(e) => handleChange('source', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select source</option>
                {sourceFormOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Status</label>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                {Object.entries(statusConfig).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Priority</label>
              <div className="flex items-center gap-2">
                {['high', 'medium', 'low'].map((p) => {
                  const dotColor = p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-accent-500' : 'bg-emerald-500'
                  const selected = form.priority === p
                  return (
                    <label key={p} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium capitalize ${
                      selected
                        ? p === 'high' ? isDark ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-rose-500 bg-rose-50 text-rose-600'
                          : p === 'medium' ? isDark ? 'border-accent-500 bg-accent-500/10 text-accent-400' : 'border-accent-500 bg-accent-50 text-accent-600'
                            : isDark ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : isDark ? 'border-dark-700 text-dark-400' : 'border-dark-200 text-dark-500'
                    }`}>
                      <input type="radio" name="edit-priority" value={p} checked={selected} onChange={() => handleChange('priority', p)} className="sr-only" />
                      <span className={`w-2 h-2 rounded-full ${selected ? dotColor : isDark ? 'bg-dark-600' : 'bg-dark-300'}`} />{p}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            >Save Changes</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── TRANSFER TO FOLLOW-UP MODAL ─────────────────────────────────────
function TransferModal({ lead, isDark, onClose, onSubmit, inputClass, cardClass, initialType = 'call' }) {
  const [form, setForm] = useState({ type: initialType, date: new Date().toISOString().slice(0, 10), time: '10:00', priority: 'medium', notes: lead.notes || '' })
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(lead, form) }

  const typeColors = {
    call: isDark ? 'border-sky-500 bg-sky-500/10 text-sky-400' : 'border-sky-500 bg-sky-50 text-sky-600',
    email: isDark ? 'border-accent-500 bg-accent-500/10 text-accent-400' : 'border-accent-500 bg-accent-50 text-accent-600',
    meeting: isDark ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-violet-500 bg-violet-50 text-violet-600',
    whatsapp: isDark ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600',
  }
  const unselectedStyle = isDark ? 'border-dark-700 text-dark-400' : 'border-dark-200 text-dark-500'

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-lg rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Transfer to Follow-up</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Schedule a follow-up for {lead.name}</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <div className={`rounded-xl p-3 mb-5 ${cardClass}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${avatarGradients[getStatusColor(lead.status)]}`}>{lead.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.name}</p>
              <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.course}</p>
            </div>
            <StatusBadge status={lead.status} isDark={isDark} />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Follow-up Type</label>
            <div className="grid grid-cols-4 gap-2">
              {followUpTypes.map(({ key, label, icon: TypeIcon }) => (
                <label key={key} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-medium ${form.type === key ? typeColors[key] : unselectedStyle}`}>
                  <input type="radio" name="followup-type" value={key} checked={form.type === key} onChange={() => handleChange('type', key)} className="sr-only" />
                  <TypeIcon className="w-5 h-5" />{label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Date</label>
              <div className="relative">
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                <input type="date" required value={form.date} onChange={(e) => handleChange('date', e.target.value)} className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Time</label>
              <div className="relative">
                <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                <input type="time" required value={form.time} onChange={(e) => handleChange('time', e.target.value)} className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
              </div>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Priority</label>
            <div className="flex items-center gap-3">
              {['high', 'medium', 'low'].map((p) => {
                const dotColor = p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-accent-500' : 'bg-emerald-500'
                const selected = form.priority === p
                return (
                  <label key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium capitalize ${
                    selected
                      ? p === 'high' ? isDark ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-rose-500 bg-rose-50 text-rose-600'
                        : p === 'medium' ? isDark ? 'border-accent-500 bg-accent-500/10 text-accent-400' : 'border-accent-500 bg-accent-50 text-accent-600'
                          : isDark ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : isDark ? 'border-dark-700 text-dark-400' : 'border-dark-200 text-dark-500'
                  }`}>
                    <input type="radio" name="transfer-priority" value={p} checked={selected} onChange={() => handleChange('priority', p)} className="sr-only" />
                    <span className={`w-2.5 h-2.5 rounded-full ${selected ? dotColor : isDark ? 'bg-dark-600' : 'bg-dark-300'}`} />{p}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Additional notes for follow-up..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            ><Calendar className="w-4 h-4" />Schedule Follow-up</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── ADD LEAD MODAL ──────────────────────────────────────────────────
function AddLeadModal({ isDark, onClose, onAdd, inputClass }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', course: '', source: '', priority: 'medium', notes: '' })
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const handleSubmit = (e) => {
    e.preventDefault()
    const nameParts = form.name.trim().split(' ')
    const avatar = nameParts.length >= 2 ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : form.name.trim().slice(0, 2).toUpperCase()
    onAdd({ ...form, id: Date.now(), avatar, status: 'new', date: new Date().toISOString().slice(0, 10) })
    setForm({ name: '', email: '', phone: '', course: '', source: '', priority: 'medium', notes: '' })
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-lg rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Add New Lead</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Fill in the prospective student details</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Full Name</label>
            <input type="text" required value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Enter full name"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Email</label>
              <input type="email" required value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@example.com"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Phone</label>
              <input type="tel" required value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+91 98765 43210"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Course Interested</label>
              <select required value={form.course} onChange={(e) => handleChange('course', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select course</option>
                {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Source</label>
              <select required value={form.source} onChange={(e) => handleChange('source', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select source</option>
                {sourceFormOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Priority</label>
            <div className="flex items-center gap-4">
              {['high', 'medium', 'low'].map((p) => {
                const dotColor = p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-accent-500' : 'bg-emerald-500'
                const selected = form.priority === p
                return (
                  <label key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium capitalize ${
                    selected
                      ? p === 'high' ? isDark ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-rose-500 bg-rose-50 text-rose-600'
                        : p === 'medium' ? isDark ? 'border-accent-500 bg-accent-500/10 text-accent-400' : 'border-accent-500 bg-accent-50 text-accent-600'
                          : isDark ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : isDark ? 'border-dark-700 text-dark-400' : 'border-dark-200 text-dark-500'
                  }`}>
                    <input type="radio" name="add-priority" value={p} checked={selected} onChange={() => handleChange('priority', p)} className="sr-only" />
                    <span className={`w-2.5 h-2.5 rounded-full ${selected ? dotColor : isDark ? 'bg-dark-600' : 'bg-dark-300'}`} />{p}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any additional notes about the lead..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            >Add Lead</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── PROFILE VIEW ────────────────────────────────────────────────────
function LeadProfileView({ lead, isDark, onBack, onEdit, onTransfer, onScheduleMeeting, onDelete, onEnroll, onBatchTimingChange, onGenerateFeeBill, followUpsData, updateFollowUp, leadActivities, cardClass, inputClass, activeTab, setActiveTab, showNotification, packages, teamMembers, leadDocuments, onAddDocument, onDeleteDocument }) {
  const navigate = useNavigate()
  const [feePlan, setFeePlan] = useState(0)
  const [addingDocCategory, setAddingDocCategory] = useState(null)
  const [docForm, setDocForm] = useState({ title: '', url: '' })
  const [profileNoteText, setProfileNoteText] = useState('')
  const [profileNotes, setProfileNotes] = useState([
    { id: 1, text: lead.notes, date: lead.date, author: 'Admin' },
    { id: 2, text: `Initial inquiry about ${lead.course} received.`, date: lead.date, author: 'System' },
  ])

  const statusColor = getStatusColor(lead.status)
  const matchingPackage = packages.find((p) => p.name.toLowerCase() === lead.course.toLowerCase())
  const leadFollowUps = followUpsData.filter((f) => f.lead === lead.name)
  const leadTimeline = (leadActivities || []).filter((a) => a.lead_id === lead.id)
  const leadDocs = (leadDocuments || []).filter((d) => d.lead_id === lead.id)
  const leadMeetings = leadFollowUps.filter((f) => f.type === 'meeting')
  const pendingCount = leadFollowUps.filter((f) => f.status === 'pending').length
  const packagePrice = matchingPackage?.price || 0

  const handleAddNote = () => {
    if (!profileNoteText.trim()) return
    setProfileNotes((prev) => [{ id: Date.now(), text: profileNoteText, date: new Date().toISOString().slice(0, 10), author: 'Admin' }, ...prev])
    setProfileNoteText('')
  }

  const sourceIconMap = {
    Website: Search, 'Google Ads': Search, Google: Search, Referral: Users,
    Instagram: MessageCircle, LinkedIn: UserCheck, Facebook: MessageCircle, 'Walk-in': MapPin,
  }
  const SourceIcon = sourceIconMap[lead.source] || MapPin

  const vaultCategories = [
    { title: 'Credentials', icon: Key, color: 'emerald' },
    { title: 'Documents', icon: FileText, color: 'primary' },
    { title: 'ID Proof', icon: CreditCard, color: 'sky' },
    { title: 'Education Docs', icon: GraduationCap, color: 'violet' },
    { title: 'Certificates', icon: Award, color: 'accent' },
    { title: 'Dues Pending', icon: IndianRupee, color: 'rose' },
    { title: 'Payment Receipts', icon: Receipt, color: 'emerald' },
  ]

  const subtleBg = bgSubtleMap(isDark)

  // Lead score
  const scoreMap = { high: { label: 'Hot', pct: 85, color: 'emerald' }, medium: { label: 'Warm', pct: 55, color: 'accent' }, low: { label: 'Cold', pct: 25, color: 'sky' } }
  const score = scoreMap[lead.priority] || scoreMap.medium
  const scoreBarColor = { emerald: 'bg-emerald-500', accent: 'bg-accent-500', sky: 'bg-sky-500' }

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }} className="space-y-6">
      {/* Back Button */}
      <motion.button whileHover={{ x: -3 }} onClick={onBack}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}
      >
        <ArrowLeft className="w-4 h-4" />Back to Leads
      </motion.button>

      {/* Profile Header Card */}
      <motion.div variants={itemVariants} className={`rounded-2xl p-6 ${cardClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          {/* Avatar + Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br ${avatarGradients[statusColor]} flex-shrink-0`}>
              {lead.avatar}
            </div>
            <div className="min-w-0">
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.name}</h1>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                {lead.course} &middot; Added {relativeDate(lead.date)}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={lead.status} isDark={isDark} />
                <PriorityBadge priority={lead.priority} isDark={isDark} />
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-dark-800 text-dark-400' : 'bg-dark-100 text-dark-500'}`}>
                  <SourceIcon className="w-3 h-3" />{lead.source}
                </span>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => window.open(`tel:${lead.phone}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all">
              <Phone className="w-4 h-4" />Call
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/conversations', { state: { openPhone: lead.phone, leadId: lead.id, leadName: lead.name } })}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all">
              <MessageCircle className="w-4 h-4" />WhatsApp
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onTransfer(lead)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
              <Clock className="w-4 h-4" />Reminder
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onEdit(lead)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
              <Pencil className="w-4 h-4" />Edit
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onDelete(lead)}
              className={`p-2.5 rounded-lg transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}>
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: 'Activities', value: 3, color: 'primary' },
          { icon: Calendar, label: 'Meetings', value: leadMeetings.length || 1, color: 'violet' },
          { icon: AlertCircle, label: 'Pending', value: pendingCount, color: 'accent' },
          { icon: IndianRupee, label: 'Package Value', value: packagePrice ? formatINR(packagePrice) : '—', color: 'emerald' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
            className={`rounded-xl p-4 flex items-center gap-3 ${cardClass}`}>
            <div className={`p-2.5 rounded-lg ${subtleBg[stat.color]}`}>
              <stat.icon className={`w-5 h-5 ${iconColorMap[stat.color]}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
              <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className={`rounded-xl p-1.5 flex items-center gap-1 overflow-x-auto ${cardClass}`}>
        {profileTabs.map((tab) => (
          <motion.button key={tab.key} onClick={() => setActiveTab(tab.key)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-white'
                : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'
            }`}
          >
            {activeTab === tab.key && (
              <motion.div layoutId="activeProfileTab" className="absolute inset-0 bg-primary-600 rounded-lg" transition={{ type: 'spring', duration: 0.4 }} />
            )}
            <span className="relative z-10">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>

          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className={`rounded-xl p-5 ${cardClass}`}>
                <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Contact Information</h3>
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: 'Email', value: lead.email, isLink: true },
                    { icon: Phone, label: 'Phone', value: lead.phone },
                    { icon: MapPin, label: 'Source', value: lead.source },
                    { icon: Calendar, label: 'Date of Inquiry', value: lead.date },
                    { icon: UserCheck, label: 'Assigned To', value: (teamMembers || []).find((m) => m.id === lead.assigned_to)?.name || 'Unassigned' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                        <item.icon className={`w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{item.label}</p>
                        {item.isLink ? (
                          <a href={`mailto:${item.value}`} className="text-sm font-medium text-primary-500 hover:text-primary-400 truncate block">{item.value}</a>
                        ) : (
                          <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {/* Lead Score */}
                <div className={`rounded-xl p-5 ${cardClass}`}>
                  <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Lead Score</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-2xl font-bold ${iconColorMap[score.color]}`}>{score.label}</span>
                    <span className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{score.pct}% match</span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${score.pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${scoreBarColor[score.color]}`} />
                  </div>
                </div>

                {/* Quick Timeline */}
                <div className={`rounded-xl p-5 ${cardClass}`}>
                  <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                    <Activity className="w-4 h-4" />Quick Timeline
                  </h3>
                  <div className="relative pl-6 space-y-4">
                    <div className={`absolute left-[11px] top-2 bottom-2 w-px ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`} />
                    {[
                      { title: `Lead created from ${lead.source}`, time: lead.date, color: 'sky' },
                      { title: `Status: ${statusConfig[lead.status]?.label}`, time: 'Recently', color: statusColor },
                      { title: `Interest in ${lead.course}`, time: lead.date, color: 'accent' },
                      ...(leadFollowUps.length > 0 ? [{ title: 'Follow-up scheduled', time: leadFollowUps[0]?.date || 'Upcoming', color: 'emerald' }] : []),
                    ].map((entry, i) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center ${subtleBg[entry.color]}`}>
                          <div className={`w-2 h-2 rounded-full ${iconColorMap[entry.color].replace('text-', 'bg-')}`} />
                        </div>
                        <div className="ml-2">
                          <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{entry.title}</p>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-600' : 'text-dark-300'}`}>{entry.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Timeline Tab ── */}
          {activeTab === 'timeline' && (
            <div className={`rounded-xl p-5 ${cardClass}`}>
              <h3 className={`text-sm font-semibold mb-5 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                <Activity className="w-4 h-4" />Lead Timeline
              </h3>
              {leadTimeline.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {leadTimeline.map((a) => {
                    const color = a.to_status === 'lost' ? 'rose' : getStatusColor(a.to_status || a.from_status || 'new')
                    const fromLabel = (statusConfig[a.from_status]?.label || a.from_status || '—').toUpperCase()
                    const toLabel = (statusConfig[a.to_status]?.label || a.to_status || '—').toUpperCase()
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${iconColorMap[color].replace('text-', 'bg-')}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{fromLabel} &rarr; {toLabel}</p>
                          <p className={`text-sm mt-0.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{a.description}</p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                            {new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Requirement Tab ── */}
          {activeTab === 'requirement' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`rounded-xl p-5 ${cardClass}`}>
                <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Course Interest</h3>
                <div className={`rounded-lg p-4 mb-4 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                  <div className="flex items-center gap-3">
                    <GraduationCap className={`w-5 h-5 ${iconColorMap.primary}`} />
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.course}</span>
                  </div>
                </div>
                <h4 className={`text-xs font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Preferred Batch Timing</h4>
                <div className="flex flex-wrap gap-2 mb-5">
                  {['Morning', 'Afternoon', 'Evening', 'Weekend'].map((t) => (
                    <button key={t} type="button" onClick={() => onBatchTimingChange(lead, t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      lead.batch_timing === t
                        ? isDark ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                        : isDark ? 'border-dark-700 text-dark-400 hover:border-dark-600' : 'border-dark-200 text-dark-500 hover:border-dark-300'
                    }`}>{t}</button>
                  ))}
                </div>
                <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Budget Range</h4>
                <p className={`text-sm font-medium mb-5 ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>
                  {matchingPackage ? formatINR(matchingPackage.price) : 'Not specified'}
                </p>
              </div>
              <div className="space-y-6">
                <div className={`rounded-xl p-5 ${cardClass}`}>
                  <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Special Requirements</h3>
                  <div className={`rounded-lg p-3 text-sm ${isDark ? 'bg-dark-800 text-dark-300' : 'bg-dark-50 text-dark-600'}`}>
                    {lead.notes || 'No special requirements noted.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Follow-up Tab ── */}
          {activeTab === 'followup' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Follow-ups ({leadFollowUps.length})</h3>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onTransfer(lead)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">
                  <Plus className="w-3.5 h-3.5" />Schedule Follow-up
                </motion.button>
              </div>
              {leadFollowUps.length === 0 ? (
                <div className={`rounded-xl p-8 text-center ${cardClass}`}>
                  <Calendar className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No follow-ups scheduled</p>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onTransfer(lead)}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
                    <Plus className="w-3.5 h-3.5" />Schedule Now
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-3">
                  {leadFollowUps.map((fu) => {
                    const typeConfig = followUpTypes.find((t) => t.key === fu.type)
                    const TypeIcon = typeConfig?.icon || Phone
                    const typeColor = { call: 'sky', email: 'accent', meeting: 'violet', whatsapp: 'emerald' }[fu.type] || 'sky'
                    return (
                      <motion.div key={fu.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 ${cardClass}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${subtleBg[typeColor]}`}>
                            <TypeIcon className={`w-4 h-4 ${iconColorMap[typeColor]}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-semibold capitalize ${isDark ? 'text-white' : 'text-dark-900'}`}>{fu.type}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                fu.status === 'completed'
                                  ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                  : isDark ? 'bg-accent-500/15 text-accent-400' : 'bg-accent-50 text-accent-600'
                              }`}>{fu.status}</span>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{fu.notes}</p>
                            <div className={`flex items-center justify-between mt-2`}>
                              <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fu.date}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fu.time}</span>
                              </div>
                              {fu.status === 'pending' && (
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => { updateFollowUp(fu.id, { status: 'completed' }); showNotification(`Follow-up marked as completed`) }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                                  <CheckCircle2 className="w-3.5 h-3.5" />Mark Complete
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Meeting Tab ── */}
          {activeTab === 'meeting' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Meetings ({leadMeetings.length})</h3>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onScheduleMeeting(lead)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">
                  <Plus className="w-3.5 h-3.5" />Schedule Meeting
                </motion.button>
              </div>
              {leadMeetings.length === 0 ? (
                <div className={`rounded-xl p-8 text-center ${cardClass}`}>
                  <Video className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No meetings scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leadMeetings.map((m) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 ${cardClass}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${subtleBg.violet}`}><Video className={`w-4 h-4 ${iconColorMap.violet}`} /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Meeting</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.status === 'completed' ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600' : isDark ? 'bg-accent-500/15 text-accent-400' : 'bg-accent-50 text-accent-600'}`}>{m.status}</span>
                          </div>
                          <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{m.notes}</p>
                          <div className={`flex items-center justify-between mt-2`}>
                            <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{m.date}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.time}</span>
                            </div>
                            {m.status === 'pending' && (
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => { updateFollowUp(m.id, { status: 'completed' }); showNotification(`Meeting marked as completed`) }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" />Mark Complete
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Package Tab ── */}
          {activeTab === 'package' && (
            <div>
              {matchingPackage ? (
                <div className={`rounded-xl p-6 ${cardClass}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{matchingPackage.name}</h3>
                      <p className={`text-sm mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{matchingPackage.duration} &middot; {matchingPackage.modules} Modules</p>
                    </div>
                    <span className={`text-2xl font-bold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{formatINR(matchingPackage.price)}</span>
                  </div>
                  <p className={`text-sm mb-4 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{matchingPackage.description}</p>
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{matchingPackage.students} enrolled</span>
                    <span className="flex items-center gap-1 text-xs text-accent-500">
                      <Star className="w-3 h-3 fill-accent-500" />{matchingPackage.rating}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {matchingPackage.features.map((f) => (
                      <span key={f} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                        <CheckCircle2 className="w-3 h-3" />{f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        window.open(`mailto:${lead.email}?subject=${encodeURIComponent(`Package Details: ${matchingPackage.name}`)}&body=${encodeURIComponent(`Hi ${lead.name},\n\nHere are the details for the ${matchingPackage.name} course:\n\nDuration: ${matchingPackage.duration}\nModules: ${matchingPackage.modules}\nPrice: ${formatINR(matchingPackage.price)}\n\nFeatures:\n${matchingPackage.features.map(f => `- ${f}`).join('\n')}\n\nBest regards,\nBIX Academy`)}`)
                        showNotification(`Package details sent to ${lead.email}`)
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                      Send Package Details
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (lead.status === 'enrolled') {
                          showNotification('Lead is already enrolled', 'error')
                        } else {
                          onEnroll(lead)
                          setActiveTab('feebill')
                        }
                      }}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">
                      {lead.status === 'enrolled' ? 'Already Enrolled' : 'Assign Package & Enroll'}
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl p-8 text-center ${cardClass}`}>
                  <Package className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No package matched for "{lead.course}"</p>
                </div>
              )}
            </div>
          )}

          {/* ── Fee Bill Tab ── */}
          {activeTab === 'feebill' && (
            <div className={`rounded-xl p-6 ${cardClass}`}>
              <h3 className={`text-lg font-semibold mb-5 ${isDark ? 'text-white' : 'text-dark-900'}`}>Fee Estimate</h3>
              {matchingPackage ? (
                <>
                  <div className={`rounded-lg p-4 mb-5 space-y-3 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Package Fee</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(matchingPackage.price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>GST (18%)</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(Math.round(matchingPackage.price * 0.18))}</span>
                    </div>
                    <div className={`border-t pt-3 flex items-center justify-between ${isDark ? 'border-dark-700' : 'border-dark-200'}`}>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Total</span>
                      <span className={`text-lg font-bold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{formatINR(Math.round(matchingPackage.price * 1.18))}</span>
                    </div>
                  </div>
                  <h4 className={`text-xs font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Payment Plan</h4>
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {['Full Payment', '2 Installments', '3 Installments'].map((plan, i) => (
                      <button key={plan} type="button" onClick={() => setFeePlan(i)} className={`rounded-lg p-3 text-center border cursor-pointer transition-all ${
                        feePlan === i
                          ? isDark ? 'border-primary-500 bg-primary-500/10' : 'border-primary-500 bg-primary-50'
                          : isDark ? 'border-dark-700 hover:border-dark-600' : 'border-dark-200 hover:border-dark-300'
                      }`}>
                        <p className={`text-xs font-semibold ${feePlan === i ? isDark ? 'text-primary-400' : 'text-primary-600' : isDark ? 'text-dark-300' : 'text-dark-600'}`}>{plan}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                          {i === 0 ? formatINR(Math.round(matchingPackage.price * 1.18)) : i === 1 ? `${formatINR(Math.round(matchingPackage.price * 1.18 / 2))} x 2` : `${formatINR(Math.round(matchingPackage.price * 1.18 / 3))} x 3`}
                        </p>
                      </button>
                    ))}
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      if (lead.status !== 'enrolled') {
                        showNotification('Please enroll the student first before generating a fee bill', 'error')
                        return
                      }
                      const invoice = await onGenerateFeeBill(lead, matchingPackage)
                      if (invoice) showNotification(`Fee bill ${invoice.id} ready for ${lead.name} — ${formatINR(invoice.amount)} (see Fees & Billing)`)
                    }}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all ${lead.status === 'enrolled' ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400' : 'bg-dark-600 cursor-not-allowed opacity-60'}`}>
                    Generate Fee Bill
                  </motion.button>
                  <p className={`text-xs text-center mt-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                    {lead.status === 'enrolled' ? 'Student is enrolled — fee bill ready to generate' : 'Fee bill can be generated once the student is enrolled'}
                  </p>
                </>
              ) : (
                <div className="text-center py-6">
                  <IndianRupee className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                  <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No package matched to generate fee estimate</p>
                </div>
              )}
            </div>
          )}

          {/* ── Course / Document Vault Tab ── */}
          {activeTab === 'course' && (
            <div className={`rounded-xl p-6 ${cardClass}`}>
              <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>Document Vault</h3>
              <p className={`text-sm mb-5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Store credentials, documents, and important links for this lead</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {vaultCategories.map((cat) => {
                  const CatIcon = cat.icon
                  const borderColor = {
                    emerald: 'border-l-emerald-500', primary: 'border-l-primary-500', sky: 'border-l-sky-500',
                    violet: 'border-l-violet-500', accent: 'border-l-accent-500', rose: 'border-l-rose-500',
                  }[cat.color]
                  const catCount = leadDocs.filter((d) => d.category === cat.title).length
                  return (
                    <motion.button key={cat.title} type="button" whileHover={{ y: -3 }}
                      onClick={() => { setAddingDocCategory(addingDocCategory === cat.title ? null : cat.title); setDocForm({ title: '', url: '' }) }}
                      className={`text-left rounded-xl p-4 border-l-4 ${borderColor} cursor-pointer transition-all ${
                        addingDocCategory === cat.title
                          ? isDark ? 'bg-dark-800/80 ring-2 ring-primary-500' : 'bg-dark-100 ring-2 ring-primary-500'
                          : isDark ? 'bg-dark-800 hover:bg-dark-800/80' : 'bg-dark-50 hover:bg-dark-100'
                      }`}>
                      <CatIcon className={`w-5 h-5 mb-2 ${iconColorMap[cat.color]}`} />
                      <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{cat.title}</p>
                      <span className={`text-xs font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{catCount > 0 ? `${catCount} entr${catCount === 1 ? 'y' : 'ies'}` : '+ Add'}</span>
                    </motion.button>
                  )
                })}
              </div>

              {addingDocCategory && (
                <div className={`rounded-lg p-4 mb-6 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                  <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Add to {addingDocCategory}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" placeholder="Title (e.g. Aadhaar Card)" value={docForm.title} onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
                    <input type="url" placeholder="Link (Drive, Docs, etc.)" value={docForm.url} onChange={(e) => setDocForm((p) => ({ ...p, url: e.target.value }))}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
                    <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (!docForm.title.trim() || !docForm.url.trim()) return
                        onAddDocument(lead.id, addingDocCategory, docForm.title.trim(), docForm.url.trim())
                        setDocForm({ title: '', url: '' })
                        setAddingDocCategory(null)
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors whitespace-nowrap"
                    >Add</motion.button>
                  </div>
                </div>
              )}

              {leadDocs.length === 0 ? (
                <div className={`rounded-lg p-4 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No entries yet. Pick a category above to add documents and links.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leadDocs.map((doc) => (
                    <div key={doc.id} className={`flex items-center justify-between gap-3 rounded-lg p-3 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{doc.category}</p>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className={`text-sm font-medium truncate block hover:underline ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{doc.title}</a>
                      </div>
                      <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDeleteDocument(doc.id)}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-dark-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-dark-400 hover:text-rose-600 hover:bg-rose-50'}`}>
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Notes Tab ── */}
          {activeTab === 'notes' && (
            <div className={`rounded-xl p-5 ${cardClass}`}>
              <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                <FileText className="w-4 h-4" />Notes
              </h3>
              <div className="flex gap-2 mb-4">
                <textarea rows={3} value={profileNoteText} onChange={(e) => setProfileNoteText(e.target.value)} placeholder="Add a note..."
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddNote}
                  className="self-end px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors">
                  Add Note
                </motion.button>
              </div>
              <div className="space-y-3">
                {profileNotes.map((note) => (
                  <div key={note.id} className={`rounded-lg p-3 text-sm ${isDark ? 'bg-dark-800/80' : 'bg-dark-50'}`}>
                    <p className={isDark ? 'text-dark-300' : 'text-dark-600'}>{note.text}</p>
                    <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-600' : 'text-dark-400'}`}>{note.author} &middot; {note.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function Leads() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { leads: leadsData, addLead, updateLead, deleteLead, updateLeadStatus, takeOverLead, followUps: followUpsData, setFollowUps: setFollowUpsData, addFollowUp, updateFollowUp, leadActivities, addActivity, enrollLead, generateFeeBill, packages, teamMembers, leadDocuments, addLeadDocument, deleteLeadDocument } = useData()
  const location = useLocation()
  const navigate = useNavigate()

  const [selectedLead, setSelectedLead] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const sortField = 'date'
  const sortDirection = 'desc'
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(null)
  const [transferModalType, setTransferModalType] = useState('call')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [activeProfileTab, setActiveProfileTab] = useState('overview')
  const [notification, setNotification] = useState(null)
  const [statusDropdownId, setStatusDropdownId] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [showRNRModal, setShowRNRModal] = useState(null)
  const [showLostModal, setShowLostModal] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Scroll to top whenever this page is landed on (e.g. navigating from Dashboard)
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    window.scrollTo(0, 0)
  }, [])

  // Auto-open the Add Lead modal when navigated here with that intent (e.g. Dashboard's "Add Lead" quick action)
  useEffect(() => {
    if (location.state?.openAddLeadModal) {
      setShowAddModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  // Auto-open a specific lead's profile when navigated here with that intent
  // (e.g. the "View Lead" link from a Conversations thread)
  useEffect(() => {
    if (location.state?.openLeadId != null) {
      const found = leadsData.find((l) => l.id === location.state.openLeadId)
      if (found) setSelectedLead(found)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate, leadsData])

  const showNotification = useCallback((message, type = 'success') => setNotification({ message, type }), [])
  const importFileRef = useRef(null)

  const handleImportLeads = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      let imported = 0
      lines.slice(1).forEach((line) => {
        const cols = line.split(',').map(c => c.trim())
        if (cols.length < 3) return
        const nameIdx = headers.indexOf('name')
        const emailIdx = headers.indexOf('email')
        const phoneIdx = headers.indexOf('phone')
        const courseIdx = headers.indexOf('course')
        const sourceIdx = headers.indexOf('source')
        const name = cols[nameIdx >= 0 ? nameIdx : 0] || ''
        const email = cols[emailIdx >= 0 ? emailIdx : 1] || ''
        const phone = cols[phoneIdx >= 0 ? phoneIdx : 2] || ''
        const course = cols[courseIdx >= 0 ? courseIdx : 3] || 'Full Stack Development'
        const source = cols[sourceIdx >= 0 ? sourceIdx : 4] || 'Website'
        if (!name) return
        const nameParts = name.trim().split(' ')
        const avatar = nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : name.trim().slice(0, 2).toUpperCase()
        addLead({ id: Date.now() + imported, name, email, phone, course, source, avatar, status: 'new', priority: 'medium', date: new Date().toISOString().slice(0, 10), notes: '' })
        imported++
      })
      showNotification(imported > 0 ? `${imported} lead(s) imported successfully` : 'No valid leads found in file', imported > 0 ? 'success' : 'error')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const filteredLeads = useMemo(() => {
    let result = [...leadsData]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.course.toLowerCase().includes(q))
    }
    if (statusFilter === 'Today') {
      const todayStr = new Date().toISOString().slice(0, 10)
      result = result.filter((l) => l.date === todayStr)
    } else if (statusFilter === 'Not Attempted') {
      result = result.filter((l) => l.status === 'new')
    } else if (statusFilter === 'Meeting') {
      const meetingLeadNames = new Set(followUpsData.filter((f) => f.type === 'meeting' && f.status === 'pending').map((f) => f.lead))
      result = result.filter((l) => meetingLeadNames.has(l.name))
    } else if (statusFilter !== 'All') {
      result = result.filter((l) => l.status === statusFilter.toLowerCase())
    }
    if (sourceFilter !== 'All') {
      const sf = sourceFilter.toLowerCase()
      result = result.filter((l) => {
        const src = l.source.toLowerCase()
        if (sf === 'google') return src.includes('google')
        if (sf === 'social') return ['instagram', 'facebook', 'linkedin'].some((s) => src.includes(s))
        return src.includes(sf)
      })
    }
    result.sort((a, b) => {
      let aVal = a[sortField], bVal = b[sortField]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [leadsData, followUpsData, searchQuery, statusFilter, sourceFilter, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sourceFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / LEADS_PER_PAGE))

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * LEADS_PER_PAGE
    return filteredLeads.slice(start, start + LEADS_PER_PAGE)
  }, [filteredLeads, currentPage])

  const pageNumbers = useMemo(() => {
    const maxButtons = 5
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    const end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    const pages = []
    for (let p = start; p <= end; p++) pages.push(p)
    return pages
  }, [currentPage, totalPages])

  const statusCounts = useMemo(() => {
    const counts = {}
    Object.keys(statusConfig).forEach((s) => { counts[s] = leadsData.filter((l) => l.status === s).length })
    return counts
  }, [leadsData])

  const handleAddLead = (newLead) => { addLead(newLead); setShowAddModal(false); showNotification(`${newLead.name} added as a new lead`) }

  const handleEditSave = (updatedLead) => {
    updateLead(updatedLead)
    setEditingLead(null)
    const avatar = updatedLead.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    setSelectedLead((prev) => (prev && prev.id === updatedLead.id ? { ...prev, ...updatedLead, avatar } : prev))
    showNotification(`${updatedLead.name}'s information updated`)
  }

  const handleStatusChange = (leadId, newStatus) => {
    updateLeadStatus(leadId, newStatus)
    setStatusDropdownId(null)
    setSelectedLead((prev) => (prev && prev.id === leadId ? { ...prev, status: newStatus } : prev))
    showNotification(`Status updated to ${statusConfig[newStatus]?.label}`)
  }

  const handleDeleteLead = (leadId) => {
    const lead = leadsData.find((l) => l.id === leadId)
    deleteLead(leadId)
    setShowDeleteConfirm(null)
    setSelectedLead(null)
    setActiveProfileTab('overview')
    showNotification(lead ? `${lead.name} has been deleted` : 'Lead deleted')
  }

  const handleTransferSubmit = (lead, form) => {
    const timeStr = new Date(`2000-01-01T${form.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const existing = followUpsData.find((f) => f.lead === lead.name)
    if (existing) {
      updateFollowUp(existing.id, { type: form.type, date: form.date, time: timeStr, notes: form.notes, priority: form.priority, status: 'pending' })
    } else {
      addFollowUp({ id: Date.now(), lead: lead.name, type: form.type, date: form.date, time: timeStr, notes: form.notes, status: 'pending', priority: form.priority })
    }
    addActivity(lead.id, lead.status, lead.status, `${form.type.toUpperCase()} follow-up scheduled for ${form.date} ${timeStr}`)
    setShowTransferModal(null)
    showNotification(`Follow-up scheduled for ${lead.name}`)
  }

  const handleTakeOver = (lead) => {
    takeOverLead(lead.id)
    showNotification(`You've taken over ${lead.name}`)
  }

  const handleBatchTimingChange = (lead, timing) => {
    const newTiming = lead.batch_timing === timing ? null : timing
    updateLead({ ...lead, batch_timing: newTiming })
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, batch_timing: newTiming } : prev))
  }

  const handleEnrollLead = (lead) => {
    const pkg = packages.find((p) => p.name.toLowerCase() === lead.course.toLowerCase())
    enrollLead(lead, pkg)
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, status: 'enrolled' } : prev))
    showNotification(`${lead.name} has been enrolled in ${lead.course}`)
  }

  const handleRNRSubmit = (lead, form) => {
    const timeStr = new Date(`2000-01-01T${form.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const noteText = `Ring No Response (RNR).${form.notes ? ` ${form.notes}` : ''}`
    const existing = followUpsData.find((f) => f.lead === lead.name)
    if (existing) {
      updateFollowUp(existing.id, { type: 'call', date: form.date, time: timeStr, notes: noteText, priority: lead.priority, status: 'pending' })
    } else {
      addFollowUp({ id: Date.now(), lead: lead.name, type: 'call', date: form.date, time: timeStr, notes: noteText, status: 'pending', priority: lead.priority })
    }
    addActivity(lead.id, lead.status, lead.status, `CALL follow-up marked NOT_ATTEMPT — next attempt ${form.date} ${timeStr}`)
    setShowRNRModal(null)
    showNotification(`Marked RNR — next attempt scheduled for ${lead.name}`)
  }

  const handleLostSubmit = (lead, reason) => {
    updateLead({ ...lead, status: 'lost', notes: `${lead.notes ? `${lead.notes}\n` : ''}[Lost] ${reason}` }, reason)
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, status: 'lost' } : prev))
    setShowLostModal(null)
    showNotification(`${lead.name} marked as Lost`)
  }

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const inputClass = isDark
    ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
    : 'bg-white border-dark-200 text-dark-900 placeholder-dark-400 focus:border-primary-500 focus:ring-primary-500/20'

  const columns = [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Contact' }, { key: 'course', label: 'Course Interested' },
    { key: 'source', label: 'Source' }, { key: 'agent', label: 'Agent' }, { key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' }, { key: 'date', label: 'Date' },
  ]

  const agentName = (lead) => teamMembers.find((m) => m.id === lead.assigned_to)?.name || 'Unassigned'

  return (
    <>
      <Toast notification={notification} onDismiss={() => setNotification(null)} isDark={isDark} />

      <AnimatePresence mode="wait">
        {selectedLead ? (
          <LeadProfileView
            key="profile"
            lead={selectedLead}
            isDark={isDark}
            onBack={() => { setSelectedLead(null); setActiveProfileTab('overview') }}
            onEdit={(lead) => setEditingLead(lead)}
            onTransfer={(lead) => { setTransferModalType('call'); setShowTransferModal(lead) }}
            onScheduleMeeting={(lead) => { setTransferModalType('meeting'); setShowTransferModal(lead) }}
            onDelete={(lead) => setShowDeleteConfirm(lead)}
            onStatusChange={handleStatusChange}
            onEnroll={handleEnrollLead}
            onBatchTimingChange={handleBatchTimingChange}
            onGenerateFeeBill={generateFeeBill}
            leadDocuments={leadDocuments}
            onAddDocument={addLeadDocument}
            onDeleteDocument={deleteLeadDocument}
            followUpsData={followUpsData}
            setFollowUpsData={setFollowUpsData}
            updateFollowUp={updateFollowUp}
            leadActivities={leadActivities}
            cardClass={cardClass}
            inputClass={inputClass}
            activeTab={activeProfileTab}
            setActiveTab={setActiveProfileTab}
            showNotification={showNotification}
            packages={packages}
            teamMembers={teamMembers}
          />
        ) : (
          <motion.div key="list" className="space-y-6" variants={containerVariants} initial="hidden" animate="visible" exit={{ opacity: 0, x: -40 }}>
            {/* Page Header */}
            <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-dark-900'}`}>Lead Management</h1>
                <p className={`mt-1 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Track and convert prospective students</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all">
                  <Plus className="w-4 h-4" />Add New Lead
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => importFileRef.current?.click()}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                  <Upload className="w-4 h-4" />Import Leads
                </motion.button>
                <input ref={importFileRef} type="file" accept=".csv" className="hidden" onChange={handleImportLeads} />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const csv = 'Name,Email,Phone,Course,Source,Status,Priority,Date\n' +
                      leadsData.map(l => `${l.name},${l.email},${l.phone},${l.course},${l.source},${l.status},${l.priority},${l.date}`).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'leads-export.csv'; a.click(); URL.revokeObjectURL(url)
                    showNotification('Leads exported successfully')
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                  <Download className="w-4 h-4" />Export
                </motion.button>
              </div>
            </motion.div>

            {/* Filter Bar */}
            <motion.div variants={itemVariants} className={`rounded-xl p-4 ${cardClass}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                  <input type="text" placeholder="Search leads by name, email or course..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-all outline-none focus:ring-2 ${inputClass}`} />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                  {statusOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
                </select>
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
                  className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                  {sourceOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s}</option>)}
                </select>
              </div>
            </motion.div>

            {/* Status Overview — click a bucket to filter the table below */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9 gap-3">
              {(() => {
                const countColor = {
                  sky: isDark ? 'text-sky-400' : 'text-sky-600', accent: isDark ? 'text-accent-400' : 'text-accent-600',
                  emerald: isDark ? 'text-emerald-400' : 'text-emerald-600', violet: isDark ? 'text-violet-400' : 'text-violet-600',
                  primary: isDark ? 'text-primary-400' : 'text-primary-600', rose: isDark ? 'text-rose-400' : 'text-rose-600',
                  slate: isDark ? 'text-dark-300' : 'text-dark-600',
                }
                const subtleBg = bgSubtleMap(isDark)
                const todayStr = new Date().toISOString().slice(0, 10)
                const todayCount = leadsData.filter((l) => l.date === todayStr).length
                const meetingLeadNames = new Set(followUpsData.filter((f) => f.type === 'meeting' && f.status === 'pending').map((f) => f.lead))
                const meetingCount = leadsData.filter((l) => meetingLeadNames.has(l.name)).length
                const buckets = [
                  { key: 'all', label: 'All Leads', filterValue: 'All', color: 'slate', icon: Users, count: leadsData.length },
                  { key: 'today', label: 'Today', filterValue: 'Today', color: 'sky', icon: Calendar, count: todayCount },
                  { key: 'meeting', label: 'Meeting', filterValue: 'Meeting', color: 'violet', icon: Video, count: meetingCount },
                  { key: 'not-attempted', label: 'Not Attempted', filterValue: 'Not Attempted', color: 'rose', icon: AlertCircle, count: statusCounts.new || 0 },
                  ...Object.entries(statusConfig).filter(([key]) => key !== 'new').map(([key, cfg]) => ({ key, label: cfg.label, filterValue: cfg.label, color: cfg.color, icon: cfg.icon, count: statusCounts[key] })),
                ]
                return buckets.map((b, i) => {
                  const Icon = b.icon
                  const isActive = statusFilter === b.filterValue
                  return (
                    <motion.button
                      key={b.key}
                      type="button"
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                      whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setStatusFilter(b.filterValue)}
                      className={`min-w-0 rounded-xl p-4 flex items-center gap-3 text-left cursor-pointer transition-all ${cardClass} ${
                        isActive ? 'ring-2 ring-primary-500 border-primary-500' : ''
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${subtleBg[b.color] || subtleBg.slate}`}><Icon className={`w-4 h-4 ${iconColorMap[b.color] || countColor.slate}`} /></div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium leading-tight ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{b.label}</p>
                        <p className={`text-lg font-bold ${countColor[b.color] || countColor.slate}`}>{b.count}</p>
                      </div>
                    </motion.button>
                  )
                })
              })()}
            </motion.div>

            {/* Leads Table */}
            <motion.div variants={itemVariants} className={`rounded-xl overflow-hidden ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                      {columns.map((col) => (
                        <th key={col.key}
                          className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                          {col.label}
                        </th>
                      ))}
                      <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Actions</th>
                    </tr>
                  </thead>
                  <AnimatePresence mode="popLayout">
                    <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                      {paginatedLeads.map((lead, i) => {
                        const avatarColors = isDark ? avatarColorsDark : avatarColorsLight
                        const sColor = getStatusColor(lead.status)
                        return (
                          <motion.tr key={lead.id} variants={rowVariants} initial="hidden" animate="visible" exit="hidden" transition={{ delay: i * 0.03 }} layout
                            className={`transition-colors ${isDark ? 'hover:bg-dark-800/60' : 'hover:bg-dark-50/60'}`}>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${avatarColors[sColor]}`}>{lead.avatar}</div>
                                <span onClick={() => setSelectedLead(lead)}
                                  className={`font-medium cursor-pointer hover:underline ${isDark ? 'text-dark-100 hover:text-primary-400' : 'text-dark-900 hover:text-primary-600'}`}>
                                  {lead.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className={`text-xs ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{lead.email}</div>
                              <div className={`text-xs mt-0.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{lead.phone}</div>
                            </td>
                            <td className={`px-4 py-3.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{lead.course}</td>
                            <td className={`px-4 py-3.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.source}</td>
                            <td className={`px-4 py-3.5 text-xs font-medium ${lead.assigned_to ? (isDark ? 'text-dark-200' : 'text-dark-700') : (isDark ? 'text-dark-600' : 'text-dark-400')}`}>{agentName(lead)}</td>
                            <td className="px-4 py-3.5">
                              <div className="relative">
                                <StatusBadge status={lead.status} isDark={isDark} onClick={() => setStatusDropdownId(statusDropdownId === lead.id ? null : lead.id)} />
                                <AnimatePresence>
                                  {statusDropdownId === lead.id && (
                                    <InlineStatusDropdown currentStatus={lead.status} onSelect={(s) => handleStatusChange(lead.id, s)} onClose={() => setStatusDropdownId(null)} isDark={isDark} />
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                            <td className="px-4 py-3.5"><PriorityBadge priority={lead.priority} isDark={isDark} /></td>
                            <td className={`px-4 py-3.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`} title={lead.date}>{relativeDate(lead.date)}</td>
                            <td className="px-4 py-3.5">
                              <div className="relative inline-block">
                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setActionMenuId(actionMenuId === lead.id ? null : lead.id)}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700' : 'bg-dark-100 text-dark-600 hover:text-dark-900 hover:bg-dark-200'}`}>
                                  Action
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </motion.button>
                                <AnimatePresence>
                                  {actionMenuId === lead.id && (
                                    <LeadActionMenu
                                      lead={lead}
                                      isDark={isDark}
                                      onClose={() => setActionMenuId(null)}
                                      onScheduleFollowUp={(l) => { setTransferModalType('call'); setShowTransferModal(l) }}
                                      onScheduleMeeting={(l) => { setTransferModalType('meeting'); setShowTransferModal(l) }}
                                      onRNR={(l) => setShowRNRModal(l)}
                                      onEnroll={handleEnrollLead}
                                      onLost={(l) => setShowLostModal(l)}
                                      onTakeOver={handleTakeOver}
                                      onEdit={(l) => setEditingLead(l)}
                                      onDelete={(l) => setShowDeleteConfirm(l)}
                                    />
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </AnimatePresence>
                </table>
                {filteredLeads.length === 0 && (
                  <div className={`text-center py-12 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No leads found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
                  </div>
                )}
              </div>

              {filteredLeads.length > 0 && (
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t ${isDark ? 'border-dark-800' : 'border-dark-100'}`}>
                  <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                    Showing {(currentPage - 1) * LEADS_PER_PAGE + 1}-{Math.min(currentPage * LEADS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length} leads
                  </p>
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      whileHover={currentPage === 1 ? {} : { scale: 1.05 }}
                      whileTap={currentPage === 1 ? {} : { scale: 0.95 }}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'}`}>
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </motion.button>

                    {pageNumbers[0] > 1 && (
                      <span className={`px-1.5 text-xs ${isDark ? 'text-dark-600' : 'text-dark-400'}`}>&hellip;</span>
                    )}

                    {pageNumbers.map((page) => (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                            : isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'
                        }`}>
                        {page}
                      </motion.button>
                    ))}

                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <span className={`px-1.5 text-xs ${isDark ? 'text-dark-600' : 'text-dark-400'}`}>&hellip;</span>
                    )}

                    <motion.button
                      whileHover={currentPage === totalPages ? {} : { scale: 1.05 }}
                      whileTap={currentPage === totalPages ? {} : { scale: 0.95 }}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'}`}>
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddLeadModal isDark={isDark} onClose={() => setShowAddModal(false)} onAdd={handleAddLead} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {editingLead && <EditLeadModal key={`edit-${editingLead.id}`} lead={editingLead} isDark={isDark} onClose={() => setEditingLead(null)} onSave={handleEditSave} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showTransferModal && <TransferModal key={`transfer-${showTransferModal.id}`} lead={showTransferModal} isDark={isDark} onClose={() => setShowTransferModal(null)} onSubmit={handleTransferSubmit} inputClass={inputClass} cardClass={cardClass} initialType={transferModalType} />}
      </AnimatePresence>
      <AnimatePresence>
        {showRNRModal && <RNRModal key={`rnr-${showRNRModal.id}`} lead={showRNRModal} isDark={isDark} onClose={() => setShowRNRModal(null)} onSubmit={handleRNRSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showLostModal && <LostReasonModal key={`lost-${showLostModal.id}`} lead={showLostModal} isDark={isDark} onClose={() => setShowLostModal(null)} onSubmit={handleLostSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmDialog
            message={`Are you sure you want to delete ${showDeleteConfirm.name}? This action cannot be undone.`}
            onConfirm={() => handleDeleteLead(showDeleteConfirm.id)}
            onCancel={() => setShowDeleteConfirm(null)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default Leads
