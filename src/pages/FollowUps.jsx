import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, MessageCircle, Calendar, Clock, Check, CheckCircle, AlertCircle, ListFilter, LayoutList,
  CalendarDays, Plus, X, ChevronDown, Search, Bell, GraduationCap, Trash2, CheckCircle2, UserX,
  UserCheck, History, CalendarClock, MoreHorizontal, RotateCcw, Eye, StickyNote, Flag, UserCog, Moon,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import AnchoredMenu from '../components/AnchoredMenu'
import { FOLLOWUP_TYPES, CREATABLE_FOLLOWUP_TYPES, followUpTypeInfo, followUpTypeLabel } from '../lib/followUpTypes'
import { outcomesForType, OUTCOME_NEXT_ACTION, NOT_INTERESTED_REASONS, RESCHEDULE_PRESETS, OUTCOMES } from '../lib/followUpOutcomes'
import { emitAutomationEvent, AUTOMATION_EVENTS } from '../lib/automation'

const priorityConfig = {
  high: { color: 'rose', label: 'High' },
  medium: { color: 'accent', label: 'Medium' },
  low: { color: 'emerald', label: 'Low' },
}

// Static class lookup — Tailwind can't resolve `bg-${color}-500` template
// literals at build time, so every color this page ever needs (from
// FOLLOWUP_TYPES and priorityConfig) is spelled out explicitly here
// instead of interpolated.
const COLOR_CLASSES = {
  sky: { bg10: 'bg-sky-500/10', bg15: 'bg-sky-500/15', text: 'text-sky-500', border: 'border-sky-500', borderL: 'border-l-sky-500' },
  emerald: { bg10: 'bg-emerald-500/10', bg15: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-emerald-500', borderL: 'border-l-emerald-500' },
  violet: { bg10: 'bg-violet-500/10', bg15: 'bg-violet-500/15', text: 'text-violet-500', border: 'border-violet-500', borderL: 'border-l-violet-500' },
  cyan: { bg10: 'bg-cyan-500/10', bg15: 'bg-cyan-500/15', text: 'text-cyan-500', border: 'border-cyan-500', borderL: 'border-l-cyan-500' },
  amber: { bg10: 'bg-amber-500/10', bg15: 'bg-amber-500/15', text: 'text-amber-500', border: 'border-amber-500', borderL: 'border-l-amber-500' },
  indigo: { bg10: 'bg-indigo-500/10', bg15: 'bg-indigo-500/15', text: 'text-indigo-500', border: 'border-indigo-500', borderL: 'border-l-indigo-500' },
  slate: { bg10: 'bg-dark-500/10', bg15: 'bg-dark-500/15', text: 'text-dark-400', border: 'border-dark-400', borderL: 'border-l-dark-400' },
  primary: { bg10: 'bg-primary-500/10', bg15: 'bg-primary-500/15', text: 'text-primary-500', border: 'border-primary-500', borderL: 'border-l-primary-500' },
  rose: { bg10: 'bg-rose-500/10', bg15: 'bg-rose-500/15', text: 'text-rose-500', border: 'border-rose-500', borderL: 'border-l-rose-500' },
  accent: { bg10: 'bg-accent-500/10', bg15: 'bg-accent-500/15', text: 'text-accent-500', border: 'border-accent-500', borderL: 'border-l-accent-500' },
}
function colorClasses(color) { return COLOR_CLASSES[color] || COLOR_CLASSES.slate }

// Pending/Completed/Cancelled are the only real statuses in the DB — "Due
// Today"/"Overdue" are never stored, always derived from a pending item's
// date vs today (see followUpUrgency below). 'no_show' stays a valid DB
// value (meetings can be marked that way from the Meeting tab) but isn't
// one of the five statuses this module surfaces as a primary concept.

const today = new Date().toISOString().split('T')[0]

function timeToMinutes(t) {
  if (!t) return 0
  const m = String(t).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const period = m[3]?.toUpperCase()
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + min
}

// Overdue -> Due Today -> Upcoming, and within the same tier, earliest
// time first — "what do I need to do today" has to read top-to-bottom.
function followUpUrgency(fu) {
  if (fu.date < today) return 'overdue'
  if (fu.date === today) return 'today'
  return 'upcoming'
}
const URGENCY_RANK = { overdue: 0, today: 1, upcoming: 2 }
function sortActive(list) {
  return [...list].sort((a, b) => {
    const ra = URGENCY_RANK[followUpUrgency(a)], rb = URGENCY_RANK[followUpUrgency(b)]
    if (ra !== rb) return ra - rb
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return timeToMinutes(a.time) - timeToMinutes(b.time)
  })
}

function getWeekDates() {
  const current = new Date(today)
  const dayOfWeek = current.getDay()
  const monday = new Date(current)
  monday.setDate(current.getDate() - ((dayOfWeek + 6) % 7))
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      date: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      isToday: d.toISOString().split('T')[0] === today,
    })
  }
  return days
}

const inputCls = (isDark) => `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`
const labelCls = (isDark) => `block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`
const modalShellCls = (isDark) => `w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`

