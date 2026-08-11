import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Upload, Download, Pencil, Phone, Users, UserCheck,
  GraduationCap, UserX, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X,
  Trash2, Mail, Calendar, Clock, MapPin, Star, MessageCircle,
  PhoneCall, Video, CheckCircle2, AlertCircle, Package, IndianRupee, FileText,
  Activity, ArrowLeft, Key, CreditCard, Award, Receipt, SlidersHorizontal,
  Eye, MoreHorizontal, UserCog, Moon, RotateCcw
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import SendEmailModal from '../components/SendEmailModal'
import AnchoredMenu from '../components/AnchoredMenu'
import { supabase } from '../lib/supabase'
import { LEAD_STATUSES, ALL_STATUS_KEYS, PIPELINE_STAGE_KEYS } from '../lib/leadStatus'
import { TIMELINE_FILTERS, activityTypeInfo, relativeDayAt, dayGroupLabel } from '../lib/activityTypes'

// ─── CONFIG ────────────────────────────────────────────────────────────
// Single source of truth is lib/leadStatus.jsx (shared with Pipeline.jsx)
// — this used to be its own separate hardcoded copy that had already
// drifted from Pipeline's (different label for "new", missing stages).
const statusConfig = LEAD_STATUSES

const priorityConfig = { high: 'rose', medium: 'accent', low: 'emerald' }
const LEADS_PER_PAGE = 10
const sourceOptions = ['All', 'Website', 'Google', 'Referral', 'Social', 'WhatsApp', 'Walk-in']
// Status filter options are derived from the same lifecycle keys as the
// pipeline/stepper (lib/leadStatus.jsx) — no separate hardcoded status list.
const statusFilterOptions = [{ key: 'all', label: 'All Status' }, ...ALL_STATUS_KEYS.map((key) => ({ key, label: LEAD_STATUSES[key].label }))]
const priorityFilterOptions = [{ key: 'All', label: 'All Priority' }, { key: 'high', label: 'High' }, { key: 'medium', label: 'Medium' }, { key: 'low', label: 'Low' }]
const followUpDueOptions = ['All', 'Overdue', 'Today', 'Tomorrow', 'No follow-up']
// The 7 cards the sales-list summary row shows — deliberately a subset of
// the full lifecycle (Package Shared/Negotiation/Lost/Nurture stay reachable
// via the Status filter instead) so the row never gets overcrowded.
const SUMMARY_CARD_STATUS_KEYS = ['new', 'contacted', 'qualified', 'counselling', 'follow_up', 'enrolled']

const courseOptions = [
  'Full Stack Development', 'Data Science & AI', 'UI/UX Design', 'Digital Marketing',
  'Cloud Computing', 'Cybersecurity', 'Mobile App Development', 'DevOps Engineering', 'Python Programming',
]

const sourceFormOptions = ['Website', 'Google Ads', 'Referral', 'Instagram', 'LinkedIn', 'Facebook', 'WhatsApp', 'Walk-in']

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
  indigo: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  slate: 'bg-dark-600/30 text-dark-300 border border-dark-500/30',
}
const badgeStylesLight = {
  sky: 'bg-sky-50 text-sky-600 border border-sky-200',
  accent: 'bg-accent-50 text-accent-600 border border-accent-200',
  emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  violet: 'bg-violet-50 text-violet-600 border border-violet-200',
  primary: 'bg-primary-50 text-primary-600 border border-primary-200',
  rose: 'bg-rose-50 text-rose-600 border border-rose-200',
  indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
  cyan: 'bg-cyan-50 text-cyan-600 border border-cyan-200',
  amber: 'bg-amber-50 text-amber-600 border border-amber-200',
  slate: 'bg-dark-100 text-dark-600 border border-dark-200',
}
const avatarColorsDark = {
  sky: 'bg-sky-500/20 text-sky-400', accent: 'bg-accent-500/20 text-accent-400',
  emerald: 'bg-emerald-500/20 text-emerald-400', violet: 'bg-violet-500/20 text-violet-400',
  primary: 'bg-primary-500/20 text-primary-400', rose: 'bg-rose-500/20 text-rose-400',
  indigo: 'bg-indigo-500/20 text-indigo-400', cyan: 'bg-cyan-500/20 text-cyan-400',
  amber: 'bg-amber-500/20 text-amber-400', slate: 'bg-dark-600/30 text-dark-300',
}
const avatarColorsLight = {
  sky: 'bg-sky-100 text-sky-700', accent: 'bg-accent-100 text-accent-700',
  emerald: 'bg-emerald-100 text-emerald-700', violet: 'bg-violet-100 text-violet-700',
  primary: 'bg-primary-100 text-primary-700', rose: 'bg-rose-100 text-rose-700',
  indigo: 'bg-indigo-100 text-indigo-700', cyan: 'bg-cyan-100 text-cyan-700',
  amber: 'bg-amber-100 text-amber-700', slate: 'bg-dark-100 text-dark-600',
}
const avatarGradients = {
  sky: 'from-sky-500 to-sky-600', accent: 'from-accent-500 to-accent-600',
  emerald: 'from-emerald-500 to-emerald-600', violet: 'from-violet-500 to-violet-600',
  primary: 'from-primary-500 to-primary-600', rose: 'from-rose-500 to-rose-600',
  indigo: 'from-indigo-500 to-indigo-600', cyan: 'from-cyan-500 to-cyan-600',
  amber: 'from-amber-500 to-amber-600', slate: 'from-dark-500 to-dark-600',
}
const iconColorMap = {
  sky: 'text-sky-500', accent: 'text-accent-500', emerald: 'text-emerald-500',
  violet: 'text-violet-500', primary: 'text-primary-500', rose: 'text-rose-500',
  indigo: 'text-indigo-500', cyan: 'text-cyan-500', amber: 'text-amber-500',
  slate: 'text-dark-500',
}
const bgSubtleMap = (isDark) => ({
  sky: isDark ? 'bg-sky-500/10' : 'bg-sky-50',
  accent: isDark ? 'bg-accent-500/10' : 'bg-accent-50',
  emerald: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
  violet: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
  primary: isDark ? 'bg-primary-500/10' : 'bg-primary-50',
  rose: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
  indigo: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50',
  cyan: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
  amber: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
  slate: isDark ? 'bg-dark-600/20' : 'bg-dark-100',
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

// A lead's "next follow-up" is its earliest still-pending follow-up/meeting
// (matched by lead name, same convention used throughout this file already).
function getNextFollowUp(leadName, followUpsData) {
  const pending = followUpsData.filter((f) => f.lead === leadName && f.status === 'pending')
  if (!pending.length) return null
  return [...pending].sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`))[0]
}

function followUpDueInfo(fu) {
  if (!fu) return { label: 'No follow-up', tone: 'none' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const fuDate = new Date(`${fu.date}T00:00:00`)
  const diffDays = Math.round((fuDate - today) / 86400000)
  if (diffDays < 0) return { label: 'Overdue', tone: 'overdue' }
  if (diffDays === 0) return { label: 'Today', tone: 'today' }
  if (diffDays === 1) return { label: 'Tomorrow', tone: 'tomorrow' }
  return { label: fuDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), tone: 'later' }
}

// The single most useful thing to tell a sales executive: what to do next,
// derived only from real pending follow-ups/meetings, real invoice balances,
// and real lead status/call history — never a guessed or generic
// recommendation. Fixed priority order (not AI, just ranked rules):
//   1. Overdue follow-up/meeting  2. Due today  3. Scheduled meeting (future)
//   4. Pending payment  5. Upcoming follow-up  6. No action (refined by
//   status/call history so it still points at something real, e.g. a
//   package-shared lead or a lead that's never been called).
function getNextAction(lead, leadFollowUps, feeInvoice, hasCallActivity) {
  const pending = (leadFollowUps || []).filter((f) => f.status === 'pending')
    .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`))
  const nextItem = pending[0]
  const info = nextItem ? followUpDueInfo(nextItem) : null
  const followupKind = lead?.status === 'nurture' ? 'nurture' : 'followup'

  // 1 + 2: whichever pending item is overdue or due today wins, regardless
  // of whether it's a call/follow-up or a scheduled meeting.
  if (nextItem && (info.tone === 'overdue' || info.tone === 'today')) {
    return { kind: nextItem.type === 'meeting' ? 'meeting' : followupKind, item: nextItem, info }
  }

  // 3: a scheduled meeting further out still outranks a payment or a plain
  // follow-up — counselling sessions are time-fixed commitments.
  const nextMeeting = pending.find((f) => f.type === 'meeting')
  if (nextMeeting) {
    return { kind: 'meeting', item: nextMeeting, info: followUpDueInfo(nextMeeting) }
  }

  // 4: pending payment
  if (feeInvoice && feeInvoice.balance > 0) {
    return { kind: 'payment', item: feeInvoice }
  }

  // 5: upcoming (non-meeting) follow-up
  if (nextItem) {
    return { kind: followupKind, item: nextItem, info }
  }

  // 6: nothing scheduled — still point at something real instead of a
  // generic "no action", based on actual status/contact history.
  if (lead?.status === 'package_shared') return { kind: 'package_followup' }
  if (!hasCallActivity && lead?.status !== 'enrolled' && lead?.status !== 'lost') return { kind: 'call_new' }
  return { kind: 'none' }
}

// Compact {emoji, label} summary for the Lead List column — same ranked
// action, just condensed to fit a table cell/mobile card.
function nextActionSummary(action) {
  if (action.kind === 'meeting') {
    const { info } = action
    if (info.tone === 'overdue') return { emoji: '⚠️', label: 'Overdue counselling' }
    if (info.tone === 'today') return { emoji: '📅', label: 'Counselling today' }
    if (info.tone === 'tomorrow') return { emoji: '📅', label: 'Counselling tomorrow' }
    return { emoji: '📅', label: `Counselling ${info.label}` }
  }
  if (action.kind === 'followup' || action.kind === 'nurture') {
    const { info, item } = action
    const isCall = item.type === 'call'
    const verb = action.kind === 'nurture' ? 'Contact lead' : (isCall ? 'Call' : 'Follow-up')
    if (info.tone === 'overdue') return { emoji: '⚠️', label: action.kind === 'nurture' ? 'Overdue — contact lead' : 'Overdue follow-up' }
    if (info.tone === 'today') return { emoji: isCall && action.kind !== 'nurture' ? '📞' : '📅', label: `${verb} today` }
    if (info.tone === 'tomorrow') return { emoji: '📅', label: `${verb} tomorrow` }
    return { emoji: '📅', label: `${verb} ${info.label}` }
  }
  if (action.kind === 'payment') return { emoji: '💰', label: 'Payment pending' }
  if (action.kind === 'package_followup') return { emoji: '📦', label: 'Follow up with lead' }
  if (action.kind === 'call_new') return { emoji: '📞', label: 'Call lead' }
  return { emoji: '📅', label: 'Schedule follow-up' }
}