// ─── COMPLETE FOLLOW-UP — the outcome dialog (spec section 4/5/6) ───────
// Step 1: pick the outcome, filtered to what's relevant for this action
// type. Step 2: whatever that outcome sensibly leads to next — always
// skippable, never forced (spec section 23). Meetings never reach this —
// they're routed to the Meeting tab's own recordMeetingOutcome flow.
function CompleteFollowUpModal({ fu, lead, isDark, onClose, onComplete }) {
  const [step, setStep] = useState('outcome')
  const [outcomeKey, setOutcomeKey] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [rescheduleChoice, setRescheduleChoice] = useState('skip')
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [wantMeeting, setWantMeeting] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('10:00')
  const [nurtureChoice, setNurtureChoice] = useState('nurture')
  const [nurtureDate, setNurtureDate] = useState('')
  const [typedDate, setTypedDate] = useState('')
  const [typedTime, setTypedTime] = useState('10:00')
  const [reason, setReason] = useState('')

  const outcomes = outcomesForType(fu.type)
  const next = outcomeKey ? (OUTCOME_NEXT_ACTION[outcomeKey] || { kind: 'none' }) : null

  const buildOptions = () => {
    if (!next) return { note }
    switch (next.kind) {
      case 'reschedule':
        if (rescheduleChoice === 'skip') return { note }
        if (rescheduleChoice === 'custom') return { note, customDate, customTime }
        return { note, rescheduleDays: Number(rescheduleChoice) }
      case 'schedule_meeting':
        return { note, scheduleMeeting: wantMeeting && meetingDate ? { date: meetingDate, time: meetingTime } : undefined }
      case 'nurture':
        if (nurtureChoice === 'nurture') return { note, moveToNurture: true, nurtureCheckDate: nurtureDate || undefined }
        if (nurtureChoice === 'followup') return { note, followUp: typedDate ? { date: typedDate, time: typedTime } : undefined }
        return { note }
      case 'schedule_followup_typed':
        return { note, followUp: typedDate ? { date: typedDate, time: typedTime } : undefined }
      case 'close':
        return { note, notInterestedReason: reason }
      default:
        return { note }
    }
  }

  const canSubmit = next?.kind !== 'close' || !!reason

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    const result = await onComplete(outcomeKey, buildOptions())
    setSubmitting(false)
    if (result?.error) setError(result.error)
  }

  const typeInfo = followUpTypeInfo(fu.type)

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`${modalShellCls(isDark)} z-10`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Complete Follow-up</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{typeInfo.label} with {lead?.name || fu.lead}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {step === 'outcome' && (
            <div>
              <p className={labelCls(isDark)}>What's the outcome?</p>
              <div className="grid grid-cols-2 gap-2">
                {outcomes.map((o) => (
                  <button key={o.key} type="button" onClick={() => { setOutcomeKey(o.key); setStep('next') }}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border text-left transition-colors ${isDark ? 'border-dark-700 text-dark-200 hover:border-primary-500 hover:bg-primary-500/10' : 'border-dark-200 text-dark-700 hover:border-primary-500 hover:bg-primary-50'}`}
                  >{o.label}</button>
                ))}
              </div>
            </div>
          )}

          {step === 'next' && next && (
            <div className="space-y-5">
              <button onClick={() => setStep('outcome')} className={`text-xs font-medium ${isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>&larr; Change outcome</button>
              <div className={`rounded-xl p-3 text-sm font-medium ${isDark ? 'bg-dark-800 text-dark-200' : 'bg-dark-50 text-dark-700'}`}>
                Outcome: <span className="font-semibold">{OUTCOMES[outcomeKey]?.label}</span>
              </div>

              {next.kind === 'reschedule' && (
                <div>
                  <p className={labelCls(isDark)}>Schedule the next attempt?</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {RESCHEDULE_PRESETS.map((p) => (
                      <button key={p.days} type="button" onClick={() => setRescheduleChoice(String(p.days))}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${rescheduleChoice === String(p.days) ? 'border-primary-500 bg-primary-500/10 text-primary-500' : isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}
                      >{p.label}</button>
                    ))}
                    <button type="button" onClick={() => setRescheduleChoice('custom')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${rescheduleChoice === 'custom' ? 'border-primary-500 bg-primary-500/10 text-primary-500' : isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}
                    >Custom Date</button>
                    <button type="button" onClick={() => setRescheduleChoice('skip')}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${rescheduleChoice === 'skip' ? 'border-primary-500 bg-primary-500/10 text-primary-500' : isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}
                    >Don't schedule</button>
                  </div>
                  {rescheduleChoice === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={inputCls(isDark)} />
                      <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className={inputCls(isDark)} />
                    </div>
                  )}
                </div>
              )}

              {next.kind === 'schedule_meeting' && (
                <div>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input type="checkbox" checked={wantMeeting} onChange={(e) => setWantMeeting(e.target.checked)} className="w-4 h-4 accent-primary-500" />
                    <span className={`text-sm font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>Schedule a Counselling session now</span>
                  </label>
                  {wantMeeting && (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputCls(isDark)} />
                      <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className={inputCls(isDark)} />
                    </div>
                  )}
                </div>
              )}

              {next.kind === 'nurture' && (
                <div>
                  <p className={labelCls(isDark)}>What next?</p>
                  <div className="space-y-2 mb-3">
                    {[
                      { key: 'nurture', label: 'Move to Nurture — contact again later' },
                      { key: 'followup', label: 'Just schedule another follow-up' },
                      { key: 'skip', label: "Don't schedule anything" },
                    ].map((o) => (
                      <label key={o.key} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="nurtureChoice" checked={nurtureChoice === o.key} onChange={() => setNurtureChoice(o.key)} className="w-4 h-4 accent-primary-500" />
                        <span className={`text-sm ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{o.label}</span>
                      </label>
                    ))}
                  </div>
                  {nurtureChoice === 'nurture' && (
                    <div>
                      <label className={labelCls(isDark)}>Check back on</label>
                      <input type="date" value={nurtureDate} onChange={(e) => setNurtureDate(e.target.value)} className={inputCls(isDark)} />
                    </div>
                  )}
                  {nurtureChoice === 'followup' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={typedDate} onChange={(e) => setTypedDate(e.target.value)} className={inputCls(isDark)} />
                      <input type="time" value={typedTime} onChange={(e) => setTypedTime(e.target.value)} className={inputCls(isDark)} />
                    </div>
                  )}
                </div>
              )}

              {next.kind === 'schedule_followup_typed' && (
                <div>
                  <p className={labelCls(isDark)}>Schedule a {followUpTypeLabel(next.followupType)}?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={typedDate} onChange={(e) => setTypedDate(e.target.value)} className={inputCls(isDark)} />
                    <input type="time" value={typedTime} onChange={(e) => setTypedTime(e.target.value)} className={inputCls(isDark)} />
                  </div>
                  <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Leave blank to skip.</p>
                </div>
              )}

              {next.kind === 'admission' && (
                <div className={`rounded-xl p-4 text-sm ${isDark ? 'bg-primary-500/10 text-primary-300' : 'bg-primary-50 text-primary-700'}`}>
                  This opens the Admission workflow for {lead?.name || fu.lead} — pick a package, batch, and payment plan there to complete enrollment.
                </div>
              )}

              {next.kind === 'close' && (
                <div>
                  <label className={labelCls(isDark)}>Reason *</label>
                  <select required value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls(isDark)}>
                    <option value="">Select a reason…</option>
                    {NOT_INTERESTED_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls(isDark)}>Note (optional)</label>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth recording…" className={`${inputCls(isDark)} resize-none`} />
              </div>

              {error && <p className="text-sm text-rose-500">{error}</p>}
            </div>
          )}
        </div>

        {step === 'next' && (
          <div className={`flex justify-end gap-3 px-6 py-4 border-t shrink-0 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
            <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
            <button disabled={!canSubmit || submitting} onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25 disabled:opacity-50">
              {submitting ? 'Completing…' : next.kind === 'admission' ? 'Complete & Start Admission' : 'Complete Follow-up'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── QUICK RESCHEDULE POPOVER ───────────────────────────────────────────
function QuickReschedulePopover({ fu, isDark, anchorEl, onClose, onReschedule }) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  const itemCls = `w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'}`
  return (
    <AnchoredMenu anchorEl={anchorEl} onClose={onClose}>
      <div className={`w-64 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80' : 'bg-white border-dark-200'}`}>
        <p className={`px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Reschedule</p>
        {RESCHEDULE_PRESETS.map((p) => (
          <button key={p.days} className={itemCls} onClick={() => { onReschedule(new Date(Date.now() + p.days * 86400000).toISOString().slice(0, 10), fu.time); onClose() }}>
            <Clock className="w-3.5 h-3.5" />{p.label}
          </button>
        ))}
        <div className="px-3 py-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
            className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-xs outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
          <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)}
            className={`w-[4.7rem] px-1.5 py-1.5 rounded-lg border text-xs outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
          <button type="button" disabled={!customDate} onClick={() => { onReschedule(customDate, customTime); onClose() }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 transition-colors">Set</button>
        </div>
      </div>
    </AnchoredMenu>
  )
}

// ─── SECONDARY ACTIONS MENU (spec section 13) ───────────────────────────
function MoreActionsMenu({ isDark, canManage, isAdmin, anchorEl, onClose, onViewLead, onAddNote, onChangePriority, onReassign, onCancel, onDelete }) {
  const itemCls = `w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'}`
  const dividerCls = `my-1 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-100'}`
  const item = (icon, label, onClick, extraCls = '') => (
    <button onClick={() => { onClick(); onClose() }} className={`${itemCls} ${extraCls}`}>{icon}{label}</button>
  )
  return (
    <AnchoredMenu anchorEl={anchorEl} onClose={onClose}>
      <div className={`w-52 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80' : 'bg-white border-dark-200'}`}>
        {item(<Eye className="w-3.5 h-3.5" />, 'View Lead', onViewLead)}
        {item(<StickyNote className="w-3.5 h-3.5" />, 'Add Note', onAddNote)}
        {item(<Flag className="w-3.5 h-3.5" />, 'Change Priority', onChangePriority)}
        {canManage && (
          <>
            <div className={dividerCls} />
            {item(<UserCog className="w-3.5 h-3.5" />, 'Reassign', onReassign)}
            {item(<X className="w-3.5 h-3.5" />, 'Cancel Follow-up', onCancel, isDark ? 'text-rose-400' : 'text-rose-600')}
          </>
        )}
        {isAdmin && (
          <>
            <div className={dividerCls} />
            {item(<Trash2 className="w-3.5 h-3.5" />, 'Delete', onDelete, isDark ? 'text-rose-400' : 'text-rose-600')}
          </>
        )}
      </div>
    </AnchoredMenu>
  )
}

// ─── SMALL UTILITY MODALS ────────────────────────────────────────────────
function AddNoteModal({ fu, isDark, onClose, onSubmit }) {
  const [text, setText] = useState('')
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-dark-900'}`}>Add Note — {fu.lead}</h3>
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Note about this lead…" className={`${inputCls(isDark)} resize-none mb-4`} />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          <button disabled={!text.trim()} onClick={() => onSubmit(text.trim())} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50">Add Note</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PriorityModal({ fu, isDark, onClose, onSubmit }) {
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-xs rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Change Priority</h3>
        <div className="space-y-2">
          {Object.entries(priorityConfig).map(([key, config]) => (
            <button key={key} onClick={() => onSubmit(key)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium border text-left transition-colors ${fu.priority === key ? 'border-primary-500 bg-primary-500/10 text-primary-500' : isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}
            >{config.label}</button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ReassignModal({ fu, isDark, teamMembers, onClose, onSubmit }) {
  const [memberId, setMemberId] = useState(fu.assigned_to || '')
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-xs rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Reassign</h3>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={`${inputCls(isDark)} mb-4`}>
          <option value="">Unassigned</option>
          {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          <button onClick={() => onSubmit(memberId || null)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600">Save</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── FOLLOW-UP CARD (spec section 12) ───────────────────────────────────
function FollowUpCard({ fu, isDark, cardClass, fuLead, assignedName, completedByName, lastActivityText, isLocked, canManage, isAdmin, onCall, onWhatsApp, onComplete, onReschedule, onViewLead, onViewTimeline, onAddNote, onChangePriority, onReassign, onCancel, onDelete }) {
  const typeInfo = followUpTypeInfo(fu.type)
  const TypeIcon = typeInfo.icon
  const prioInfo = priorityConfig[fu.priority] || priorityConfig.medium
  const urgency = fu.status === 'pending' ? followUpUrgency(fu) : null
  const [rescheduleAnchor, setRescheduleAnchor] = useState(null)
  const [moreAnchor, setMoreAnchor] = useState(null)

  const typeColor = colorClasses(typeInfo.color)
  const finalBorder = urgency === 'overdue' ? COLOR_CLASSES.rose.borderL : urgency === 'today' ? COLOR_CLASSES.amber.borderL : typeColor.borderL

  const isDone = fu.status !== 'pending'

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} layout
      className={`rounded-2xl border-l-4 ${finalBorder} ${cardClass} ${isDone ? 'opacity-80' : ''}`}
    >
      <div className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 ${typeColor.bg10} ${typeColor.text}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 onClick={onViewLead} className={`font-semibold cursor-pointer hover:underline ${isDark ? 'text-white hover:text-primary-400' : 'text-dark-900 hover:text-primary-600'}`}>{fu.lead}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor.bg10} ${typeColor.text}`}>{typeInfo.label}</span>
                {fuLead?.status === 'enrolled' && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-primary-500/15 text-primary-400' : 'bg-primary-50 text-primary-600'}`}><GraduationCap className="w-3 h-3" />Enrolled</span>
                )}
                {fuLead?.status === 'lost' && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600'}`}><UserX className="w-3 h-3" />Lost</span>
                )}
                {fuLead?.status === 'nurture' && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-dark-700 text-dark-300' : 'bg-dark-100 text-dark-600'}`}><Moon className="w-3 h-3" />Nurture</span>
                )}
              </div>
              {fuLead?.course && <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{fuLead.course}</p>}
              <div className={`flex items-center gap-3 mt-1.5 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{urgency === 'today' ? 'Today' : urgency === 'overdue' ? `Overdue — was ${fu.date}` : fu.date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fu.time}</span>
              </div>
              <div className={`flex items-center gap-4 mt-1.5 text-xs flex-wrap ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" />{assignedName || 'Unassigned'}</span>
                <span className={`flex items-center gap-1 ${prioInfo.color === 'rose' ? 'text-rose-500' : ''}`}><Flag className="w-3.5 h-3.5" />{prioInfo.label}</span>
                {lastActivityText && <span className="flex items-center gap-1 truncate max-w-[240px]"><History className="w-3.5 h-3.5 shrink-0" />{lastActivityText}</span>}
              </div>
              {isDone && (
                <div className={`mt-2 pt-2 border-t text-xs space-y-0.5 ${isDark ? 'border-dark-700/60' : 'border-dark-100'}`}>
                  <p className={`font-semibold ${fu.status === 'cancelled' ? (isDark ? 'text-dark-400' : 'text-dark-500') : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {fu.status === 'cancelled' ? '✕ Cancelled' : `✓ Completed${fu.outcome ? ` — ${OUTCOMES[fu.outcome]?.label || fu.outcome}` : ''}`}
                  </p>
                  {(fu.status === 'completed' ? fu.completed_at : fu.cancelled_at) && (
                    <p className={isDark ? 'text-dark-500' : 'text-dark-400'}>
                      {fu.status === 'completed' ? 'Completed' : 'Cancelled'}: {new Date(fu.status === 'completed' ? fu.completed_at : fu.cancelled_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {completedByName ? ` · by ${completedByName}` : ''}
                    </p>
                  )}
                  {fu.status === 'completed' && (fu.completion_note || fu.notes) && (
                    <p className={isDark ? 'text-dark-400' : 'text-dark-500'}>{fu.completion_note || fu.notes}</p>
                  )}
                  {fu.status === 'cancelled' && fu.cancellation_reason && (
                    <p className={isDark ? 'text-dark-400' : 'text-dark-500'}>Reason: {fu.cancellation_reason}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isDone ? (
              // Completed/Cancelled records are read-only by default (spec
              // 9/26) — no Complete/Reschedule/Cancel/Reassign here, just a
              // way back to the lead.
              <>
                <button onClick={onViewLead} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}><Eye className="w-3.5 h-3.5" />View Lead</button>
                <button onClick={onViewTimeline} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}><History className="w-3.5 h-3.5" />View Timeline</button>
              </>
            ) : isLocked ? (
              <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Handled by another rep</span>
            ) : (
              <>
                <button onClick={onCall} title="Call" className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-emerald-400' : 'bg-dark-100 text-dark-600 hover:text-emerald-600'}`}><Phone className="w-4 h-4" /></button>
                <button onClick={onWhatsApp} title="WhatsApp" className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-emerald-400' : 'bg-dark-100 text-dark-600 hover:text-emerald-600'}`}><MessageCircle className="w-4 h-4" /></button>
                <button onClick={onComplete} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all"><Check className="w-3.5 h-3.5" />Complete</button>
                <button onClick={(e) => setRescheduleAnchor(e.currentTarget)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}><RotateCcw className="w-3.5 h-3.5" />Reschedule</button>
                <AnimatePresence>
                  {rescheduleAnchor && <QuickReschedulePopover fu={fu} isDark={isDark} anchorEl={rescheduleAnchor} onClose={() => setRescheduleAnchor(null)} onReschedule={onReschedule} />}
                </AnimatePresence>
              </>
            )}
            {!isDone && (
            <button onClick={(e) => setMoreAnchor(e.currentTarget)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-dark-500 hover:bg-dark-100'}`}><MoreHorizontal className="w-4 h-4" /></button>
            )}
            <AnimatePresence>
              {moreAnchor && (
                <MoreActionsMenu isDark={isDark} canManage={canManage} isAdmin={isAdmin} anchorEl={moreAnchor} onClose={() => setMoreAnchor(null)}
                  onViewLead={onViewLead} onAddNote={onAddNote} onChangePriority={onChangePriority} onReassign={onReassign} onCancel={onCancel} onDelete={onDelete}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function FollowUps() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState('list')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  // Active work first (spec 21) — "All" (everything, including completed)
  // is one explicit click away, not the default.
  const [bucketFilter, setBucketFilter] = useState('active')
  const [showModal, setShowModal] = useState(false)
  const {
    followUps: localFollowUps, updateFollowUp, scheduleFollowUp, rescheduleFollowUp, cancelFollowUp, completeFollowUpOutcome,
    leads, deleteFollowUp, addActivity, addLeadNote, teamMembers, takeOverLead, leadActivities,
  } = useData()
  const { isAdmin, canManageTeam, user } = useAuth()
  const [notification, setNotification] = useState(null)
  const [completingFu, setCompletingFu] = useState(null)
  const [notingFu, setNotingFu] = useState(null)
  const [priorityFu, setPriorityFu] = useState(null)
  const [reassignFu, setReassignFu] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [calendarItem, setCalendarItem] = useState(null)

  const showToast = (message, type = 'success') => setNotification({ message, type })

  const [formData, setFormData] = useState({ lead: '', type: 'call', date: '', time: '', priority: 'medium', notes: '', assignedTo: '' })
  const [leadQuery, setLeadQuery] = useState('')
  const [showLeadPicker, setShowLeadPicker] = useState(false)

  const getLeadFor = (fu) => leads.find((l) => l.id === fu.lead_id || l.name === fu.lead)
  const goToLead = (fu, tab) => {
    const lead = getLeadFor(fu)
    if (lead) navigate('/leads', { state: { openLeadId: lead.id, ...(tab ? { openTab: tab } : {}) } })
    else showToast(`Lead "${fu.lead}" not found`, 'error')
  }
  const getLastActivityText = (fu) => {
    const lead = getLeadFor(fu)
    if (!lead) return null
    const last = leadActivities.filter((a) => a.lead_id === lead.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    return last?.description || null
  }

  // Sales sees only their own assigned work ("View assigned follow-ups");
  // Manager/Admin sees the whole team's ("View team follow-ups") — spec
  // section 25. Sales gets no executive picker at all since it wouldn't
  // do anything for them.
  const scopedFollowUps = canManageTeam ? localFollowUps : localFollowUps.filter((f) => (f.assigned_to || getLeadFor(f)?.assigned_to) === user?.id)

  const filtered = scopedFollowUps.filter((fu) => {
    if (typeFilter !== 'all' && fu.type !== typeFilter) return false
    if (priorityFilter !== 'all' && fu.priority !== priorityFilter) return false
    if (canManageTeam && assignedFilter !== 'all' && (fu.assigned_to || getLeadFor(fu)?.assigned_to) !== assignedFilter) return false
    if (outcomeFilter !== 'all' && fu.outcome !== outcomeFilter) return false
    if (courseFilter !== 'all' && getLeadFor(fu)?.course !== courseFilter) return false
    if (dateFrom && fu.date < dateFrom) return false
    if (dateTo && fu.date > dateTo) return false
    if (bucketFilter === 'active' && fu.status !== 'pending') return false
    if (bucketFilter === 'today' && !(fu.status === 'pending' && fu.date === today)) return false
    if (bucketFilter === 'overdue' && !(fu.status === 'pending' && fu.date < today)) return false
    if (bucketFilter === 'upcoming' && !(fu.status === 'pending' && fu.date > today)) return false
    if (bucketFilter === 'completed' && fu.status !== 'completed') return false
    return true
  })
  const displayList = bucketFilter === 'completed'
    ? [...filtered].sort((a, b) => new Date(b.completed_at || b.date) - new Date(a.completed_at || a.date))
    : sortActive(filtered)

  const todayCount = scopedFollowUps.filter((f) => f.status === 'pending' && f.date === today).length
  const overdueCount = scopedFollowUps.filter((f) => f.status === 'pending' && f.date < today).length
  const upcomingCount = scopedFollowUps.filter((f) => f.status === 'pending' && f.date > today).length
  const activeCount = scopedFollowUps.filter((f) => f.status === 'pending').length
  const completedCount = scopedFollowUps.filter((f) => f.status === 'completed').length

  const courseOptions = [...new Set(leads.map((l) => l.course).filter(Boolean))].sort()

  // Automation-ready: log that a follow-up was observed due-today or
  // overdue, so a future reminder job has something to consume. No
  // WhatsApp/Email is sent — every configured action for these events is
  // still empty (see lib/automation.js). Safe to run on every load: the
  // DB's unique(event_type, source_table, source_id) constraint means each
  // follow-up only ever logs one FOLLOW_UP_DUE and one FOLLOW_UP_OVERDUE
  // event no matter how many times this page re-renders.
  useEffect(() => {
    localFollowUps.filter((f) => f.status === 'pending' && f.date === today).forEach((f) => {
      emitAutomationEvent({ eventType: AUTOMATION_EVENTS.FOLLOW_UP_DUE, entityType: 'lead', entityId: f.lead_id ?? f.lead, sourceTable: 'follow_ups', sourceId: f.id })
      if (getLeadFor(f)?.status === 'nurture') {
        emitAutomationEvent({ eventType: AUTOMATION_EVENTS.NURTURE_DUE, entityType: 'lead', entityId: f.lead_id ?? f.lead, sourceTable: 'follow_ups', sourceId: f.id })
      }
    })
    localFollowUps.filter((f) => f.status === 'pending' && f.date < today).forEach((f) => {
      emitAutomationEvent({ eventType: AUTOMATION_EVENTS.FOLLOW_UP_OVERDUE, entityType: 'lead', entityId: f.lead_id ?? f.lead, sourceTable: 'follow_ups', sourceId: f.id })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFollowUps])

  const weekDates = getWeekDates()
  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const autoAssignIfUnassigned = (fu) => {
    const lead = getLeadFor(fu)
    if (lead && !lead.assigned_to) takeOverLead(lead.id)
  }

  const handleScheduleSubmit = (e) => {
    e.preventDefault()
    const lead = leads.find((l) => l.name === formData.lead)
    if (!lead) { showToast(`Lead "${formData.lead}" not found`, 'error'); return }
    scheduleFollowUp(lead, { type: formData.type, date: formData.date, time: formData.time, notes: formData.notes, priority: formData.priority, assignedTo: formData.assignedTo || undefined })
    setFormData({ lead: '', type: 'call', date: '', time: '', priority: 'medium', notes: '', assignedTo: '' })
    setLeadQuery('')
    setShowModal(false)
    showToast(`Follow-up scheduled for ${lead.name}`)
  }

  const handleCallNow = (fu) => {
    const lead = getLeadFor(fu)
    if (lead) { window.open(`tel:${lead.phone}`); autoAssignIfUnassigned(fu) }
    showToast(`Calling ${fu.lead}…`)
  }
  const handleWhatsApp = (fu) => {
    const lead = getLeadFor(fu)
    if (lead?.phone) { window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank'); autoAssignIfUnassigned(fu) }
    else showToast('No phone number on file', 'error')
  }

  const handleReschedule = async (fu, date, time) => {
    if (!date) return
    const timeStr = time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : fu.time
    const result = await rescheduleFollowUp(fu, { date, time: timeStr })
    if (result?.error) { showToast(result.error, 'error'); return }
    autoAssignIfUnassigned(fu)
    showToast('Follow-up rescheduled')
  }

  const handleCompleteOutcome = async (outcomeKey, options) => {
    const fu = completingFu
    const lead = getLeadFor(fu)
    const result = await completeFollowUpOutcome(fu, outcomeKey, options)
    if (result?.error) { showToast(result.error, 'error'); return result }
    showToast('Follow-up completed')
    setCompletingFu(null)
    if (result?.openAdmission && lead) {
      navigate('/leads', { state: { openLeadId: lead.id, openAdmission: true } })
    }
    return result
  }

  const handleCancel = async (fu) => {
    const result = await cancelFollowUp(fu)
    setShowCancelConfirm(null)
    if (result?.error) { showToast(result.error, 'error'); return }
    showToast('Follow-up cancelled')
  }
  const handleDelete = async (fu) => {
    await deleteFollowUp(fu.id)
    showToast('Follow-up deleted')
    setShowDeleteConfirm(null)
  }
  const handleAddNote = async (fu, text) => {
    const lead = getLeadFor(fu)
    if (lead) await addLeadNote(lead.id, text)
    setNotingFu(null)
    showToast('Note added')
  }
  const handleChangePriority = async (fu, priority) => {
    await updateFollowUp(fu.id, { priority })
    setPriorityFu(null)
    showToast('Priority updated')
  }
  const handleReassign = async (fu, memberId) => {
    await updateFollowUp(fu.id, { assigned_to: memberId })
    const lead = getLeadFor(fu)
    if (lead) addActivity(lead.id, lead.status, lead.status, `Follow-up reassigned to ${teamMembers.find((m) => m.id === memberId)?.name || 'Unassigned'}`)
    setReassignFu(null)
    showToast('Follow-up reassigned')
  }

  const leadNames = [...new Set([...localFollowUps.map((f) => f.lead), ...leads.map((l) => l.name)])]
  const hasActiveFilters = typeFilter !== 'all' || priorityFilter !== 'all' || assignedFilter !== 'all' || dateFrom || dateTo || outcomeFilter !== 'all' || courseFilter !== 'all'
  const clearFilters = () => { setTypeFilter('all'); setPriorityFilter('all'); setAssignedFilter('all'); setDateFrom(''); setDateTo(''); setOutcomeFilter('all'); setCourseFilter('all') }

  const summaryCards = [
    { key: 'active', label: 'All', value: activeCount, icon: ListFilter, colorClass: 'text-dark-400 bg-dark-500/10' },
    { key: 'today', label: 'Due Today', value: todayCount, icon: Calendar, colorClass: 'text-amber-500 bg-amber-500/10' },
    { key: 'overdue', label: 'Overdue', value: overdueCount, icon: AlertCircle, colorClass: 'text-rose-500 bg-rose-500/10' },
    { key: 'upcoming', label: 'Upcoming', value: upcomingCount, icon: CalendarClock, colorClass: 'text-primary-500 bg-primary-500/10' },
    { key: 'completed', label: 'Completed', value: completedCount, icon: CheckCircle, colorClass: 'text-emerald-500 bg-emerald-500/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Follow-ups</h1>
          <p className={isDark ? 'text-dark-400' : 'text-dark-500'}>What needs to happen next, for every lead</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-200">
            <Plus className="w-4 h-4" />Schedule Follow-up
          </button>
        </div>
      </motion.div>

      {/* Stats Bar + Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`rounded-2xl ${cardClass}`}>
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {summaryCards.map((stat, index) => (
              <motion.button key={stat.key} type="button" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setBucketFilter(stat.key)}
                className={`min-w-0 rounded-xl p-3.5 text-left transition-all border ${bucketFilter === stat.key ? 'ring-2 ring-primary-500 border-primary-500' : isDark ? 'bg-dark-800/60 border-dark-700/40 hover:bg-dark-800' : 'bg-dark-50 border-dark-200/40 hover:bg-white hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl shrink-0 ${stat.colorClass}`}><stat.icon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className={`text-sm leading-tight ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.key === 'overdue' ? 'text-rose-500' : isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className={`border-t p-4 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className={`flex items-center rounded-xl p-1 ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
                <LayoutList className="w-4 h-4" />List View
              </button>
              <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-primary-600 text-white shadow-sm' : isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
                <CalendarDays className="w-4 h-4" />Calendar View
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ListFilter className={`w-4 h-4 ${isDark ? 'text-dark-400' : 'text-dark-500'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Filters:</span>
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`}>
                <option value="all">All Types</option>
                {CREATABLE_FOLLOWUP_TYPES.map((t) => <option key={t} value={t}>{FOLLOWUP_TYPES[t].label}</option>)}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={`px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`}>
                <option value="all">All Priorities</option>
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              {canManageTeam && (
                <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className={`px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`}>
                  <option value="all">All Executives</option>
                  {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>From</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`px-2.5 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>To</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`px-2.5 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`} />
              </div>
              <button type="button" onClick={() => setShowMoreFilters((v) => !v)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                More Filters<ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
              </button>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
                  <X className="w-3.5 h-3.5" />Clear
                </button>
              )}
            </div>
          </div>

          {showMoreFilters && (
            <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-dashed border-dark-700/40">
              <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className={`px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`}>
                <option value="all">All Outcomes</option>
                {Object.entries(OUTCOMES).map(([key, o]) => <option key={key} value={key}>{o.label}</option>)}
              </select>
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={`px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-300' : 'bg-white border-dark-200 text-dark-700'}`}>
                <option value="all">All Courses</option>
                {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          <AnimatePresence>
            {displayList.map((fu) => {
              const fuLead = getLeadFor(fu)
              const assignedName = teamMembers.find((m) => m.id === (fu.assigned_to || fuLead?.assigned_to))?.name
              const isLocked = !!fuLead?.assigned_to && fuLead.assigned_to !== user?.id && !canManageTeam
              const isClosedLead = ['enrolled', 'lost'].includes(fuLead?.status)
              return (
                <FollowUpCard
                  key={fu.id} fu={fu} isDark={isDark} cardClass={cardClass} fuLead={fuLead} assignedName={assignedName}
                  completedByName={teamMembers.find((m) => m.id === (fu.completed_by || fu.cancelled_by))?.name}
                  lastActivityText={getLastActivityText(fu)} isLocked={isLocked || isClosedLead} canManage={canManageTeam} isAdmin={isAdmin}
                  onCall={() => handleCallNow(fu)} onWhatsApp={() => handleWhatsApp(fu)}
                  onComplete={() => setCompletingFu(fu)}
                  onReschedule={(date, time) => handleReschedule(fu, date, time)}
                  onViewLead={() => goToLead(fu)}
                  onViewTimeline={() => goToLead(fu, 'timeline')}
                  onAddNote={() => setNotingFu(fu)}
                  onChangePriority={() => setPriorityFu(fu)}
                  onReassign={() => setReassignFu(fu)}
                  onCancel={() => setShowCancelConfirm(fu)}
                  onDelete={() => setShowDeleteConfirm(fu)}
                />
              )
            })}
          </AnimatePresence>

          {displayList.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-2xl p-12 text-center ${cardClass}`}>
              <Bell className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
              <p className={`text-lg font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                {bucketFilter === 'active' ? "Nothing pending — you're all caught up" : 'No follow-ups match your filters'}
              </p>
              <p className={isDark ? 'text-dark-500' : 'text-dark-400'}>Try adjusting the filters or schedule a new follow-up</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl overflow-hidden ${cardClass}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>This Week</h2>
            <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{weekDates[0].date} to {weekDates[6].date}</p>
          </div>
          <div className="overflow-x-auto">
            <div className={`grid grid-cols-7 divide-x divide-y min-w-[700px] ${isDark ? 'divide-dark-700/60' : 'divide-dark-200/60'}`}>
              {weekDates.map((day) => (
                <div key={day.label} className={`p-3 text-center border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                  <p className={`text-xs font-medium uppercase ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{day.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${day.isToday ? 'text-primary-500' : isDark ? 'text-white' : 'text-dark-900'}`}>{day.dayNum}</p>
                  {day.isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mx-auto mt-1" />}
                </div>
              ))}
              {weekDates.map((day) => {
                // Calendar uses the exact same filtered dataset as the list —
                // one data source, two views (spec 20).
                const dayFollowUps = scopedFollowUps.filter((f) => f.date === day.date && f.status === 'pending')
                return (
                  <div key={`cell-${day.date}`} className={`p-2 min-h-[120px] ${day.isToday ? (isDark ? 'bg-primary-500/5' : 'bg-primary-50/50') : ''}`}>
                    <div className="space-y-1.5">
                      {dayFollowUps.map((fu) => {
                        const typeInfo = followUpTypeInfo(fu.type)
                        const typeColor = colorClasses(typeInfo.color)
                        return (
                          <motion.div key={fu.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setCalendarItem(fu)}
                            className={`px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all hover:scale-105 ${typeColor.bg15} ${typeColor.text}`}
                          >
                            <p className="font-medium truncate">{fu.lead}</p>
                            <p className="opacity-75">{fu.time}</p>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Toast */}
      <div className="fixed top-6 right-6 z-[100]">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, x: 80, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 80, scale: 0.9 }}
              onAnimationComplete={() => setTimeout(() => setNotification(null), 3000)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${notification.type === 'success' ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700' : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-medium">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Complete Follow-up (outcome dialog) */}
      <AnimatePresence>
        {completingFu && (
          <CompleteFollowUpModal fu={completingFu} lead={getLeadFor(completingFu)} isDark={isDark} onClose={() => setCompletingFu(null)} onComplete={handleCompleteOutcome} />
        )}
      </AnimatePresence>

      {/* Add Note */}
      <AnimatePresence>
        {notingFu && <AddNoteModal fu={notingFu} isDark={isDark} onClose={() => setNotingFu(null)} onSubmit={(text) => handleAddNote(notingFu, text)} />}
      </AnimatePresence>

      {/* Change Priority */}
      <AnimatePresence>
        {priorityFu && <PriorityModal fu={priorityFu} isDark={isDark} onClose={() => setPriorityFu(null)} onSubmit={(p) => handleChangePriority(priorityFu, p)} />}
      </AnimatePresence>

      {/* Reassign */}
      <AnimatePresence>
        {reassignFu && <ReassignModal fu={reassignFu} isDark={isDark} teamMembers={teamMembers} onClose={() => setReassignFu(null)} onSubmit={(id) => handleReassign(reassignFu, id)} />}
      </AnimatePresence>

      {/* Cancel Confirm */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCancelConfirm(null)} />
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}><X className="w-6 h-6 text-rose-500" /></div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Cancel Follow-up</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Cancel the follow-up with <strong>{showCancelConfirm.lead}</strong>? It stays on record as cancelled.</p>
                <div className="flex items-center gap-3 w-full">
                  <button onClick={() => setShowCancelConfirm(null)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Keep It</button>
                  <button onClick={() => handleCancel(showCancelConfirm)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 transition-all">Cancel Follow-up</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(null)} />
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
              <div className="flex flex-col items-center text-center">
                <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}><Trash2 className="w-6 h-6 text-rose-500" /></div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Delete Follow-up</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Permanently delete this follow-up with <strong>{showDeleteConfirm.lead}</strong>? This can't be undone.</p>
                <div className="flex items-center gap-3 w-full">
                  <button onClick={() => setShowDeleteConfirm(null)} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                  <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-all">Delete</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar item detail — View / Reschedule / Complete (spec 20) */}
      <AnimatePresence>
        {calendarItem && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-[65] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCalendarItem(null)} />
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{calendarItem.lead}</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{followUpTypeLabel(calendarItem.type)} · {calendarItem.date} · {calendarItem.time}</p>
              {calendarItem.notes && <p className={`text-sm mt-2 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{calendarItem.notes}</p>}
              <div className="flex flex-col gap-2 mt-5">
                <button onClick={() => { goToLead(calendarItem); setCalendarItem(null) }} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>View Lead</button>
                <button onClick={() => { setCompletingFu(calendarItem); setCalendarItem(null) }} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500">Complete Follow-up</button>
                <button onClick={() => { handleReschedule(calendarItem, new Date(Date.now() + 86400000).toISOString().slice(0, 10), null); setCalendarItem(null) }} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Reschedule to Tomorrow</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Follow-up Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()} className={modalShellCls(isDark)}>
              <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Schedule Follow-up</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowModal(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></motion.button>
              </div>
              <form onSubmit={handleScheduleSubmit} className="p-6 space-y-5 overflow-y-auto">
                <div className="relative">
                  <label className={labelCls(isDark)}>Lead</label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                    <input type="text" required value={leadQuery}
                      onFocus={() => setShowLeadPicker(true)}
                      onChange={(e) => { setLeadQuery(e.target.value); setShowLeadPicker(true); if (formData.lead) setFormData((p) => ({ ...p, lead: '' })) }}
                      onBlur={() => setTimeout(() => setShowLeadPicker(false), 150)}
                      placeholder="Search a lead by name…"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                  </div>
                  {showLeadPicker && (
                    <div className={`absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border shadow-xl ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-dark-200'}`}>
                      {leadNames.filter((name) => name.toLowerCase().includes(leadQuery.toLowerCase())).length === 0 ? (
                        <p className={`text-center text-sm py-4 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No leads found</p>
                      ) : leadNames.filter((name) => name.toLowerCase().includes(leadQuery.toLowerCase())).map((name) => (
                        <button key={name} type="button" onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setFormData((p) => ({ ...p, lead: name })); setLeadQuery(name); setShowLeadPicker(false) }}
                          className={`w-full px-3.5 py-2.5 text-left text-sm truncate transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-200' : 'hover:bg-dark-50 text-dark-800'}`}
                        >{name}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelCls(isDark)}>Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CREATABLE_FOLLOWUP_TYPES.map((key) => {
                      const config = FOLLOWUP_TYPES[key]
                      const Icon = config.icon
                      const isActive = formData.type === key
                      const c = colorClasses(config.color)
                      return (
                        <button key={key} type="button" onClick={() => setFormData({ ...formData, type: key })}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${isActive ? `${c.border} ${c.bg10} ${c.text}` : isDark ? 'border-dark-700 text-dark-400 hover:border-dark-600' : 'border-dark-200 text-dark-500 hover:border-dark-300'}`}
                        ><Icon className="w-5 h-5" />{config.label}</button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls(isDark)}>Date</label>
                    <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputCls(isDark)} />
                  </div>
                  <div>
                    <label className={labelCls(isDark)}>Time</label>
                    <input type="time" required value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className={inputCls(isDark)} />
                  </div>
                </div>

                <div>
                  <label className={labelCls(isDark)}>Priority</label>
                  <div className="flex gap-2">
                    {Object.entries(priorityConfig).map(([key, config]) => {
                      const c = colorClasses(config.color)
                      return (
                        <button key={key} type="button" onClick={() => setFormData({ ...formData, priority: key })}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${formData.priority === key ? `${c.border} ${c.bg10} ${c.text}` : isDark ? 'border-dark-700 text-dark-400 hover:border-dark-600' : 'border-dark-200 text-dark-500 hover:border-dark-300'}`}
                        >{config.label}</button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelCls(isDark)}>Assigned Executive</label>
                  <select value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} className={inputCls(isDark)}>
                    <option value="">Same as lead&apos;s assigned executive</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls(isDark)}>Notes</label>
                  <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Add notes about this follow-up…" className={`${inputCls(isDark)} resize-none`} />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-lg hover:shadow-primary-500/25 transition-all">Schedule Follow-up</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