function NextActionCard({ lead, leadFollowUps, feeInvoice, hasCallActivity, isDark, cardClass, onCall, onComplete, onViewMeeting, onWhatsAppReminder, onViewFeeBill, onScheduleFollowUp }) {
  const action = getNextAction(lead, leadFollowUps, feeInvoice, hasCallActivity)
  // Static class strings only — Tailwind can't pick up `border-l-${color}-500`
  // template literals at build time, so the tone->class mapping is spelled
  // out explicitly instead of interpolated.
  const accentBorder = { overdue: 'border-l-rose-500', today: 'border-l-amber-500', tomorrow: 'border-l-sky-500', later: 'border-l-primary-500' }
  const btnPrimary = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all'
  const btnSecondary = `inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`
  const label = `text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`
  const headline = `text-base font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`

  if (action.kind === 'followup' || action.kind === 'meeting' || action.kind === 'nurture') {
    const { item, info } = action
    const isMeeting = action.kind === 'meeting'
    const verb = isMeeting ? 'Counselling' : action.kind === 'nurture' ? 'Contact lead' : 'Follow-up'
    const when = isMeeting
      ? (info.tone === 'overdue' ? `overdue — was due ${item.date} at ${item.time}`
        : info.tone === 'today' ? `today at ${item.time}`
        : info.tone === 'tomorrow' ? `tomorrow at ${item.time}`
        : `on ${info.label} at ${item.time}`)
      : (info.tone === 'overdue' ? `overdue — was due ${item.date} at ${item.time}`
        : info.tone === 'today' ? `due today at ${item.time}`
        : info.tone === 'tomorrow' ? `tomorrow at ${item.time}`
        : `on ${info.label} at ${item.time}`)
    return (
      <motion.div variants={itemVariants} className={`rounded-2xl p-5 border-l-4 ${accentBorder[info.tone] || accentBorder.later} ${cardClass}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <p className={label}>Next Action</p>
            <p className={headline}>{verb} {when}</p>
            {item.notes && <p className={`text-sm mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{item.notes}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isMeeting ? (
              <>
                <button onClick={onViewMeeting} className={btnPrimary}><Video className="w-4 h-4" />View Meeting</button>
                <button onClick={onWhatsAppReminder} className={btnSecondary}><MessageCircle className="w-4 h-4" />WhatsApp Reminder</button>
              </>
            ) : (
              <>
                <button onClick={onCall} className={btnPrimary}><Phone className="w-4 h-4" />Call</button>
                <button onClick={() => onComplete(item)} className={btnSecondary}><CheckCircle2 className="w-4 h-4" />Complete Follow-up</button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  if (action.kind === 'payment') {
    return (
      <motion.div variants={itemVariants} className={`rounded-2xl p-5 border-l-4 border-l-rose-500 ${cardClass}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className={label}>Next Action</p>
            <p className={headline}>Payment pending — {formatINR(action.item.balance)}</p>
          </div>
          <button onClick={onViewFeeBill} className={btnPrimary}><IndianRupee className="w-4 h-4" />View Fee Bill</button>
        </div>
      </motion.div>
    )
  }

  if (action.kind === 'package_followup') {
    return (
      <motion.div variants={itemVariants} className={`rounded-2xl p-5 border-l-4 border-l-primary-500 ${cardClass}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className={label}>Next Action</p>
            <p className={headline}>Follow up with lead — package shared</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onCall} className={btnPrimary}><Phone className="w-4 h-4" />Call</button>
            <button onClick={onScheduleFollowUp} className={btnSecondary}><Calendar className="w-4 h-4" />Schedule Follow-up</button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (action.kind === 'call_new') {
    return (
      <motion.div variants={itemVariants} className={`rounded-2xl p-5 border-l-4 border-l-amber-500 ${cardClass}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className={label}>Next Action</p>
            <p className={headline}>Call lead — no contact made yet</p>
          </div>
          <button onClick={onCall} className={btnPrimary}><Phone className="w-4 h-4" />Call</button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={itemVariants} className={`rounded-2xl p-5 border-l-4 ${isDark ? 'border-l-dark-700' : 'border-l-dark-200'} ${cardClass}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className={label}>Next Action</p>
          <p className={`text-base font-semibold ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>No action scheduled</p>
        </div>
        {lead.status !== 'enrolled' && lead.status !== 'lost' && (
          <button onClick={onScheduleFollowUp} className={btnPrimary}><Calendar className="w-4 h-4" />Schedule Follow-up</button>
        )}
      </div>
    </motion.div>
  )
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

// The Next Action badge is what lets a rep glance down the Lead List and
// know exactly which leads need work today — so overdue/today get loud
// colors instead of blending in with the rest of the row, same convention
// as the old Next Follow-up badge it replaces.
function NextActionBadge({ lead, leadFollowUps, feeInvoice, hasCallActivity, isDark }) {
  const action = getNextAction(lead, leadFollowUps, feeInvoice, hasCallActivity)
  const { emoji, label } = nextActionSummary(action)
  if (action.kind === 'none') {
    return <span className={`text-xs ${isDark ? 'text-dark-600' : 'text-dark-300'}`}>{emoji} {label}</span>
  }
  const isOverdue = emoji === '⚠️'
  const isToday = /today/i.test(label)
  const toneCls = isOverdue
    ? (isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600')
    : isToday
      ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600')
      : (isDark ? 'bg-dark-800 text-dark-300' : 'bg-dark-100 text-dark-600')
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${toneCls}`}>
      <span>{emoji}</span>{label}
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

function ConfirmDialog({ message, onConfirm, onCancel, isDark, title = 'Confirm Delete', confirmLabel = 'Delete', icon: Icon = Trash2 }) {
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}><Icon className="w-6 h-6 text-rose-500" /></div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>{title}</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{message}</p>
          <div className="flex items-center gap-3 w-full">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onCancel}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors"
            >{confirmLabel}</motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── ACTION DROPDOWN (per-lead row / lead detail header) ───────────────
// Primary actions (View/Call/WhatsApp/Follow-up) live as visible icon
// buttons next to this trigger — this dropdown only holds the secondary,
// less-frequent actions so they don't compete for equal visual weight.
function LeadActionMenu({ lead, isDark, isAdmin, anchorEl, onClose, onScheduleMeeting, onSharePackage, onChangeStatus, onOpenEnroll, onAssign, onTakeOver, onAddNote, onNurture, onLost, onNotInterested, onReopen, onEdit, onDelete }) {
  const itemCls = `w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
    isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'
  }`
  const dividerCls = `my-1 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-100'}`
  const item = (icon, label, onClick, extraCls = '') => (
    <button onClick={() => { onClick(); onClose() }} className={`${itemCls} ${extraCls}`}>
      {icon}{label}
    </button>
  )

  // A lead that's Enrolled, Lost, or in Nurture is closed/parked — none of
  // the pipeline-moving actions make sense anymore. Lost/Nurture can be
  // brought back with Reopen (admin-only); Enrolled can't be reopened here.
  const isClosed = lead.status === 'enrolled' || lead.status === 'lost' || lead.status === 'nurture'
  const canReopen = lead.status === 'lost' || lead.status === 'nurture'
  const closedLabel = lead.status === 'enrolled' ? 'Enrolled' : lead.status === 'lost' ? 'Lost' : 'Nurture'

  // Once a lead is assigned to someone, only that person (or an admin) can
  // keep working it — otherwise two reps calling the same lead at once is
  // exactly what causes duplicate/confused follow-ups.
  const { user } = useAuth()
  const isLockedToOther = !!lead.assigned_to && lead.assigned_to !== user?.id && !isAdmin

  return (
    <AnchoredMenu anchorEl={anchorEl} onClose={onClose}>
      <div className={`w-60 max-h-[80vh] overflow-y-auto rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80 shadow-black/40' : 'bg-white border-dark-200 shadow-dark-200/30'}`}>
        {isClosed ? (
          <>
            {item(<FileText className="w-3.5 h-3.5" />, 'Add Note', () => onAddNote(lead))}
            {isAdmin ? (
              <>
                {canReopen && item(<RotateCcw className="w-3.5 h-3.5" />, 'Reopen Lead', () => onReopen(lead), isDark ? 'text-primary-400' : 'text-primary-600')}
                {item(<Pencil className="w-3.5 h-3.5" />, 'Edit Lead', () => onEdit(lead))}
                <div className={dividerCls} />
                {item(<Trash2 className="w-3.5 h-3.5" />, 'Delete Lead', () => onDelete(lead), isDark ? 'text-rose-400' : 'text-rose-600')}
              </>
            ) : (
              <p className={`px-3 py-2 text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                {closedLabel} — only an admin can {canReopen ? 'reopen, edit,' : 'edit'} or delete this lead.
              </p>
            )}
          </>
        ) : isLockedToOther ? (
          <p className={`px-3 py-2 text-xs leading-relaxed ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
            This lead is already being handled by another team member — only they or an admin can update it.
          </p>
        ) : (
          <>
            {item(<Video className="w-3.5 h-3.5" />, 'Schedule Counselling', () => onScheduleMeeting(lead))}
            {item(<Package className="w-3.5 h-3.5" />, 'Share Package', () => onSharePackage(lead))}
            {item(<GraduationCap className="w-3.5 h-3.5" />, 'Enroll Lead', () => onOpenEnroll(lead), isDark ? 'text-emerald-400' : 'text-emerald-600')}
            <div className={dividerCls} />
            {item(<Activity className="w-3.5 h-3.5" />, 'Change Status', () => onChangeStatus(lead))}
            {!lead.assigned_to
              ? item(<UserCheck className="w-3.5 h-3.5" />, 'Take Over Lead', () => onTakeOver(lead))
              : isAdmin && item(<UserCog className="w-3.5 h-3.5" />, 'Assign Lead', () => onAssign(lead))}
            {item(<FileText className="w-3.5 h-3.5" />, 'Add Note', () => onAddNote(lead))}
            <div className={dividerCls} />
            {item(<Moon className="w-3.5 h-3.5" />, 'Move to Nurture', () => onNurture(lead))}
            {item(<UserX className="w-3.5 h-3.5" />, 'Not Interested', () => onNotInterested(lead), isDark ? 'text-rose-400' : 'text-rose-600')}
            {item(<UserX className="w-3.5 h-3.5" />, 'Mark Lost', () => onLost(lead), isDark ? 'text-rose-400' : 'text-rose-600')}
            <div className={dividerCls} />
            {item(<Pencil className="w-3.5 h-3.5" />, 'Edit Lead', () => onEdit(lead))}
            {isAdmin && item(<Trash2 className="w-3.5 h-3.5" />, 'Delete Lead', () => onDelete(lead), isDark ? 'text-rose-400' : 'text-rose-600')}
          </>
        )}
      </div>
    </AnchoredMenu>
  )
}

// ─── CALL OUTCOME MODAL — RNR is logged here as an outcome of a call, not
// as a pipeline stage or its own separate action. ──────────────────────
const callOutcomeOptions = ['No Response / RNR', 'Connected', 'Switched Off', 'Wrong Number', 'Busy — Call Back Later']
function CallOutcomeModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [outcome, setOutcome] = useState('No Response / RNR')
  const [form, setForm] = useState({ date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '10:00', notes: '' })
  const needsReschedule = outcome !== 'Connected'
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(lead, outcome, needsReschedule ? form : null) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><PhoneCall className="w-5 h-5 text-primary-500" />Call Outcome</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>How did the call with {lead.name} go?</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Outcome</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
              {callOutcomeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {needsReschedule && (
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
          )}
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
            ><CheckCircle2 className="w-4 h-4" />{needsReschedule ? 'Save & Schedule Next Attempt' : 'Save Outcome'}</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── MEETING OUTCOME MODAL — shown when a counselling meeting is marked
// Completed. Records what happened and suggests (never forces, except
// where the outcome directly names a pipeline stage) the next step. ────
const meetingOutcomeOptions = ['Interested', 'Needs Follow-up', 'Package Shared', 'Not Interested', 'Other']
function MeetingOutcomeModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [outcome, setOutcome] = useState('Interested')
  const [notes, setNotes] = useState('')
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(lead, outcome, notes.trim()) }

  const suggestion = {
    'Interested': 'Suggested next step: share the package with them.',
    'Needs Follow-up': 'Suggested next step: schedule a follow-up.',
    'Package Shared': `Suggested next step: this moves the lead to "Package Shared".`,
    'Not Interested': 'Suggested next step: mark this lead as Lost.',
    'Other': null,
  }[outcome]

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><Video className="w-5 h-5 text-primary-500" />Meeting Outcome</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>How did the counselling with {lead.name} go?</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Outcome</label>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
              {meetingOutcomeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {suggestion && (
              <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{suggestion}</p>
            )}
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            ><CheckCircle2 className="w-4 h-4" />Save Outcome</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── CHANGE STATUS MODAL ──────────────────────────────────────────────
function ChangeStatusModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [newStatus, setNewStatus] = useState(lead.status)
  const [note, setNote] = useState('')
  const options = ALL_STATUS_KEYS.filter((k) => k !== 'enrolled')
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(lead, newStatus, note.trim()) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Change Lead Status</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.name}</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Current</label>
            <StatusBadge status={lead.status} isDark={isDark} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
              {options.map((k) => <option key={k} value={k}>{statusConfig[k].label}</option>)}
            </select>
            {newStatus === 'enrolled' && (
              <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>To mark Enrolled, open the lead and use "Assign Package &amp; Enroll" so a student record is created too.</p>
            )}
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Optional note</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is the status changing?"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" disabled={newStatus === lead.status || newStatus === 'enrolled'} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg transition-all ${newStatus === lead.status || newStatus === 'enrolled' ? 'bg-dark-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-primary-500/25'}`}
            >Save</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── MOVE TO NURTURE MODAL ─────────────────────────────────────────────
function NurtureModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [reason, setReason] = useState('')
  const [nextDate, setNextDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const handleSubmit = (e) => { e.preventDefault(); if (reason.trim()) onSubmit(lead, reason.trim(), nextDate) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><Moon className="w-5 h-5 text-dark-400" />Move to Nurture</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.name} stays in the CRM — just parked for later</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Why is this lead being nurtured? *</label>
            <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. not ready to join this term, budget review in a few months..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Next Follow-up Date</label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
              <input type="date" required value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={`w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-dark-600 to-dark-500 hover:from-dark-500 hover:to-dark-400 shadow-lg transition-all"
            ><Moon className="w-4 h-4" />Move to Nurture</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── ADD NOTE MODAL ────────────────────────────────────────────────────
function AddNoteModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [text, setText] = useState('')
  const handleSubmit = (e) => { e.preventDefault(); if (text.trim()) onSubmit(lead.id, text.trim()) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><FileText className="w-5 h-5 text-primary-500" />Add Note</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.name}</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea rows={4} required autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a note about this lead..."
            className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            >Save Note</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── LOST REASON MODAL ───────────────────────────────────────────────
const lostReasons = ['Price', 'Not Interested', 'Joined Elsewhere', 'Timing', 'Course', 'No Response', 'Other']
// "Mark Lost" and "Not Interested" are the same closure (status='lost')
// with a reason attached — not two separate statuses, so the pipeline
// never grows a confusing second "closed" state. initialReason just
// pre-selects the reason when opened from the dedicated shortcut.
function LostReasonModal({ lead, isDark, onClose, onSubmit, inputClass, initialReason = '' }) {
  const [reason, setReason] = useState(initialReason)
  const [note, setNote] = useState('')
  const handleSubmit = (e) => { e.preventDefault(); if (reason) onSubmit(lead, reason, note.trim()) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><UserX className="w-5 h-5 text-rose-500" />Mark as Lost</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.name} stays in the CRM, just marked closed-lost</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Reason</label>
            <select required value={reason} onChange={(e) => setReason(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
              <option value="">Select reason</option>
              {lostReasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Additional note (optional)</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any extra detail worth keeping on record..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" disabled={!reason} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg transition-all ${!reason ? 'bg-dark-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-rose-500/25'}`}
            ><UserX className="w-4 h-4" />Confirm Lost</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── REOPEN MODAL (admin — bring a Lost/Nurture lead back) ─────────────
// History is never deleted here — the previous status, new status, reason,
// actor, and timestamp all get written to the timeline (see
// DataContext.reopenLead); this just collects the new status + reason.
function ReopenModal({ lead, isDark, onClose, onSubmit, inputClass }) {
  const [newStatus, setNewStatus] = useState('new')
  const [reason, setReason] = useState('')
  const options = PIPELINE_STAGE_KEYS.filter((k) => k !== 'enrolled')
  const handleSubmit = (e) => { e.preventDefault(); if (reason.trim()) onSubmit(lead, newStatus, reason.trim()) }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><RotateCcw className="w-5 h-5 text-primary-500" />Reopen Lead</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Bring {lead.name} back into the active pipeline</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Current Status</label>
            <StatusBadge status={lead.status} isDark={isDark} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
              {options.map((k) => <option key={k} value={k}>{statusConfig[k].label}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Reason *</label>
            <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this lead being reopened?"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 resize-none transition-all ${inputClass}`} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" disabled={!reason.trim()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg transition-all ${!reason.trim() ? 'bg-dark-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-primary-500/25'}`}
            ><RotateCcw className="w-4 h-4" />Reopen Lead</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── ASSIGN MODAL (admin — pick who handles this lead) ────────────────
function AssignModal({ lead, isDark, onClose, onAssign, teamMembers }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><UserCog className="w-5 h-5 text-primary-500" />Assign Lead</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Who should handle {lead.name}?</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {(teamMembers || []).length === 0 && (
            <p className={`text-sm text-center py-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No team members found</p>
          )}
          {(teamMembers || []).map((m) => (
            <button key={m.id} type="button" onClick={() => onAssign(lead, m.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                lead.assigned_to === m.id
                  ? isDark ? 'bg-primary-500/15 text-primary-400' : 'bg-primary-50 text-primary-600'
                  : isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'
              }`}
            >
              {m.name}
              {lead.assigned_to === m.id && <CheckCircle2 className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── ADMISSION CONFIRMATION MODAL ──────────────────────────────────────
// Nothing is written to the database until "Confirm Admission" is
// clicked — this is purely a review step. On confirm, the whole chained
// workflow (student → course → package → batch → fee plan → payment →
// enrolled → timeline → automation event) runs as one call to
// DataContext.confirmAdmission.
function AdmissionModal({ lead, matchingPackage, finalPrice, batches, isDark, inputClass, onClose, onConfirm }) {
  const navigate = useNavigate()
  const [batchId, setBatchId] = useState('')
  const [initialPayment, setInitialPayment] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState(null)

  const courseBatches = (batches || []).filter((b) => b.course === lead.course)
  const paymentAmount = Number(initialPayment) || 0

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!admissionDate) { setFormError('Admission date is required'); return }
    if (paymentAmount < 0 || paymentAmount > finalPrice) { setFormError('Initial payment must be between ₹0 and the final price'); return }
    setFormError('')
    setSubmitting(true)
    const res = await onConfirm({
      pkg: matchingPackage,
      batchId: batchId ? Number(batchId) : null,
      discountPercent: lead.discount_percent || 0,
      initialPayment: paymentAmount,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || null,
      admissionDate,
    })
    setSubmitting(false)
    if (res?.error) { setFormError(res.error); return }
    setResult(res)
  }

  if (result) {
    return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
          className={`relative w-full max-w-md rounded-2xl p-6 z-10 text-center ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>Admission completed successfully.</h2>
          {result.wasExistingStudent && (
            <p className={`text-xs mb-4 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>An existing student record for {lead.name} was found and used — no duplicate was created.</p>
          )}
          <div className="flex flex-col gap-2 mt-5">
            <button onClick={() => navigate('/students', { state: { openStudentId: result.student.id } })}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">
              View Student
            </button>
            <button onClick={() => navigate('/billing', { state: { openInvoiceForStudent: lead.name } })}
              className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
              View Fee Bill
            </button>
            {result.student?.batch_id && (
              <button onClick={() => navigate(`/batches/${result.student.batch_id}`)}
                className={`w-full py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                View Batch
              </button>
            )}
            <button onClick={onClose} className={`w-full py-2 text-xs font-medium ${isDark ? 'text-dark-500 hover:text-dark-300' : 'text-dark-400 hover:text-dark-600'}`}>Close</button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-lg rounded-2xl p-6 z-10 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Admission Confirmation</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Review everything below — nothing is saved until you confirm.</p>
          </div>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>

        <div className={`rounded-lg p-4 mb-5 space-y-2 text-sm ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
          <div className="flex items-center justify-between"><span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Lead</span><span className={`font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.name}</span></div>
          <div className="flex items-center justify-between"><span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Course</span><span className={`font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.course}</span></div>
          <div className="flex items-center justify-between"><span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Package</span><span className={`font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{matchingPackage?.name || '—'}</span></div>
          <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-dark-700' : 'border-dark-200'}`}>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Final Price</span>
            <span className={`font-bold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{formatINR(finalPrice)}</span>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Batch</label>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
              <option value="">No batch yet (assign later)</option>
              {courseBatches.map((b) => <option key={b.id} value={b.id}>{b.name} &middot; {b.schedule || 'schedule TBD'}</option>)}
            </select>
            {courseBatches.length === 0 && (
              <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No batches created yet for {lead.course} — create one from the Batches page, or assign later.</p>
            )}
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Admission Date</label>
            <input type="date" required value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Initial Payment</label>
              <input type="number" min="0" max={finalPrice} value={initialPayment} onChange={(e) => setInitialPayment(e.target.value)} placeholder="0"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                {['UPI', 'Cash', 'Card', 'Bank Transfer', 'Cheque'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {paymentAmount > 0 && (
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Payment Reference (optional)</label>
              <input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Transaction ID, cheque no., etc."
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          )}
          {formError && <p className="text-xs font-medium text-rose-500">{formError}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" disabled={submitting} whileHover={{ scale: submitting ? 1 : 1.03 }} whileTap={{ scale: submitting ? 1 : 0.97 }}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg transition-all ${submitting ? 'bg-dark-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-primary-500/25'}`}
            >{submitting ? 'Confirming...' : 'Confirm Admission'}</motion.button>
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
  const [formError, setFormError] = useState('')
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.phone.length !== 10) { setFormError('Phone number must be exactly 10 digits'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setFormError('Enter a valid email address'); return }
    setFormError('')
    onSave({ ...lead, ...form })
  }

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
              <input type="email" required pattern="[^\s@]+@[^\s@]+\.[^\s@]+" title="Enter a valid email address" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Phone</label>
              <input type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="Enter a 10-digit phone number" required value={form.phone} onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          {formError && <p className="text-xs font-medium text-rose-500 -mt-2">{formError}</p>}
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
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} disabled={form.status === 'enrolled'}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${form.status === 'enrolled' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${inputClass}`}>
                {Object.entries(statusConfig).filter(([key]) => key !== 'enrolled' || form.status === 'enrolled').map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
              {form.status === 'enrolled' && (
                <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Already enrolled — use "Assign Package &amp; Enroll" to re-run enrollment.</p>
              )}
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
const meetingTypeOptions = [
  { key: 'in_person', label: 'In-person', icon: Users },
  { key: 'online', label: 'Online', icon: Video },
  { key: 'phone', label: 'Phone', icon: Phone },
]

// Meeting states are shown in business language, not the raw follow_ups
// status value — "Scheduled" reads far clearer than "pending" for a
// counselling meeting.
const meetingStatusLabel = { pending: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show' }

function TransferModal({ lead, isDark, onClose, onSubmit, inputClass, cardClass, initialType = 'call' }) {
  const [form, setForm] = useState({ type: initialType, date: new Date().toISOString().slice(0, 10), time: '10:00', priority: 'medium', notes: lead.notes || '', meetingType: 'online' })
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(lead, form) }
  const isMeeting = form.type === 'meeting'

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
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{isMeeting ? 'Schedule Counselling' : 'Schedule Follow-up'}</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{isMeeting ? `Set up a counselling meeting for ${lead.name}` : `Schedule a follow-up for ${lead.name}`}</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {followUpTypes.map(({ key, label, icon: TypeIcon }) => (
                <label key={key} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-medium ${form.type === key ? typeColors[key] : unselectedStyle}`}>
                  <input type="radio" name="followup-type" value={key} checked={form.type === key} onChange={() => handleChange('type', key)} className="sr-only" />
                  <TypeIcon className="w-5 h-5" />{label}
                </label>
              ))}
            </div>
          </div>
          {isMeeting && (
            <div>
              <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Meeting Type</label>
              <div className="grid grid-cols-3 gap-2">
                {meetingTypeOptions.map(({ key, label, icon: TypeIcon }) => (
                  <label key={key} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-medium ${form.meetingType === key ? typeColors.meeting : unselectedStyle}`}>
                    <input type="radio" name="meeting-type" value={key} checked={form.meetingType === key} onChange={() => handleChange('meetingType', key)} className="sr-only" />
                    <TypeIcon className="w-5 h-5" />{label}
                  </label>
                ))}
              </div>
            </div>
          )}
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
            ><Calendar className="w-4 h-4" />{isMeeting ? 'Schedule Meeting' : 'Schedule Follow-up'}</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── ADD LEAD MODAL ──────────────────────────────────────────────────
function AddLeadModal({ isDark, onClose, onAdd, inputClass }) {
  const { leads, students } = useData()
  const [form, setForm] = useState({ name: '', email: '', phone: '', course: '', source: '', priority: 'medium', notes: '' })
  const [formError, setFormError] = useState('')
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  // Same phone/email submitted again (a lead clicking the same ad twice, a
  // staff member re-entering someone who already inquired) used to just
  // silently create a second, disconnected lead row. Checked live as the
  // user types so it's caught before submission, not after.
  const duplicateLead = useMemo(() => {
    const email = form.email.trim().toLowerCase()
    if (form.phone.length !== 10 && !email) return null
    return leads.find((l) =>
      (form.phone.length === 10 && l.phone === form.phone) ||
      (email && l.email?.toLowerCase() === email)
    ) || null
  }, [leads, form.phone, form.email])

  // Not a duplicate lead, but this person might already be an enrolled
  // student inquiring about a different course — a legitimate new lead,
  // just one staff should see the context for, not silently create as if
  // this were a first-time contact.
  const existingStudent = useMemo(() => {
    if (duplicateLead) return null
    const email = form.email.trim().toLowerCase()
    if (form.phone.length !== 10 && !email) return null
    return students.find((s) =>
      (form.phone.length === 10 && s.phone === form.phone) ||
      (email && s.email?.toLowerCase() === email)
    ) || null
  }, [students, duplicateLead, form.phone, form.email])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.phone.length !== 10) { setFormError('Phone number must be exactly 10 digits'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setFormError('Enter a valid email address'); return }
    if (duplicateLead) { setFormError('This phone/email already belongs to an existing lead — see above instead of creating a duplicate'); return }
    setFormError('')
    const nameParts = form.name.trim().split(' ')
    const avatar = nameParts.length >= 2 ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : form.name.trim().slice(0, 2).toUpperCase()
    const notes = existingStudent ? `⚠ Existing student — already enrolled in ${existingStudent.course}. This inquiry is for a different course.\n\n${form.notes}` : form.notes
    onAdd({ ...form, notes, id: Date.now(), avatar, status: 'new', date: new Date().toISOString().slice(0, 10) })
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
              <input type="email" required pattern="[^\s@]+@[^\s@]+\.[^\s@]+" title="Enter a valid email address" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@example.com"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Phone</label>
              <input type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="Enter a 10-digit phone number" required value={form.phone} onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          {formError && <p className="text-xs font-medium text-rose-500 -mt-2">{formError}</p>}
          {duplicateLead && (
            <div className={`flex items-start gap-2 -mt-1 px-3 py-2.5 rounded-lg text-xs ${isDark ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-50 text-rose-700'}`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Already a lead: <b>{duplicateLead.name}</b> ({duplicateLead.status}) — this exact phone or email is already in the system. Open that lead instead of adding a duplicate.</span>
            </div>
          )}
          {!duplicateLead && existingStudent && (
            <div className={`flex items-start gap-2 -mt-1 px-3 py-2.5 rounded-lg text-xs ${isDark ? 'bg-sky-500/10 text-sky-300' : 'bg-sky-50 text-sky-700'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Existing student: <b>{existingStudent.name}</b> is already enrolled in {existingStudent.course}. This will be added as a new inquiry for a different course.</span>
            </div>
          )}
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
            <motion.button type="submit" disabled={!!duplicateLead} whileHover={{ scale: duplicateLead ? 1 : 1.03 }} whileTap={{ scale: duplicateLead ? 1 : 0.97 }}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg transition-all ${duplicateLead ? 'bg-dark-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-primary-500/25'}`}
            >Add Lead</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Simple horizontal "where is this lead right now" stepper — the whole
// point is a counsellor can look at it for two seconds and know the
// stage, not learn a workflow. Reuses the same statusConfig (label/color)
// as everywhere else; no separate status system for this view.
function LeadStageStepper({ status, isDark }) {
  if (status === 'lost' || status === 'nurture') {
    const cfg = statusConfig[status]
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${isDark ? bgSubtleMap(true)[cfg.color] : bgSubtleMap(false)[cfg.color]}`}>
        <cfg.icon className={`w-4 h-4 ${iconColorMap[cfg.color]}`} />
        <span className={`text-sm font-semibold ${iconColorMap[cfg.color]}`}>{cfg.label}</span>
        <span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>— this lead is closed, not moving through the active pipeline</span>
      </div>
    )
  }
  const currentIdx = PIPELINE_STAGE_KEYS.indexOf(status)
  return (
    <div className="flex items-center overflow-x-auto pb-1 -mb-1">
      {PIPELINE_STAGE_KEYS.map((key, i) => {
        const cfg = statusConfig[key]
        const done = i < currentIdx
        const current = i === currentIdx
        return (
          <div key={key} className="flex items-center shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              current
                ? isDark ? badgeStylesDark[cfg.color] : badgeStylesLight[cfg.color]
                : done
                  ? isDark ? 'text-dark-400' : 'text-dark-500'
                  : isDark ? 'text-dark-600' : 'text-dark-300'
            }`}>
              {current && <cfg.icon className="w-3 h-3" />}
              {cfg.label}
            </div>
            {i < PIPELINE_STAGE_KEYS.length - 1 && (
              <div className={`w-4 sm:w-6 h-px shrink-0 ${done ? (isDark ? 'bg-dark-500' : 'bg-dark-300') : isDark ? 'bg-dark-700' : 'bg-dark-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PROFILE VIEW ────────────────────────────────────────────────────
function LeadProfileView({ lead, isDark, onBack, onEdit, onTransfer, onScheduleMeeting, onDelete, onCall, onChangeStatus, onSharePackage, onPackageShared, onAssign, onTakeOver, onAddNoteAction, onNurture, onLost, onNotInterested, onReopen, onConfirmAdmission, onDiscountChange, onBatchTimingChange, onGenerateFeeBill, onUnlockInvoice, isAdmin, invoices, followUpsData, updateFollowUp, leadActivities, addActivity, cardClass, inputClass, activeTab, setActiveTab, showNotification, packages, teamMembers, leadDocuments, onAddDocument, onDeleteDocument, batches, leadNotes, onAddNote, students }) {
  const navigate = useNavigate()
  const [feePlan, setFeePlan] = useState(0)
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [showAdmissionModal, setShowAdmissionModal] = useState(false)
  const [addingDocCategory, setAddingDocCategory] = useState(null)
  const [docForm, setDocForm] = useState({ title: '', url: '' })
  const [profileNoteText, setProfileNoteText] = useState('')
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null)
  const [reschedulingId, setReschedulingId] = useState(null)
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' })
  const [cancelTargetId, setCancelTargetId] = useState(null)
  const profileNotes = (leadNotes || []).filter((n) => n.lead_id === lead.id)

  const statusColor = getStatusColor(lead.status)
  const matchingPackage = packages.find((p) => p.name.toLowerCase() === lead.course.toLowerCase())
  const enrolledStudent = lead.status === 'enrolled' ? (students || []).find((s) => s.name === lead.name && s.course === lead.course) : null
  const enrolledBatch = enrolledStudent ? (batches || []).find((b) => b.id === enrolledStudent.batch_id) : null
  const leadFollowUps = followUpsData.filter((f) => f.lead === lead.name)
  const leadTimeline = (leadActivities || []).filter((a) => a.lead_id === lead.id)
  const leadDocs = (leadDocuments || []).filter((d) => d.lead_id === lead.id)

  // "Package Selected" is logged the first time this lead's matched
  // package is actually seen (the Package tab is opened) — deduped so
  // re-visiting the tab doesn't re-log it.
  useEffect(() => {
    if (activeTab !== 'package' || !matchingPackage) return
    const already = leadTimeline.some((a) => a.description?.startsWith('Package Selected'))
    if (!already) addActivity(lead.id, lead.status, lead.status, `Package Selected: ${matchingPackage.name}`)
  }, [activeTab, matchingPackage?.name, lead.id])

  // WhatsApp messages used to only be viewable on a separate Conversations
  // page — pulling them in here gives one real chronological communication
  // timeline (status changes + WhatsApp) instead of two disconnected views.
  const [whatsappMessages, setWhatsappMessages] = useState([])
  useEffect(() => {
    supabase.from('whatsapp_messages').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error) { console.error('whatsapp_messages fetch error', error); return }
      setWhatsappMessages(data || [])
    })
  }, [lead.id])

  // Same reasoning as WhatsApp — a sent email is a real communication event
  // and belongs in the same timeline, not a separate view (or nowhere, like
  // it was when this used a plain mailto: link with no record at all).
  const [leadEmails, setLeadEmails] = useState([])
  const refetchLeadEmails = () => {
    supabase.from('email_messages').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error) { console.error('email_messages fetch error', error); return }
      setLeadEmails(data || [])
    })
  }
  useEffect(refetchLeadEmails, [lead.id])

  // "Shared Date" comes from the real email record, not a separate flag —
  // sending package details already writes to email_messages, so that's
  // the actual source of truth for when (and whether) it was shared.
  const packageSharedEmail = leadEmails.find((m) => m.subject?.startsWith('Package Details:') && m.status === 'sent')

  // The discount lives on the lead (set here, in Package) and is what the
  // Admission modal's Final Price is computed from later — one number,
  // not re-entered at enrollment time.
  const discountPercent = lead.discount_percent || 0
  const finalPriceWithGst = matchingPackage ? Math.round(matchingPackage.price * (1 - discountPercent / 100) * 1.18) : 0
  const [discountInput, setDiscountInput] = useState(String(discountPercent))
  useEffect(() => setDiscountInput(String(lead.discount_percent || 0)), [lead.id, lead.discount_percent])

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailModalPreset, setEmailModalPreset] = useState(null)

  const combinedTimeline = [
    ...leadTimeline.map((a) => ({ type: 'activity', at: a.created_at, data: a })),
    ...whatsappMessages.map((m) => ({ type: 'whatsapp', at: m.created_at, data: m })),
    ...leadEmails.map((m) => ({ type: 'email', at: m.created_at, data: m })),
    ...profileNotes.map((n) => ({ type: 'note', at: n.created_at, data: n })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))
  const feeInvoice = (invoices || []).find((inv) => inv.student === lead.name && inv.course === lead.course)
  const hasCallActivity = leadTimeline.some((a) => a.activity_type === 'CALL')
  const isLeadClosed = lead.status === 'enrolled' || lead.status === 'lost'
  const { user: currentUser } = useAuth()
  const isLockedToOther = !!lead.assigned_to && lead.assigned_to !== currentUser?.id && !isAdmin
  const leadMeetings = leadFollowUps.filter((f) => f.type === 'meeting')
  const packagePrice = matchingPackage?.price || 0
  const nextFollowUpItem = getNextFollowUp(lead.name, followUpsData)
  const nextFollowUpInfo = followUpDueInfo(nextFollowUpItem)
  const nextFollowUpAccentMap = { overdue: 'rose', today: 'amber', tomorrow: 'sky', later: 'accent', none: 'slate' }
  const nextFollowUpAccent = nextFollowUpAccentMap[nextFollowUpInfo.tone]

  const handleAddNote = () => {
    if (!profileNoteText.trim()) return
    onAddNote(lead.id, profileNoteText.trim())
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
                <StatusBadge status={lead.status} isDark={isDark} onClick={(!isLockedToOther || isAdmin) ? () => onChangeStatus(lead) : undefined} />
                <PriorityBadge priority={lead.priority} isDark={isDark} />
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-dark-800 text-dark-400' : 'bg-dark-100 text-dark-500'}`}>
                  <SourceIcon className="w-3 h-3" />{lead.source}
                </span>
              </div>
            </div>
          </div>
          {/* Action Buttons — Call/WhatsApp/Follow-up are primary; everything
              else lives in the same secondary More menu the Lead List uses,
              so both views drive the exact same handlers on the same record. */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onCall(lead)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all">
              <Phone className="w-4 h-4" />Call
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/conversations', { state: { openPhone: lead.phone, leadId: lead.id, leadName: lead.name } })}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 transition-all">
              <MessageCircle className="w-4 h-4" />WhatsApp
            </motion.button>
            {((!isLeadClosed && !isLockedToOther) || isAdmin) && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onTransfer(lead)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                <Calendar className="w-4 h-4" />Follow-up
              </motion.button>
            )}
            <div className="relative">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => { setShowActionMenu((v) => !v); setActionMenuAnchor(e.currentTarget) }}
                className={`p-2.5 rounded-lg transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700' : 'bg-dark-100 text-dark-600 hover:text-dark-900 hover:bg-dark-200'}`}>
                <MoreHorizontal className="w-4 h-4" />
              </motion.button>
              <AnimatePresence>
                {showActionMenu && (
                  <LeadActionMenu
                    lead={lead}
                    isDark={isDark}
                    isAdmin={isAdmin}
                    anchorEl={actionMenuAnchor}
                    onClose={() => setShowActionMenu(false)}
                    onScheduleMeeting={onScheduleMeeting}
                    onSharePackage={onSharePackage}
                    onChangeStatus={onChangeStatus}
                    onOpenEnroll={() => setActiveTab('package')}
                    onAssign={onAssign}
                    onTakeOver={onTakeOver}
                    onAddNote={onAddNoteAction}
                    onNurture={onNurture}
                    onLost={onLost}
                    onNotInterested={onNotInterested}
                    onReopen={onReopen}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
          {isLeadClosed && !isAdmin && (
            <p className={`text-xs mt-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
              This lead is {lead.status} — only an admin can edit or delete it.
            </p>
          )}
          {!isLeadClosed && isLockedToOther && (
            <p className={`text-xs mt-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
              This lead is already being handled by another team member — only they or an admin can update it.
            </p>
          )}
        </div>
      </motion.div>

      {/* Next Action — the "what should I do next" question, answered from
          real pending follow-ups/meetings/invoices only, never guessed. */}
      <NextActionCard
        lead={lead}
        leadFollowUps={leadFollowUps}
        feeInvoice={feeInvoice}
        hasCallActivity={hasCallActivity}
        isDark={isDark}
        cardClass={cardClass}
        onCall={() => onCall(lead)}
        onComplete={(item) => { updateFollowUp(item.id, { status: 'completed' }); showNotification('Follow-up marked as completed') }}
        onViewMeeting={() => setActiveTab('meeting')}
        onWhatsAppReminder={() => navigate('/conversations', { state: { openPhone: lead.phone, leadId: lead.id, leadName: lead.name } })}
        onViewFeeBill={() => setActiveTab('feebill')}
        onScheduleFollowUp={() => onTransfer(lead)}
      />

      {/* Status Progress — the "where is this lead" question */}
      <motion.div variants={itemVariants} className={`rounded-2xl p-4 ${cardClass}`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Status Progress</p>
          {((!isLeadClosed && !isLockedToOther) || isAdmin) && (
            <button onClick={() => onChangeStatus(lead)} className={`text-xs font-medium ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>
              Change Status
            </button>
          )}
        </div>
        <LeadStageStepper status={lead.status} isDark={isDark} />
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: 'Activities', value: combinedTimeline.length, color: 'primary' },
          { icon: Clock, label: 'Next Follow-up', value: nextFollowUpItem ? `${nextFollowUpInfo.label} ${nextFollowUpItem.time}` : 'No follow-up', color: nextFollowUpAccent, small: true },
          { icon: IndianRupee, label: 'Pending Amount', value: feeInvoice ? (feeInvoice.balance > 0 ? formatINR(feeInvoice.balance) : 'Fully Paid') : '—', color: feeInvoice?.balance > 0 ? 'rose' : 'emerald' },
          { icon: Package, label: 'Package Value', value: packagePrice ? formatINR(packagePrice) : '—', color: 'accent' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
            className={`rounded-xl p-4 flex items-center gap-3 ${cardClass}`}>
            <div className={`p-2.5 rounded-lg ${subtleBg[stat.color]}`}>
              <stat.icon className={`w-5 h-5 ${iconColorMap[stat.color]}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-bold truncate ${stat.small ? 'text-sm' : 'text-lg'} ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
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
                    { icon: Calendar, label: 'Date of Inquiry', value: lead.date },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                        <item.icon className={`w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{item.label}</p>
                        {item.isLink ? (
                          <button
                            type="button"
                            onClick={() => { setEmailModalPreset({ subject: '', body: `Hi ${lead.name},\n\n` }); setShowEmailModal(true) }}
                            className="text-sm font-medium text-primary-500 hover:text-primary-400 truncate block text-left"
                          >{item.value}</button>
                        ) : (
                          <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead Details — Course/Source/Assigned/Priority/Status in one
                  place so the executive never has to leave Overview to know
                  the basics; Priority/Status stay live controls, not just text. */}
              <div className={`rounded-xl p-5 ${cardClass}`}>
                <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Lead Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}><GraduationCap className={`w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} /></div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Course</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{lead.course}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}><SourceIcon className={`w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} /></div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Source</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{lead.source}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}><UserCheck className={`w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} /></div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Assigned Executive</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{(teamMembers || []).find((m) => m.id === lead.assigned_to)?.name || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Priority</p>
                    <PriorityBadge priority={lead.priority} isDark={isDark} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Current Status</p>
                    <StatusBadge status={lead.status} isDark={isDark} onClick={(!isLockedToOther || isAdmin) ? () => onChangeStatus(lead) : undefined} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Timeline Tab ── */}
          {/* The one place that answers "what happened with this lead" —
              every module (calls, follow-ups, meetings, package, fee bill,
              payments, notes, status/enrollment) writes here automatically;
              nothing on this tab is manually created. */}
          {activeTab === 'timeline' && (() => {
            const bucketOf = (item) => {
              if (item.type === 'whatsapp' || item.type === 'email') return 'messages'
              if (item.type === 'note') return 'notes'
              return activityTypeInfo(item.data.activity_type).bucket
            }
            const filtered = timelineFilter === 'all' ? combinedTimeline : combinedTimeline.filter((item) => bucketOf(item) === timelineFilter)

            // Group into day buckets while keeping the existing (already
            // newest-first) order within and across groups.
            const groups = []
            filtered.forEach((item) => {
              const label = dayGroupLabel(new Date(item.at))
              let group = groups[groups.length - 1]?.label === label ? groups[groups.length - 1] : null
              if (!group) { group = { label, items: [] }; groups.push(group) }
              group.items.push(item)
            })

            const timeOf = (item) => new Date(item.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            const rowCls = 'flex items-start gap-3'
            const timeCls = `text-xs shrink-0 w-16 pt-0.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`
            const headlineCls = `text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`
            const sublineCls = `text-sm mt-0.5 whitespace-pre-wrap ${isDark ? 'text-dark-300' : 'text-dark-600'}`
            const byCls = `text-xs mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`

            const renderEntry = (item) => {
              if (item.type === 'whatsapp') {
                const m = item.data
                const isOutbound = m.direction === 'outbound'
                return (
                  <div key={`wa-${m.id}`} className={rowCls}>
                    <span className={timeCls}>{timeOf(item)}</span>
                    <div className="min-w-0 flex-1">
                      <p className={headlineCls}>💬 {isOutbound ? 'WhatsApp sent' : 'WhatsApp received'}</p>
                      <p className={sublineCls}>{m.body}</p>
                    </div>
                  </div>
                )
              }
              if (item.type === 'email') {
                const m = item.data
                return (
                  <div key={`em-${m.id}`} className={rowCls}>
                    <span className={timeCls}>{timeOf(item)}</span>
                    <div className="min-w-0 flex-1">
                      <p className={headlineCls}>✉️ {m.status === 'sent' ? 'Email sent' : 'Email failed'}: {m.subject}</p>
                      <p className={sublineCls}>{m.body}</p>
                      {m.sender_name && <p className={byCls}>By {m.sender_name}</p>}
                    </div>
                  </div>
                )
              }
              if (item.type === 'note') {
                const n = item.data
                return (
                  <div key={`note-${n.id}`} className={rowCls}>
                    <span className={timeCls}>{timeOf(item)}</span>
                    <div className="min-w-0 flex-1">
                      <p className={headlineCls}>📝 Note added</p>
                      <p className={sublineCls}>{n.text}</p>
                      {n.author_name && <p className={byCls}>By {n.author_name}</p>}
                    </div>
                  </div>
                )
              }
              // Generic lead_activities entry — status changes get the clean
              // "From → To" line the spec asks for; everything else (calls,
              // payments, fee bills, enrollment, etc.) shows its own
              // already-specific description.
              const a = item.data
              const info = activityTypeInfo(a.activity_type)
              const isPlainStatusChange = a.activity_type === 'STATUS_CHANGED' && a.from_status && a.to_status && a.from_status !== a.to_status
              return (
                <div key={a.id} className={rowCls}>
                  <span className={timeCls}>{timeOf(item)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={headlineCls}>{info.icon} {info.label}</p>
                    {isPlainStatusChange ? (
                      <p className={sublineCls}>{statusConfig[a.from_status]?.label || a.from_status} &rarr; {statusConfig[a.to_status]?.label || a.to_status}</p>
                    ) : (
                      <p className={sublineCls}>{a.description}</p>
                    )}
                    {a.actor_name && <p className={byCls}>By {a.actor_name}</p>}
                  </div>
                </div>
              )
            }

            return (
              <div className={`rounded-xl p-5 ${cardClass}`}>
                <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                  <Activity className="w-4 h-4" />Lead Timeline
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {TIMELINE_FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => setTimelineFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        timelineFilter === f.key
                          ? 'bg-primary-600 text-white'
                          : isDark ? 'bg-dark-800 text-dark-400 hover:text-dark-200' : 'bg-dark-100 text-dark-500 hover:text-dark-700'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                    <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      {timelineFilter === 'all' ? 'No activity recorded yet' : 'Nothing in this filter yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groups.map((g) => (
                      <div key={g.label}>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{g.label}</p>
                        <div className="space-y-4">{g.items.map(renderEntry)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

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
          {activeTab === 'followup' && (() => {
            // Meetings get their own tab — a call/WhatsApp follow-up and a
            // counselling meeting aren't the same kind of item, so this tab
            // only deals with the non-meeting ones to avoid showing the same
            // row twice across two tabs.
            const nonMeetingFollowUps = leadFollowUps.filter((f) => f.type !== 'meeting')
            const pending = nonMeetingFollowUps.filter((f) => f.status === 'pending')
              .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`))
            const completed = nonMeetingFollowUps.filter((f) => f.status === 'completed')
              .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
            const cancelled = nonMeetingFollowUps.filter((f) => f.status === 'cancelled')
              .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
            const nextItem = pending[0]
            const nextInfo = followUpDueInfo(nextItem)

            const renderRow = (fu) => {
              const typeConfig = followUpTypes.find((t) => t.key === fu.type)
              const TypeIcon = typeConfig?.icon || Phone
              const typeColor = { call: 'sky', email: 'accent', meeting: 'violet', whatsapp: 'emerald' }[fu.type] || 'sky'
              const overdue = fu.status === 'pending' && followUpDueInfo(fu).tone === 'overdue'
              return (
                <motion.div key={fu.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 ${cardClass}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${subtleBg[typeColor]}`}>
                      <TypeIcon className={`w-4 h-4 ${iconColorMap[typeColor]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-semibold capitalize ${isDark ? 'text-white' : 'text-dark-900'}`}>{fu.type}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          fu.status === 'completed'
                            ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                            : fu.status === 'cancelled'
                              ? isDark ? 'bg-dark-700 text-dark-400' : 'bg-dark-100 text-dark-500'
                              : isDark ? 'bg-accent-500/15 text-accent-400' : 'bg-accent-50 text-accent-600'
                        }`}>{fu.status}</span>
                        {overdue && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>Overdue</span>
                        )}
                      </div>
                      <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{fu.notes}</p>

                      {reschedulingId === fu.id ? (
                        <div className="flex flex-wrap items-end gap-2 mt-3">
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Date</label>
                            <input type="date" value={rescheduleForm.date} onChange={(e) => setRescheduleForm((p) => ({ ...p, date: e.target.value }))}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-2 transition-all ${inputClass}`} />
                          </div>
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Time</label>
                            <input type="time" value={rescheduleForm.time} onChange={(e) => setRescheduleForm((p) => ({ ...p, time: e.target.value }))}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-2 transition-all ${inputClass}`} />
                          </div>
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              if (!rescheduleForm.date || !rescheduleForm.time) return
                              const timeStr = new Date(`2000-01-01T${rescheduleForm.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                              updateFollowUp(fu.id, { date: rescheduleForm.date, time: timeStr, status: 'pending' })
                              addActivity(lead.id, lead.status, lead.status, `${fu.type} follow-up rescheduled — ${relativeDayAt(rescheduleForm.date, timeStr)}`, 'FOLLOWUP_CREATED')
                              setReschedulingId(null)
                              showNotification('Follow-up rescheduled')
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">Save</motion.button>
                          <button onClick={() => setReschedulingId(null)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-800'}`}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                          <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fu.date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fu.time}</span>
                          </div>
                          {fu.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => { updateFollowUp(fu.id, { status: 'completed' }); showNotification('Follow-up marked as completed') }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                                <CheckCircle2 className="w-3.5 h-3.5" />Complete
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => { setReschedulingId(fu.id); setRescheduleForm({ date: fu.date, time: '' }) }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'}`}>
                                <Calendar className="w-3.5 h-3.5" />Reschedule
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => setCancelTargetId(fu.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors">
                                <X className="w-3.5 h-3.5" />Cancel
                              </motion.button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            }

            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Follow-ups ({nonMeetingFollowUps.length})</h3>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onTransfer(lead)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">
                    <Plus className="w-3.5 h-3.5" />Schedule Follow-up
                  </motion.button>
                </div>

                {nonMeetingFollowUps.length === 0 ? (
                  <div className={`rounded-xl p-8 text-center ${cardClass}`}>
                    <Calendar className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                    <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No follow-ups scheduled</p>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onTransfer(lead)}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
                      <Plus className="w-3.5 h-3.5" />Schedule Now
                    </motion.button>
                  </div>
                ) : (
                  <>
                    <div className={`rounded-xl p-4 flex items-center gap-3 ${cardClass}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Next Follow-up</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>
                        {nextItem ? `${nextInfo.label} at ${nextItem.time}` : 'None scheduled'}
                      </p>
                    </div>

                    {pending.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Upcoming</h4>
                        <div className="space-y-3">{pending.map(renderRow)}</div>
                      </div>
                    )}
                    {completed.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Completed</h4>
                        <div className="space-y-3">{completed.map(renderRow)}</div>
                      </div>
                    )}
                    {cancelled.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Cancelled</h4>
                        <div className="space-y-3 opacity-70">{cancelled.map(renderRow)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

          {/* ── Meeting Tab ── */}
          {activeTab === 'meeting' && (() => {
            const upcoming = leadMeetings.filter((m) => m.status === 'pending')
              .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`))
            const past = leadMeetings.filter((m) => m.status === 'completed')
              .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
            const noShow = leadMeetings.filter((m) => m.status === 'no_show')
              .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))
            const meetingsCancelled = leadMeetings.filter((m) => m.status === 'cancelled')
              .sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`))

            const renderMeeting = (m) => {
              const typeInfo = meetingTypeOptions.find((t) => t.key === m.meeting_type)
              const TypeIcon = typeInfo?.icon || Video
              return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 ${cardClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${subtleBg.violet}`}><Video className={`w-4 h-4 ${iconColorMap.violet}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Counselling</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        m.status === 'completed'
                          ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                          : m.status === 'cancelled'
                            ? isDark ? 'bg-dark-700 text-dark-400' : 'bg-dark-100 text-dark-500'
                            : m.status === 'no_show'
                              ? isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600'
                              : isDark ? 'bg-accent-500/15 text-accent-400' : 'bg-accent-50 text-accent-600'
                      }`}>{meetingStatusLabel[m.status] || m.status}</span>
                      {typeInfo && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                          <TypeIcon className="w-3 h-3" />{typeInfo.label}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{m.notes}</p>

                    {reschedulingId === m.id ? (
                      <div className="flex flex-wrap items-end gap-2 mt-3">
                        <div>
                          <label className={`block text-xs mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Date</label>
                          <input type="date" value={rescheduleForm.date} onChange={(e) => setRescheduleForm((p) => ({ ...p, date: e.target.value }))}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-2 transition-all ${inputClass}`} />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Time</label>
                          <input type="time" value={rescheduleForm.time} onChange={(e) => setRescheduleForm((p) => ({ ...p, time: e.target.value }))}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-2 transition-all ${inputClass}`} />
                        </div>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (!rescheduleForm.date || !rescheduleForm.time) return
                            const timeStr = new Date(`2000-01-01T${rescheduleForm.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            updateFollowUp(m.id, { date: rescheduleForm.date, time: timeStr, status: 'pending' })
                            addActivity(lead.id, lead.status, lead.status, `Meeting rescheduled — ${relativeDayAt(rescheduleForm.date, timeStr)}`, 'MEETING_SCHEDULED')
                            setReschedulingId(null)
                            showNotification('Meeting rescheduled')
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">Save</motion.button>
                        <button onClick={() => setReschedulingId(null)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-800'}`}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                        <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{m.date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.time}</span>
                        </div>
                        {m.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setShowMeetingOutcomeModal({ lead, meeting: m })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" />Complete
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => { setReschedulingId(m.id); setRescheduleForm({ date: m.date, time: '' }) }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'}`}>
                              <Calendar className="w-3.5 h-3.5" />Reschedule
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => { updateFollowUp(m.id, { status: 'no_show' }); addActivity(lead.id, lead.status, lead.status, 'Counselling — No Show', 'MEETING_NO_SHOW'); showNotification('Marked as No Show') }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'}`}>
                              <UserX className="w-3.5 h-3.5" />No Show
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setCancelTargetId(m.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors">
                              <X className="w-3.5 h-3.5" />Cancel
                            </motion.button>
                          </div>
                        )}
                        {m.status === 'no_show' && (
                          <div className="flex items-center gap-1">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => { setReschedulingId(m.id); setRescheduleForm({ date: m.date, time: '' }) }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'}`}>
                              <Calendar className="w-3.5 h-3.5" />Reschedule
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => { setTransferModalType('call'); setShowTransferModal(lead) }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-primary-400 hover:bg-primary-500/10' : 'text-primary-600 hover:bg-primary-50'}`}>
                              <Plus className="w-3.5 h-3.5" />Create Follow-up
                            </motion.button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
              )
            }

            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Meetings ({leadMeetings.length})</h3>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => onScheduleMeeting(lead)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">
                    <Plus className="w-3.5 h-3.5" />Schedule
                  </motion.button>
                </div>
                {leadMeetings.length === 0 ? (
                  <div className={`rounded-xl p-8 text-center ${cardClass}`}>
                    <Video className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                    <p className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No meetings scheduled</p>
                  </div>
                ) : (
                  <>
                    {upcoming.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Upcoming Meeting{upcoming.length > 1 ? 's' : ''}</h4>
                        <div className="space-y-3">{upcoming.map(renderMeeting)}</div>
                      </div>
                    )}
                    {noShow.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No Show</h4>
                        <div className="space-y-3">{noShow.map(renderMeeting)}</div>
                      </div>
                    )}
                    {past.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Past Meetings</h4>
                        <div className="space-y-3">{past.map(renderMeeting)}</div>
                      </div>
                    )}
                    {meetingsCancelled.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Cancelled</h4>
                        <div className="space-y-3 opacity-70">{meetingsCancelled.map(renderMeeting)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

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

                  {/* Price breakdown — Final Price is the real GST-inclusive
                      amount the Fee Bill tab (and the Admission modal) bills.
                      Discount is editable by admins only ("if authorized");
                      everyone else sees it as plain text. */}
                  <div className={`rounded-lg p-4 mb-5 space-y-2 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Price</span>
                      <span className={`font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{formatINR(matchingPackage.price)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Discount</span>
                      {isAdmin && lead.status !== 'enrolled' ? (
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" max="100" value={discountInput}
                            onChange={(e) => setDiscountInput(e.target.value)}
                            onBlur={() => onDiscountChange(lead, discountInput)}
                            className={`w-16 px-2 py-1 rounded border text-sm text-right outline-none focus:ring-2 transition-all ${inputClass}`} />
                          <span className={isDark ? 'text-dark-400' : 'text-dark-500'}>%</span>
                        </div>
                      ) : (
                        <span className={isDark ? 'text-dark-400' : 'text-dark-500'}>{discountPercent ? `${discountPercent}%` : 'None'}</span>
                      )}
                    </div>
                    <div className={`flex items-center justify-between text-sm pt-2 border-t ${isDark ? 'border-dark-700' : 'border-dark-200'}`}>
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Final Price (incl. GST)</span>
                      <span className={`font-bold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{formatINR(finalPriceWithGst)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2">
                      <span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Shared Date</span>
                      <span className={isDark ? 'text-dark-300' : 'text-dark-600'}>
                        {packageSharedEmail ? new Date(packageSharedEmail.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not shared yet'}
                      </span>
                    </div>
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
                        setEmailModalPreset({
                          subject: `Package Details: ${matchingPackage.name}`,
                          body: `Hi ${lead.name},\n\nHere are the details for the ${matchingPackage.name} course:\n\nDuration: ${matchingPackage.duration}\nModules: ${matchingPackage.modules}\nPrice: ${formatINR(finalPriceWithGst)}\n\nFeatures:\n${matchingPackage.features.map(f => `- ${f}`).join('\n')}\n\nBest regards,\nBIX Academy`,
                        })
                        setShowEmailModal(true)
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                      Share Package
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { if (lead.status !== 'enrolled') setShowAdmissionModal(true) }}
                      disabled={lead.status === 'enrolled'}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all ${lead.status === 'enrolled' ? 'bg-dark-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400'}`}>
                      {lead.status === 'enrolled' ? 'Already Enrolled' : 'Enroll'}
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
                    {discountPercent > 0 && (
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Discount ({discountPercent}%)</span>
                        <span className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>-{formatINR(Math.round(matchingPackage.price * discountPercent / 100))}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>GST (18%)</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(finalPriceWithGst - Math.round(matchingPackage.price * (1 - discountPercent / 100)))}</span>
                    </div>
                    <div className={`border-t pt-3 flex items-center justify-between ${isDark ? 'border-dark-700' : 'border-dark-200'}`}>
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Total</span>
                      <span className={`text-lg font-bold ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{formatINR(finalPriceWithGst)}</span>
                    </div>
                  </div>

                  {/* Real invoice numbers, once one exists — connects to the
                      same invoice the Fees & Billing page manages, rather
                      than re-deriving payment state here. */}
                  {feeInvoice && (
                    <div className={`rounded-lg p-4 mb-5 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`text-xs font-semibold ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Invoice {feeInvoice.id}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          feeInvoice.status === 'paid'
                            ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                            : isDark ? 'bg-accent-500/15 text-accent-400' : 'bg-accent-50 text-accent-600'
                        }`}>{feeInvoice.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div><p className={isDark ? 'text-dark-500' : 'text-dark-400'}>Total</p><p className={`font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(feeInvoice.amount)}</p></div>
                        <div><p className={isDark ? 'text-dark-500' : 'text-dark-400'}>Paid</p><p className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatINR(feeInvoice.paid)}</p></div>
                        <div><p className={isDark ? 'text-dark-500' : 'text-dark-400'}>Pending</p><p className={`font-semibold ${feeInvoice.balance > 0 ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-white' : 'text-dark-900')}`}>{formatINR(feeInvoice.balance)}</p></div>
                        <div><p className={isDark ? 'text-dark-500' : 'text-dark-400'}>Due Date</p><p className={`font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{feeInvoice.due_date || '—'}</p></div>
                      </div>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/billing', { state: { openInvoiceForStudent: lead.name } })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-dark-200 text-dark-800 hover:bg-dark-300'}`}>
                        <IndianRupee className="w-3.5 h-3.5" />View in Fees &amp; Billing
                      </motion.button>
                    </div>
                  )}

                  {feeInvoice?.locked ? (
                    <div className={`rounded-lg p-4 flex items-start gap-3 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                      <Key className={`w-5 h-5 mt-0.5 shrink-0 ${isDark ? 'text-accent-400' : 'text-accent-600'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Fee bill locked — {feeInvoice.payment_plan || 'plan finalized'}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                          Invoice {feeInvoice.id} &middot; {formatINR(feeInvoice.amount)} total. The payment plan can't be changed unless an admin unlocks it.
                        </p>
                        {isAdmin && (
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => { onUnlockInvoice(feeInvoice.id); showNotification('Fee bill unlocked — plan can be changed') }}
                            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-dark-700 text-white hover:bg-dark-600' : 'bg-dark-200 text-dark-800 hover:bg-dark-300'}`}>
                            <Key className="w-3.5 h-3.5" />Unlock to Edit
                          </motion.button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className={`text-xs font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Payment Plan</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                        {['Full Payment', '2 Installments', '3 Installments'].map((plan, i) => (
                          <button key={plan} type="button" onClick={() => setFeePlan(i)} className={`rounded-lg p-3 text-center border cursor-pointer transition-all ${
                            feePlan === i
                              ? isDark ? 'border-primary-500 bg-primary-500/10' : 'border-primary-500 bg-primary-50'
                              : isDark ? 'border-dark-700 hover:border-dark-600' : 'border-dark-200 hover:border-dark-300'
                          }`}>
                            <p className={`text-xs font-semibold ${feePlan === i ? isDark ? 'text-primary-400' : 'text-primary-600' : isDark ? 'text-dark-300' : 'text-dark-600'}`}>{plan}</p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                              {i === 0 ? formatINR(finalPriceWithGst) : i === 1 ? `${formatINR(Math.round(finalPriceWithGst / 2))} x 2` : `${formatINR(Math.round(finalPriceWithGst / 3))} x 3`}
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
                          const planLabel = ['Full Payment', '2 Installments', '3 Installments'][feePlan]
                          const result = await onGenerateFeeBill(lead, matchingPackage, planLabel)
                          if (result?.blocked) {
                            showNotification('This fee bill is already locked — ask an admin to unlock it first', 'error')
                          } else if (result?.invoice) {
                            addActivity(lead.id, lead.status, lead.status, `Fee bill generated — ${planLabel}, ${formatINR(result.invoice.amount)}`, 'FEE_BILL_CREATED')
                            showNotification(`Fee bill ${result.invoice.id} locked in with ${planLabel} — ${formatINR(result.invoice.amount)} (see Fees & Billing)`)
                          } else {
                            showNotification('Could not generate the fee bill — please try again or check with admin', 'error')
                          }
                        }}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all ${lead.status === 'enrolled' ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400' : 'bg-dark-600 cursor-not-allowed opacity-60'}`}>
                        Generate Fee Bill
                      </motion.button>
                      <p className={`text-xs text-center mt-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                        {lead.status === 'enrolled' ? 'Student is enrolled — fee bill ready to generate' : 'Fee bill can be generated once the student is enrolled'}
                      </p>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <IndianRupee className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
                  <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No package matched to generate fee estimate</p>
                </div>
              )}
            </div>
          )}

          {/* ── Course Tab ── */}
          {activeTab === 'course' && (
            <div className="space-y-6">
              <div className={`rounded-xl p-6 ${cardClass}`}>
                <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Selected Course</h3>
                <div className={`rounded-lg p-4 flex items-center gap-3 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                  <GraduationCap className={`w-5 h-5 ${iconColorMap.primary}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{lead.course}</p>
                    {matchingPackage && <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{matchingPackage.duration} &middot; {matchingPackage.modules} Modules</p>}
                  </div>
                </div>

                {lead.status === 'enrolled' ? (
                  enrolledStudent ? (
                    <div className={`mt-4 rounded-lg p-4 ${isDark ? 'bg-dark-800' : 'bg-dark-50'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Student &amp; Batch</p>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{enrolledStudent.name} &middot; {enrolledStudent.status}</p>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                            {enrolledBatch ? `${enrolledBatch.name} — ${enrolledBatch.schedule || 'schedule TBD'}` : 'No batch assigned yet'}
                          </p>
                        </div>
                        <button onClick={() => navigate('/students', { state: { openStudentId: enrolledStudent.id } })}
                          className={`text-xs font-medium ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>
                          View Student &rarr;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-xs mt-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Enrolled, but no matching student record was found.</p>
                  )
                ) : (
                  <p className={`text-xs mt-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>This lead isn't enrolled yet — batch assignment happens during enrollment (Package tab).</p>
                )}
              </div>

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
              {profileNotes.length === 0 ? (
                <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {profileNotes.map((note) => (
                    <div key={note.id} className={`rounded-lg p-3 text-sm ${isDark ? 'bg-dark-800/80' : 'bg-dark-50'}`}>
                      <p className={isDark ? 'text-dark-300' : 'text-dark-600'}>{note.text}</p>
                      <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-600' : 'text-dark-400'}`}>
                        {note.author_name} &middot; {new Date(note.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Cancel confirm — shared by the Follow-up and Meeting tabs. Cancel
          sets status to 'cancelled' (a real, visible terminal state) rather
          than deleting the row, so a cancelled follow-up/meeting stays on
          record instead of silently vanishing. */}
      <AnimatePresence>
        {cancelTargetId && (() => {
          const target = leadFollowUps.find((f) => f.id === cancelTargetId)
          const isMeeting = target?.type === 'meeting'
          return (
            <ConfirmDialog
              title={isMeeting ? 'Cancel Meeting' : 'Cancel Follow-up'}
              message={`Cancel this ${isMeeting ? 'meeting' : 'follow-up'}? It stays on record as cancelled — this can't be undone.`}
              confirmLabel={isMeeting ? 'Cancel Meeting' : 'Cancel Follow-up'}
              icon={X}
              onConfirm={() => {
                updateFollowUp(cancelTargetId, { status: 'cancelled' })
                addActivity(lead.id, lead.status, lead.status, `${isMeeting ? 'Meeting' : (target?.type || 'Follow-up')} cancelled`, isMeeting ? 'MEETING_CANCELLED' : 'FOLLOWUP_CANCELLED')
                setCancelTargetId(null)
                showNotification(isMeeting ? 'Meeting cancelled' : 'Follow-up cancelled')
              }}
              onCancel={() => setCancelTargetId(null)}
              isDark={isDark}
            />
          )
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {showEmailModal && (
          <SendEmailModal
            to={lead.email}
            subject={emailModalPreset?.subject || ''}
            body={emailModalPreset?.body || ''}
            leadId={lead.id}
            isDark={isDark}
            onClose={() => setShowEmailModal(false)}
            onSent={() => {
              showNotification(`Email sent to ${lead.email}`)
              refetchLeadEmails()
              if (emailModalPreset?.subject?.startsWith('Package Details:')) onPackageShared(lead)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdmissionModal && (
          <AdmissionModal
            lead={lead}
            matchingPackage={matchingPackage}
            finalPrice={finalPriceWithGst}
            batches={batches}
            isDark={isDark}
            inputClass={inputClass}
            onClose={() => setShowAdmissionModal(false)}
            onConfirm={(options) => onConfirmAdmission(lead, options)}
          />
        )}
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
  const { leads: leadsData, addLead, updateLead, deleteLead, updateLeadStatus, reopenLead, takeOverLead, followUps: followUpsData, setFollowUps: setFollowUpsData, addFollowUp, updateFollowUp, scheduleFollowUp, recordMeetingOutcome, leadActivities, addActivity, confirmAdmission, markPackageShared, generateFeeBill, unlockInvoice, invoices, packages, teamMembers, leadDocuments, addLeadDocument, deleteLeadDocument, batches, leadNotes, addLeadNote, students } = useData()
  const { isAdmin, user } = useAuth()
  const isLockedForMe = (lead) => !!lead.assigned_to && lead.assigned_to !== user?.id && !isAdmin
  const location = useLocation()
  const navigate = useNavigate()

  const [selectedLead, setSelectedLead] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [courseFilter, setCourseFilter] = useState('All')
  const [assignedFilter, setAssignedFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [followUpDueFilter, setFollowUpDueFilter] = useState('All')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const sortField = 'date'
  const sortDirection = 'desc'
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(null)
  const [transferModalType, setTransferModalType] = useState('call')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [activeProfileTab, setActiveProfileTab] = useState('overview')
  const [notification, setNotification] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null)
  const [showCallOutcomeModal, setShowCallOutcomeModal] = useState(null)
  const [showMeetingOutcomeModal, setShowMeetingOutcomeModal] = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(null)
  const [showNurtureModal, setShowNurtureModal] = useState(null)
  const [showAddNoteModal, setShowAddNoteModal] = useState(null)
  const [showLostModal, setShowLostModal] = useState(null)
  const [lostModalInitialReason, setLostModalInitialReason] = useState('')
  const [showReopenModal, setShowReopenModal] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailPreset, setEmailPreset] = useState(null)
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

  // Clicking "Leads" in the sidebar while already viewing a lead's profile
  // is the same URL, so React Router alone won't close it — the sidebar
  // sends a resetView signal for exactly this case.
  useEffect(() => {
    if (location.state?.resetView) {
      setSelectedLead(null)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  const showNotification = useCallback((message, type = 'success') => setNotification({ message, type }), [])
  const importFileRef = useRef(null)

  const handleImportLeads = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target.result
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      let imported = 0
      let skipped = 0
      // Sequential, not Promise.all — each addLead call checks against the
      // leads already in state, and two rows in the same file sharing a
      // phone/email need the first one to have actually landed in state
      // before the second is checked, or both would look "new".
      for (const line of lines.slice(1)) {
        const cols = line.split(',').map(c => c.trim())
        if (cols.length < 3) continue
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
        if (!name) continue
        const nameParts = name.trim().split(' ')
        const avatar = nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : name.trim().slice(0, 2).toUpperCase()
        const result = await addLead({ id: Date.now() + imported + skipped, name, email, phone, course, source, avatar, status: 'new', priority: 'medium', date: new Date().toISOString().slice(0, 10), notes: '' })
        if (result?.duplicate) skipped++
        else if (result?.data) imported++
      }
      const parts = []
      if (imported > 0) parts.push(`${imported} lead(s) imported`)
      if (skipped > 0) parts.push(`${skipped} skipped as already existing`)
      showNotification(parts.length ? parts.join(', ') : 'No valid leads found in file', imported > 0 ? 'success' : 'error')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const hasActiveFilters = statusFilter !== 'all' || sourceFilter !== 'All' || courseFilter !== 'All' ||
    assignedFilter !== 'All' || priorityFilter !== 'All' || followUpDueFilter !== 'All' || !!dateFrom || !!dateTo || !!searchQuery

  const filteredLeads = useMemo(() => {
    let result = [...leadsData]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.course.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') result = result.filter((l) => l.status === statusFilter)
    if (sourceFilter !== 'All') {
      const sf = sourceFilter.toLowerCase()
      result = result.filter((l) => {
        const src = l.source.toLowerCase()
        if (sf === 'google') return src.includes('google')
        if (sf === 'social') return ['instagram', 'facebook', 'linkedin'].some((s) => src.includes(s))
        return src.includes(sf)
      })
    }
    if (dateFrom) result = result.filter((l) => l.date >= dateFrom)
    if (dateTo) result = result.filter((l) => l.date <= dateTo)
    if (courseFilter !== 'All') result = result.filter((l) => l.course === courseFilter)
    if (assignedFilter !== 'All') {
      result = assignedFilter === 'unassigned'
        ? result.filter((l) => !l.assigned_to)
        : result.filter((l) => l.assigned_to === assignedFilter)
    }
    if (priorityFilter !== 'All') result = result.filter((l) => l.priority === priorityFilter)
    if (followUpDueFilter !== 'All') {
      result = result.filter((l) => {
        const info = followUpDueInfo(getNextFollowUp(l.name, followUpsData))
        if (followUpDueFilter === 'No follow-up') return info.tone === 'none'
        return info.tone === followUpDueFilter.toLowerCase()
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
  }, [leadsData, followUpsData, searchQuery, statusFilter, sourceFilter, dateFrom, dateTo, courseFilter, assignedFilter, priorityFilter, followUpDueFilter, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sourceFilter, dateFrom, dateTo, courseFilter, assignedFilter, priorityFilter, followUpDueFilter])

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

  const handleAddLead = async (newLead) => {
    const result = await addLead(newLead)
    if (result?.duplicate) { showNotification(`Already exists as a lead: ${result.existing.name} (${result.existing.status})`, 'error'); return }
    if (result?.error) { showNotification(`Couldn't add lead: ${result.error}`, 'error'); return }
    setShowAddModal(false)
    showNotification(`${newLead.name} added as a new lead`)
  }

  const handleEditSave = (updatedLead) => {
    updateLead(updatedLead)
    setEditingLead(null)
    const avatar = updatedLead.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    setSelectedLead((prev) => (prev && prev.id === updatedLead.id ? { ...prev, ...updatedLead, avatar } : prev))
    showNotification(`${updatedLead.name}'s information updated`)
  }

  const handleStatusChangeSubmit = (lead, newStatus, note) => {
    const description = `${statusConfig[lead.status]?.label || lead.status} → ${statusConfig[newStatus]?.label}${note ? ` — ${note}` : ''}`
    updateLeadStatus(lead.id, newStatus, description)
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, status: newStatus } : prev))
    setShowStatusModal(null)
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

  // Delegates entirely to DataContext.scheduleFollowUp — the single
  // creation path also used by the Follow-up module, so a follow-up made
  // here is identical (same fields, same status-advance rule, same
  // timeline entry) to one made anywhere else.
  const handleTransferSubmit = (lead, form) => {
    scheduleFollowUp(lead, form)
    setShowTransferModal(null)
    showNotification(`Follow-up scheduled for ${lead.name}`)
  }

  const handleTakeOver = (lead) => {
    takeOverLead(lead.id)
    showNotification(`You've taken over ${lead.name}`)
  }

  const handleAssignLead = (lead, memberId) => {
    const memberName = teamMembers.find((m) => m.id === memberId)?.name || 'team member'
    updateLead({ ...lead, assigned_to: memberId })
    addActivity(lead.id, lead.status, lead.status, `Reassigned to ${memberName}`, 'LEAD_ASSIGNED')
    setShowAssignModal(null)
    showNotification(`${lead.name} assigned to ${memberName}`)
  }

  const handleBatchTimingChange = (lead, timing) => {
    const newTiming = lead.batch_timing === timing ? null : timing
    updateLead({ ...lead, batch_timing: newTiming })
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, batch_timing: newTiming } : prev))
  }

  // Admission Confirmation never writes anything itself — it just calls the
  // one chained workflow function and reports the result back to the modal
  // (student/invoice/whether a student already existed) for the success
  // screen. Nothing is touched until the counsellor explicitly confirms.
  const handleConfirmAdmission = async (lead, options) => {
    const result = await confirmAdmission(lead, options)
    if (result?.error) return result
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, status: 'enrolled' } : prev))
    showNotification(`${lead.name} admitted successfully`)
    return result
  }

  const handleDiscountChange = (lead, percent) => {
    const clamped = Math.max(0, Math.min(100, Number(percent) || 0))
    updateLead({ ...lead, discount_percent: clamped })
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, discount_percent: clamped } : prev))
  }

  // Call → Outcome → (No Response/RNR schedules the next attempt). RNR is
  // just one of the possible outcomes here, not a status or a menu action
  // of its own — it's always logged as an activity on the call.
  const handleCallClick = (lead) => {
    window.open(`tel:${lead.phone}`)
    setShowCallOutcomeModal(lead)
  }

  const handleCallOutcomeSubmit = (lead, outcome, rescheduleForm) => {
    // RNR is just an outcome of a call attempt, never its own status — the
    // attempt number here is purely descriptive (how many times this lead
    // has been called), derived from past call activities already on the
    // timeline (via the structured activity_type, not fragile text matching)
    // rather than a separate counter to keep in sync.
    const attemptNumber = leadActivities.filter((a) => a.lead_id === lead.id && a.activity_type === 'CALL').length + 1
    let description = `Call outcome (Attempt ${attemptNumber}): ${outcome}.`
    if (rescheduleForm) {
      const timeStr = new Date(`2000-01-01T${rescheduleForm.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const noteText = `${outcome}.${rescheduleForm.notes ? ` ${rescheduleForm.notes}` : ''}`
      const existing = followUpsData.find((f) => (f.lead_id === lead.id || f.lead === lead.name) && f.status === 'pending' && f.type !== 'meeting')
      if (existing) {
        updateFollowUp(existing.id, { type: 'call', date: rescheduleForm.date, time: timeStr, notes: noteText, priority: lead.priority, status: 'pending' })
      } else {
        addFollowUp({ id: Date.now(), lead: lead.name, lead_id: lead.id, type: 'call', date: rescheduleForm.date, time: timeStr, notes: noteText, status: 'pending', priority: lead.priority })
      }
      description += ` Next attempt: ${relativeDayAt(rescheduleForm.date, timeStr)}.`
      if (rescheduleForm.notes) description += ` ${rescheduleForm.notes}`
    }
    addActivity(lead.id, lead.status, lead.status, description, 'CALL')
    if (!lead.assigned_to) takeOverLead(lead.id)
    setShowCallOutcomeModal(null)
    showNotification(rescheduleForm ? `Call outcome saved — next attempt scheduled for ${lead.name}` : `Call outcome saved for ${lead.name}`)
  }

  // Records the outcome via the central DataContext function, then nudges
  // the user toward the appropriate next step — opening the relevant modal
  // rather than performing it, so nothing is forced without a click.
  const handleMeetingOutcomeSubmit = (lead, outcome, notes) => {
    const { meeting } = showMeetingOutcomeModal
    recordMeetingOutcome(lead, meeting, outcome, notes)
    setShowMeetingOutcomeModal(null)
    showNotification(`Meeting completed — ${outcome}`)
    if (outcome === 'Interested' || outcome === 'Package Shared') {
      handleSharePackage(lead)
    } else if (outcome === 'Needs Follow-up') {
      setTransferModalType('call')
      setShowTransferModal(lead)
    } else if (outcome === 'Not Interested') {
      setLostModalInitialReason('Not Interested')
      setShowLostModal(lead)
    }
  }

  const handleNurtureSubmit = (lead, reason, nextDate) => {
    // closure_reason is the structured field reporting reads from later
    // ("how many leads are in nurture, why") — the status-change activity
    // below is the human-readable timeline entry for this lead specifically.
    updateLead({ ...lead, status: 'nurture', closure_reason: reason }, `Moved to Nurture — ${reason}`)
    const existing = followUpsData.find((f) => (f.lead_id === lead.id || f.lead === lead.name) && f.status === 'pending' && f.type !== 'meeting')
    if (existing) {
      updateFollowUp(existing.id, { type: 'call', date: nextDate, time: '10:00 AM', notes: reason, priority: lead.priority, status: 'pending' })
    } else {
      addFollowUp({ id: Date.now(), lead: lead.name, lead_id: lead.id, type: 'call', date: nextDate, time: '10:00 AM', notes: reason, status: 'pending', priority: lead.priority })
    }
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, status: 'nurture', closure_reason: reason } : prev))
    setShowNurtureModal(null)
    showNotification(`${lead.name} moved to Nurture`)
  }

  const handleAddNoteSubmit = (leadId, text) => {
    addLeadNote(leadId, text)
    setShowAddNoteModal(null)
    showNotification('Note added')
  }

  const handleSharePackage = (lead) => {
    const pkg = packages.find((p) => p.name.toLowerCase() === lead.course.toLowerCase())
    if (!pkg) { showNotification(`No package found for ${lead.course}`, 'error'); return }
    setEmailPreset({
      to: lead.email,
      leadId: lead.id,
      subject: `Package Details: ${pkg.name}`,
      body: `Hi ${lead.name},\n\nHere are the details for the ${pkg.name} course:\n\nDuration: ${pkg.duration}\nModules: ${pkg.modules}\nPrice: ${formatINR(pkg.price)}\n\nFeatures:\n${pkg.features.map((f) => `- ${f}`).join('\n')}\n\nBest regards,\nBIX Academy`,
    })
    setShowEmailModal(true)
  }

  const handleLostSubmit = (lead, reason, note) => {
    const description = `Marked Lost — ${reason}${note ? `: ${note}` : ''}`
    // closure_reason/closure_note are the structured fields Reports reads
    // from ("why leads are lost / not interested") — notes keeps the same
    // human-readable trail it always has for anyone reading the lead directly.
    updateLead({ ...lead, status: 'lost', closure_reason: reason, closure_note: note || null, notes: `${lead.notes ? `${lead.notes}\n` : ''}[Lost] ${reason}${note ? ` - ${note}` : ''}` }, description)
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, status: 'lost', closure_reason: reason, closure_note: note || null } : prev))
    setShowLostModal(null)
    showNotification(`${lead.name} marked as Lost`)
  }

  const handleReopenSubmit = (lead, newStatus, reason) => {
    reopenLead(lead, newStatus, reason)
    setSelectedLead((prev) => (prev && prev.id === lead.id ? { ...prev, status: newStatus } : prev))
    setShowReopenModal(null)
    showNotification(`${lead.name} reopened — now ${statusConfig[newStatus]?.label}`)
  }

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const inputClass = isDark
    ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
    : 'bg-white border-dark-200 text-dark-900 placeholder-dark-400 focus:border-primary-500 focus:ring-primary-500/20'

  const columns = [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Contact' }, { key: 'course', label: 'Course' },
    { key: 'source', label: 'Source' }, { key: 'agent', label: 'Assigned To' }, { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' }, { key: 'followup', label: 'Next Action' },
  ]

  // "No contact yet" (Next Action tier 6) must come from real call history,
  // not a guess — precomputed once here so every row's lookup is O(1).
  const leadIdsWithCall = useMemo(
    () => new Set((leadActivities || []).filter((a) => a.activity_type === 'CALL').map((a) => a.lead_id)),
    [leadActivities]
  )

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
            onCall={handleCallClick}
            onChangeStatus={(lead) => setShowStatusModal(lead)}
            onSharePackage={handleSharePackage}
            onPackageShared={markPackageShared}
            onAssign={(lead) => setShowAssignModal(lead)}
            onTakeOver={handleTakeOver}
            onAddNoteAction={(lead) => setShowAddNoteModal(lead)}
            onNurture={(lead) => setShowNurtureModal(lead)}
            onLost={(lead) => { setLostModalInitialReason(''); setShowLostModal(lead) }}
            onNotInterested={(lead) => { setLostModalInitialReason('Not Interested'); setShowLostModal(lead) }}
            onReopen={(lead) => setShowReopenModal(lead)}
            onConfirmAdmission={handleConfirmAdmission}
            onDiscountChange={handleDiscountChange}
            onBatchTimingChange={handleBatchTimingChange}
            onGenerateFeeBill={generateFeeBill}
            onUnlockInvoice={unlockInvoice}
            isAdmin={isAdmin}
            invoices={invoices}
            leadDocuments={leadDocuments}
            onAddDocument={addLeadDocument}
            onDeleteDocument={deleteLeadDocument}
            leadNotes={leadNotes}
            onAddNote={addLeadNote}
            followUpsData={followUpsData}
            setFollowUpsData={setFollowUpsData}
            updateFollowUp={updateFollowUp}
            leadActivities={leadActivities}
            addActivity={addActivity}
            cardClass={cardClass}
            inputClass={inputClass}
            activeTab={activeProfileTab}
            setActiveTab={setActiveProfileTab}
            showNotification={showNotification}
            packages={packages}
            teamMembers={teamMembers}
            batches={batches}
            students={students}
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

            {/* Filters + Status Overview — one connected card instead of two
                separate blocks floating with a visual gap between them, so
                filtering and the status buckets it drives read as one unit. */}
            <motion.div variants={itemVariants} className={`rounded-xl ${cardClass}`}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <SlidersHorizontal className={`w-3.5 h-3.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Filters</h3>
                </div>
                {/* Primary filters — kept to 4 so the default screen stays clean */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                    <input type="text" placeholder="Search leads by name, email or course..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-all outline-none focus:ring-2 ${inputClass}`} />
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                    {statusFilterOptions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
                    className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                    {sourceOptions.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s}</option>)}
                  </select>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${isDark ? 'border-dark-700' : 'border-dark-200'}`}>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                      className={`py-1.5 bg-transparent text-sm outline-none cursor-pointer ${isDark ? 'text-dark-200' : 'text-dark-800'}`} />
                    <span className={isDark ? 'text-dark-600' : 'text-dark-300'}>–</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                      className={`py-1.5 bg-transparent text-sm outline-none cursor-pointer ${isDark ? 'text-dark-200' : 'text-dark-800'}`} />
                  </div>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowMoreFilters((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                      showMoreFilters
                        ? isDark ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                        : isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'
                    }`}>
                    {showMoreFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}More Filters
                  </motion.button>
                  {hasActiveFilters && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setStatusFilter('all'); setSourceFilter('All'); setDateFrom(''); setDateTo(''); setSearchQuery('')
                        setCourseFilter('All'); setAssignedFilter('All'); setPriorityFilter('All'); setFollowUpDueFilter('All')
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
                      <X className="w-3.5 h-3.5" />Clear
                    </motion.button>
                  )}
                </div>

                {/* More Filters — Course / Assigned Executive / Priority / Follow-up Due,
                    tucked away so the default screen doesn't show 10+ filters at once */}
                <AnimatePresence>
                  {showMoreFilters && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap mt-3 pt-3 border-t ${isDark ? 'border-dark-800' : 'border-dark-100'}`}>
                        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
                          className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                          <option value="All">All Courses</option>
                          {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}
                          className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                          <option value="All">All Executives</option>
                          <option value="unassigned">Unassigned</option>
                          {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                          className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                          {priorityFilterOptions.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                        </select>
                        <select value={followUpDueFilter} onChange={(e) => setFollowUpDueFilter(e.target.value)}
                          className={`px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer ${inputClass}`}>
                          {followUpDueOptions.map((f) => <option key={f} value={f}>{f === 'All' ? 'All Follow-up Due' : f}</option>)}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Summary Cards — click one to filter the table below */}
              <div className={`border-t px-4 py-4 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {(() => {
                const countColor = {
                  sky: isDark ? 'text-sky-400' : 'text-sky-600', accent: isDark ? 'text-accent-400' : 'text-accent-600',
                  emerald: isDark ? 'text-emerald-400' : 'text-emerald-600', violet: isDark ? 'text-violet-400' : 'text-violet-600',
                  primary: isDark ? 'text-primary-400' : 'text-primary-600', rose: isDark ? 'text-rose-400' : 'text-rose-600',
                  indigo: isDark ? 'text-indigo-400' : 'text-indigo-600', cyan: isDark ? 'text-cyan-400' : 'text-cyan-600',
                  amber: isDark ? 'text-amber-400' : 'text-amber-600', slate: isDark ? 'text-dark-300' : 'text-dark-600',
                }
                const subtleBg = bgSubtleMap(isDark)
                const buckets = [
                  { key: 'all', label: 'All Leads', color: 'slate', icon: Users, count: leadsData.length },
                  ...SUMMARY_CARD_STATUS_KEYS.map((key) => ({ key, label: statusConfig[key].label, color: statusConfig[key].color, icon: statusConfig[key].icon, count: statusCounts[key] || 0 })),
                ]
                return buckets.map((b, i) => {
                  const Icon = b.icon
                  const isActive = statusFilter === b.key
                  return (
                    <motion.button
                      key={b.key}
                      type="button"
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                      whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setStatusFilter(b.key)}
                      className={`min-w-0 rounded-xl p-4 flex items-center gap-3 text-left cursor-pointer transition-all border ${
                        isActive
                          ? 'ring-2 ring-primary-500 border-primary-500'
                          : isDark ? 'bg-dark-800/60 border-dark-700/40 hover:bg-dark-800' : 'bg-dark-50 border-dark-200/40 hover:bg-white hover:shadow-sm'
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
                </div>
              </div>
            </motion.div>

            {/* Leads Table (desktop) / Lead Cards (mobile) */}
            <motion.div variants={itemVariants} className={`rounded-xl overflow-hidden ${cardClass}`}>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDark ? 'bg-dark-800/80' : 'bg-dark-50/80'}>
                      {columns.map((col) => (
                        <th key={col.key}
                          className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                          {col.label}
                        </th>
                      ))}
                      <th className={`px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Action</th>
                    </tr>
                  </thead>
                  <AnimatePresence mode="popLayout">
                    <tbody className={`divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                      {paginatedLeads.map((lead, i) => {
                        const avatarColors = isDark ? avatarColorsDark : avatarColorsLight
                        const sColor = getStatusColor(lead.status)
                        const locked = isLockedForMe(lead)
                        const closed = lead.status === 'enrolled' || lead.status === 'lost'
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
                              <StatusBadge status={lead.status} isDark={isDark} onClick={locked ? undefined : () => setShowStatusModal(lead)} />
                            </td>
                            <td className="px-4 py-3.5"><PriorityBadge priority={lead.priority} isDark={isDark} /></td>
                            <td className="px-4 py-3.5">
                              <NextActionBadge
                                lead={lead}
                                leadFollowUps={followUpsData.filter((f) => f.lead === lead.name)}
                                feeInvoice={invoices.find((inv) => inv.student === lead.name && inv.course === lead.course)}
                                hasCallActivity={leadIdsWithCall.has(lead.id)}
                                isDark={isDark}
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1">
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="View Lead" onClick={() => setSelectedLead(lead)}
                                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
                                  <Eye className="w-4 h-4" />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Call" onClick={() => handleCallClick(lead)}
                                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                                  <Phone className="w-4 h-4" />
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="WhatsApp" onClick={() => navigate('/conversations', { state: { openPhone: lead.phone, leadId: lead.id, leadName: lead.name } })}
                                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                                  <MessageCircle className="w-4 h-4" />
                                </motion.button>
                                {!closed && !locked && (
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Schedule Follow-up"
                                    onClick={() => { setTransferModalType('call'); setShowTransferModal(lead) }}
                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-primary-400 hover:bg-primary-500/10' : 'text-primary-600 hover:bg-primary-50'}`}>
                                    <Calendar className="w-4 h-4" />
                                  </motion.button>
                                )}
                                <div className="relative inline-block">
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="More actions" onClick={(e) => { setActionMenuId(actionMenuId === lead.id ? null : lead.id); setActionMenuAnchor(e.currentTarget) }}
                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </motion.button>
                                  <AnimatePresence>
                                    {actionMenuId === lead.id && (
                                      <LeadActionMenu
                                        lead={lead}
                                        isDark={isDark}
                                        isAdmin={isAdmin}
                                        anchorEl={actionMenuAnchor}
                                        onClose={() => setActionMenuId(null)}
                                        onScheduleMeeting={(l) => { setTransferModalType('meeting'); setShowTransferModal(l) }}
                                        onSharePackage={handleSharePackage}
                                        onChangeStatus={(l) => setShowStatusModal(l)}
                                        onOpenEnroll={(l) => { setSelectedLead(l); setActiveProfileTab('package') }}
                                        onAssign={(l) => setShowAssignModal(l)}
                                        onTakeOver={handleTakeOver}
                                        onAddNote={(l) => setShowAddNoteModal(l)}
                                        onNurture={(l) => setShowNurtureModal(l)}
                                        onLost={(l) => { setLostModalInitialReason(''); setShowLostModal(l) }}
                                        onNotInterested={(l) => { setLostModalInitialReason('Not Interested'); setShowLostModal(l) }}
                                        onReopen={(l) => setShowReopenModal(l)}
                                        onEdit={(l) => setEditingLead(l)}
                                        onDelete={(l) => setShowDeleteConfirm(l)}
                                      />
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </AnimatePresence>
                </table>
              </div>

              {/* Mobile cards */}
              <div className={`md:hidden divide-y ${isDark ? 'divide-dark-800' : 'divide-dark-100'}`}>
                {paginatedLeads.map((lead) => {
                  const avatarColors = isDark ? avatarColorsDark : avatarColorsLight
                  const sColor = getStatusColor(lead.status)
                  return (
                    <div key={lead.id} className="p-4" onClick={() => setSelectedLead(lead)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColors[sColor]}`}>{lead.avatar}</div>
                          <div className="min-w-0">
                            <p className={`font-semibold truncate ${isDark ? 'text-dark-100' : 'text-dark-900'}`}>{lead.name}</p>
                            <p className={`text-xs truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{lead.course}</p>
                          </div>
                        </div>
                        <motion.button whileTap={{ scale: 0.9 }} title="Call" onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`) }}
                          className={`p-2 rounded-lg shrink-0 transition-colors ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Phone className="w-4 h-4" />
                        </motion.button>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-3">
                        <StatusBadge status={lead.status} isDark={isDark} />
                        <PriorityBadge priority={lead.priority} isDark={isDark} />
                        <NextActionBadge
                          lead={lead}
                          leadFollowUps={followUpsData.filter((f) => f.lead === lead.name)}
                          feeInvoice={invoices.find((inv) => inv.student === lead.name && inv.course === lead.course)}
                          hasCallActivity={leadIdsWithCall.has(lead.id)}
                          isDark={isDark}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredLeads.length === 0 && (
                <div className={`text-center py-12 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">
                    {followUpDueFilter === 'Today' ? 'No follow-ups due today.' : hasActiveFilters ? 'No leads match your filters.' : 'No leads found.'}
                  </p>
                  {hasActiveFilters && <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>}
                </div>
              )}

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
        {showCallOutcomeModal && <CallOutcomeModal key={`call-${showCallOutcomeModal.id}`} lead={showCallOutcomeModal} isDark={isDark} onClose={() => setShowCallOutcomeModal(null)} onSubmit={handleCallOutcomeSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showMeetingOutcomeModal && <MeetingOutcomeModal key={`meeting-outcome-${showMeetingOutcomeModal.meeting.id}`} lead={showMeetingOutcomeModal.lead} isDark={isDark} onClose={() => setShowMeetingOutcomeModal(null)} onSubmit={handleMeetingOutcomeSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showStatusModal && <ChangeStatusModal key={`status-${showStatusModal.id}`} lead={showStatusModal} isDark={isDark} onClose={() => setShowStatusModal(null)} onSubmit={handleStatusChangeSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showNurtureModal && <NurtureModal key={`nurture-${showNurtureModal.id}`} lead={showNurtureModal} isDark={isDark} onClose={() => setShowNurtureModal(null)} onSubmit={handleNurtureSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAddNoteModal && <AddNoteModal key={`note-${showAddNoteModal.id}`} lead={showAddNoteModal} isDark={isDark} onClose={() => setShowAddNoteModal(null)} onSubmit={handleAddNoteSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showLostModal && <LostReasonModal key={`lost-${showLostModal.id}`} lead={showLostModal} isDark={isDark} onClose={() => { setShowLostModal(null); setLostModalInitialReason('') }} onSubmit={handleLostSubmit} inputClass={inputClass} initialReason={lostModalInitialReason} />}
      </AnimatePresence>
      <AnimatePresence>
        {showReopenModal && <ReopenModal key={`reopen-${showReopenModal.id}`} lead={showReopenModal} isDark={isDark} onClose={() => setShowReopenModal(null)} onSubmit={handleReopenSubmit} inputClass={inputClass} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAssignModal && <AssignModal key={`assign-${showAssignModal.id}`} lead={showAssignModal} isDark={isDark} onClose={() => setShowAssignModal(null)} onAssign={handleAssignLead} teamMembers={teamMembers} />}
      </AnimatePresence>
      <AnimatePresence>
        {showEmailModal && emailPreset && (
          <SendEmailModal
            to={emailPreset.to}
            subject={emailPreset.subject}
            body={emailPreset.body}
            leadId={emailPreset.leadId}
            isDark={isDark}
            onClose={() => { setShowEmailModal(false); setEmailPreset(null) }}
            onSent={() => {
              showNotification('Package details emailed')
              const lead = leadsData.find((l) => l.id === emailPreset.leadId)
              if (lead) markPackageShared(lead)
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmDialog
            message={`Delete ${showDeleteConfirm.name} permanently? All of their follow-ups, meetings, notes and timeline history will be lost too. This cannot be undone.`}
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
