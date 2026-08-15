import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Plus, X, Trash2, Copy, Power, PowerOff, MoreHorizontal, Pencil,
  Clock, AlertCircle, CheckCircle2, XCircle, RotateCcw, ChevronDown, ChevronUp,
  ArrowRight, FileText, Workflow, ListChecks, Info, User,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { can } from '../lib/permissions'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import AnchoredMenu from '../components/AnchoredMenu'

// ─── VOCABULARY — every technical concept (event bus, webhook, queue,
// internal ids, payloads) stays out of this file's JSX. An admin only ever
// sees WHEN / IF / THEN in plain language. ─────────────────────────────

// WHEN — one trigger per workflow, matching every example in the spec.
// Keys are the real AUTOMATION_EVENTS from src/lib/automation.js — this IS
// "the existing CRM event/activity architecture", not a second list.
const TRIGGER_OPTIONS = [
  { key: 'LEAD_CREATED', label: 'New Lead Created' },
  { key: 'LEAD_ASSIGNED', label: 'Lead Assigned' },
  { key: 'LEAD_STATUS_CHANGED', label: 'Lead Status Changed' },
  { key: 'LEAD_CONTACTED', label: 'Lead Contacted' },
  { key: 'LEAD_QUALIFIED', label: 'Lead Qualified' },
  { key: 'COUNSELLING_SCHEDULED', label: 'Counselling Scheduled' },
  { key: 'COUNSELLING_COMPLETED', label: 'Counselling Completed' },
  { key: 'PACKAGE_SHARED', label: 'Package Shared' },
  { key: 'FOLLOW_UP_CREATED', label: 'Follow-up Created' },
  { key: 'FOLLOW_UP_DUE', label: 'Follow-up Due' },
  { key: 'FOLLOW_UP_OVERDUE', label: 'Follow-up Overdue' },
  { key: 'FOLLOW_UP_COMPLETED', label: 'Follow-up Completed' },
  { key: 'FOLLOW_UP_RESCHEDULED', label: 'Follow-up Rescheduled' },
  { key: 'FOLLOW_UP_CANCELLED', label: 'Follow-up Cancelled' },
  { key: 'FOLLOW_UP_OUTCOME_RECORDED', label: 'Follow-up Outcome Recorded' },
  { key: 'NEXT_FOLLOW_UP_CREATED', label: 'Next Follow-up Created' },
  { key: 'LEAD_NEGOTIATION', label: 'Lead in Negotiation' },
  { key: 'LEAD_ENROLLED', label: 'Lead Enrolled' },
  { key: 'LEAD_LOST', label: 'Lead Lost' },
  { key: 'LEAD_REOPENED', label: 'Lead Reopened' },
  { key: 'NURTURE_DUE', label: 'Nurture Due' },
  { key: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { key: 'PAYMENT_PENDING', label: 'Payment Pending' },
]
function triggerLabel(key) { return TRIGGER_OPTIONS.find((t) => t.key === key)?.label || key }

// IF — every field a condition can be written against, and which
// operators make sense for it. "type" only drives the value input and the
// operator list shown; the engine (Edge Function) does the real check.
const CONDITION_FIELDS = [
  { key: 'source', label: 'Lead Source', type: 'text' },
  { key: 'course', label: 'Course', type: 'text' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'priority', label: 'Priority', type: 'text' },
  { key: 'assigned_to', label: 'Assigned Executive', type: 'executive' },
  { key: 'package', label: 'Package', type: 'text' },
  { key: 'lead_value', label: 'Lead Value', type: 'number' },
  { key: 'followup_status', label: 'Follow-up Status', type: 'text' },
  { key: 'payment_status', label: 'Payment Status', type: 'text' },
  { key: 'days_since_created', label: 'Days Since Lead Created', type: 'number' },
  { key: 'days_since_last_activity', label: 'Days Since Last Activity', type: 'number' },
]
function fieldMeta(key) { return CONDITION_FIELDS.find((f) => f.key === key) || CONDITION_FIELDS[0] }

const OPERATOR_LABELS = {
  equals: 'equals', not_equals: 'not equals', contains: 'contains',
  greater_than: 'greater than', less_than: 'less than',
  is_empty: 'is empty', is_not_empty: 'is not empty',
}
const OPERATORS_TEXT = ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty']
const OPERATORS_NUMBER = ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']
function operatorsFor(type) { return type === 'number' ? OPERATORS_NUMBER : OPERATORS_TEXT }

// THEN — the extensible action list (spec section 6). send_whatsapp/
// send_email exist as choices here — matching the requirement that they
// "exist as action types if useful for workflow design" — but never do
// anything (see automationLib.ts's runAction default case).
const ACTION_TYPES = [
  { key: 'assign_lead', label: 'Assign Sales Executive', icon: User },
  { key: 'create_follow_up', label: 'Create Follow-up', icon: Clock },
  { key: 'create_task', label: 'Create Task', icon: ListChecks },
  { key: 'change_lead_status', label: 'Change Lead Status', icon: ArrowRight },
  { key: 'add_note', label: 'Add Note', icon: FileText },
  { key: 'create_internal_notification', label: 'Create Internal Notification', icon: AlertCircle },
  { key: 'send_whatsapp', label: 'Send WhatsApp', icon: Zap },
  { key: 'send_email', label: 'Send Email', icon: Zap },
]
function actionMeta(key) { return ACTION_TYPES.find((a) => a.key === key) || ACTION_TYPES[0] }

const DELAY_OPTIONS = [
  { minutes: 0, label: 'Immediately' },
  { minutes: 60, label: 'After 1 hour' },
  { minutes: 1440, label: 'After 1 day' },
  { minutes: 4320, label: 'After 3 days' },
  { minutes: 10080, label: 'After 7 days' },
]
const STATUS_META = {
  draft: { label: 'Draft', dot: 'bg-dark-400', text: 'text-dark-500', bg: 'bg-dark-100 dark:bg-dark-800' },
  active: { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/15' },
  inactive: { label: 'Inactive', dot: 'bg-rose-400', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/15' },
}

const LEAD_STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'counselling', 'package_shared', 'follow_up', 'negotiation', 'enrolled', 'lost', 'nurture']
const FOLLOWUP_TYPE_OPTIONS = ['call', 'whatsapp', 'email', 'meeting']

function relativeTime(iso) {
  if (!iso) return 'Never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const modalCls = (isDark) => `w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col ${isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'}`
const inputCls = (isDark) => `w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-primary-500/50 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`
const labelCls = (isDark) => `block text-xs font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`
const cardCls = (isDark) => `rounded-xl border p-4 ${isDark ? 'bg-dark-800/60 border-dark-700/60' : 'bg-dark-50 border-dark-200/60'}`

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel, isDark, title = 'Confirm', confirmLabel = 'Delete' }) {
  return (
    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}><Trash2 className="w-6 h-6 text-rose-500" /></div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>{title}</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{message}</p>
          <div className="flex items-center gap-3 w-full">
            <button onClick={onCancel} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors">{confirmLabel}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
    </span>
  )
}

// ── ONE condition row: [ Field ] [ Operator ] [ Value ] ────────────────
function ConditionRow({ condition, onChange, onRemove, isDark, teamMembers }) {
  const meta = fieldMeta(condition.field)
  const needsValue = condition.operator !== 'is_empty' && condition.operator !== 'is_not_empty'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={condition.field} onChange={(e) => onChange({ ...condition, field: e.target.value, operator: 'equals' })} className={`${inputCls(isDark)} flex-1 min-w-[140px]`}>
        {CONDITION_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
      <select value={condition.operator} onChange={(e) => onChange({ ...condition, operator: e.target.value })} className={`${inputCls(isDark)} w-40`}>
        {operatorsFor(meta.type).map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
      </select>
      {needsValue && (
        meta.type === 'executive' ? (
          <select value={condition.value || ''} onChange={(e) => onChange({ ...condition, value: e.target.value })} className={`${inputCls(isDark)} flex-1 min-w-[140px]`}>
            <option value="">Select executive…</option>
            {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        ) : (
          <input
            type={meta.type === 'number' ? 'number' : 'text'}
            value={condition.value ?? ''}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="Value"
            className={`${inputCls(isDark)} flex-1 min-w-[120px]`}
          />
        )
      )}
      <button onClick={onRemove} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-rose-400 hover:bg-dark-800' : 'text-dark-400 hover:text-rose-500 hover:bg-dark-100'}`}><X className="w-4 h-4" /></button>
    </div>
  )
}

// ── ONE action row: [ Action type ] + its inline config + [ delay ] ────
function ActionRow({ action, index, total, onChange, onRemove, onMove, isDark, teamMembers }) {
  const cfg = action.config || {}
  const setCfg = (patch) => onChange({ ...action, config: { ...cfg, ...patch } })

  return (
    <div className={cardCls(isDark)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${isDark ? 'bg-dark-700 text-dark-200' : 'bg-dark-200 text-dark-700'}`}>{index + 1}</span>
          <select value={action.action_type} onChange={(e) => onChange({ ...action, action_type: e.target.value, config: {} })} className={inputCls(isDark)}>
            {ACTION_TYPES.map((a) => <option key={a.key} value={a.key}>{a.label}{a.notConnected ? ' (not connected yet)' : ''}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button disabled={index === 0} onClick={() => onMove(-1)} className={`p-1.5 rounded-lg disabled:opacity-30 ${isDark ? 'text-dark-400 hover:bg-dark-700' : 'text-dark-500 hover:bg-dark-200'}`}><ChevronUp className="w-4 h-4" /></button>
          <button disabled={index === total - 1} onClick={() => onMove(1)} className={`p-1.5 rounded-lg disabled:opacity-30 ${isDark ? 'text-dark-400 hover:bg-dark-700' : 'text-dark-500 hover:bg-dark-200'}`}><ChevronDown className="w-4 h-4" /></button>
          <button onClick={onRemove} className={`p-1.5 rounded-lg ${isDark ? 'text-dark-500 hover:text-rose-400 hover:bg-dark-700' : 'text-dark-400 hover:text-rose-500 hover:bg-dark-200'}`}><X className="w-4 h-4" /></button>
        </div>
      </div>

      {(action.action_type === 'send_whatsapp' || action.action_type === 'send_email') && (
        <p className={`flex items-center gap-1.5 text-xs mb-3 px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
          <Info className="w-3.5 h-3.5 shrink-0" />Sends via the {action.action_type === 'send_whatsapp' ? 'WhatsApp' : 'Email'} provider connected in Settings → Integrations. If it isn't connected, this action is skipped (not failed).
        </p>
      )}

      {(action.action_type === 'assign_lead') && (
        <div className="grid grid-cols-2 gap-2">
          <select value={cfg.mode || 'round_robin'} onChange={(e) => setCfg({ mode: e.target.value })} className={inputCls(isDark)}>
            <option value="round_robin">Round robin (next available)</option>
            <option value="specific">Specific executive</option>
          </select>
          {cfg.mode === 'specific' && (
            <select value={cfg.teamMemberId || ''} onChange={(e) => setCfg({ teamMemberId: e.target.value })} className={inputCls(isDark)}>
              <option value="">Select executive…</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </div>
      )}

      {(action.action_type === 'create_follow_up' || action.action_type === 'create_task') && (
        <div className="grid grid-cols-2 gap-2">
          <select value={cfg.type || 'call'} onChange={(e) => setCfg({ type: e.target.value })} className={inputCls(isDark)}>
            {FOLLOWUP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <input type="number" min="0" value={cfg.delayDays ?? 0} onChange={(e) => setCfg({ delayDays: Number(e.target.value) })} placeholder="Due in (days)" className={inputCls(isDark)} />
          <input type="text" value={cfg.notes || ''} onChange={(e) => setCfg({ notes: e.target.value })} placeholder="Notes (optional)" className={`${inputCls(isDark)} col-span-2`} />
        </div>
      )}

      {action.action_type === 'change_lead_status' && (
        <select value={cfg.status || ''} onChange={(e) => setCfg({ status: e.target.value })} className={inputCls(isDark)}>
          <option value="">Select status…</option>
          {LEAD_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      )}

      {action.action_type === 'add_note' && (
        <textarea value={cfg.text || ''} onChange={(e) => setCfg({ text: e.target.value })} placeholder="Note text" rows={2} className={inputCls(isDark)} />
      )}

      {action.action_type === 'send_email' && (
        <input type="text" value={cfg.subject || ''} onChange={(e) => setCfg({ subject: e.target.value })} placeholder="Subject" className={`${inputCls(isDark)} mb-2`} />
      )}

      {(action.action_type === 'create_internal_notification' || action.action_type === 'send_whatsapp' || action.action_type === 'send_email') && (
        <textarea value={cfg.message || ''} onChange={(e) => setCfg({ message: e.target.value })} placeholder="Message" rows={2} className={inputCls(isDark)} />
      )}

      {action.action_type === 'send_email' && (
        <label className={`mt-2 flex items-center gap-2 text-xs ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
          <input type="checkbox" checked={!!cfg.includeSyllabus} onChange={(e) => setCfg({ includeSyllabus: e.target.checked })} className="rounded" />
          Include the lead's course syllabus (pulled from Packages → Modules)
        </label>
      )}

      <div className="mt-3">
        <label className={labelCls(isDark)}>Run</label>
        <select value={action.delay_minutes || 0} onChange={(e) => onChange({ ...action, delay_minutes: Number(e.target.value) })} className={inputCls(isDark)}>
          {DELAY_OPTIONS.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── WORKFLOW BUILDER — WHEN / IF / THEN, matching spec section 3 exactly ─
function WorkflowBuilderModal({ isDark, workflow, teamMembers, onClose, onSave }) {
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [triggerEvent, setTriggerEvent] = useState(workflow?.trigger_event || TRIGGER_OPTIONS[0].key)
  const [conditions, setConditions] = useState(workflow?.conditions?.map((c) => ({ field: c.field, operator: c.operator, value: c.value })) || [])
  const [actions, setActions] = useState(workflow?.actions?.map((a) => ({ action_type: a.action_type, config: a.config, delay_minutes: a.delay_minutes })) || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addCondition = () => setConditions((prev) => [...prev, { field: 'source', operator: 'equals', value: '' }])
  const addAction = () => setActions((prev) => [...prev, { action_type: 'assign_lead', config: {}, delay_minutes: 0 }])
  const moveAction = (index, dir) => setActions((prev) => {
    const next = [...prev]
    const target = index + dir
    if (target < 0 || target >= next.length) return prev
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })

  const handleSave = async (statusOverride) => {
    if (!name.trim()) { setError('Give this workflow a name.'); return }
    if (actions.length === 0) { setError('Add at least one THEN action.'); return }
    setError('')
    setSaving(true)
    const result = await onSave({ name: name.trim(), description: description.trim(), triggerEvent, status: statusOverride || workflow?.status || 'draft', conditions, actions })
    setSaving(false)
    if (result?.error) setError(result.error)
    else onClose()
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`${modalCls(isDark)} z-10`}>
        <div className={`flex items-center justify-between p-5 border-b shrink-0 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><Workflow className="w-5 h-5 text-primary-500" />{workflow ? 'Edit Workflow' : 'Create Workflow'}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <div>
            <label className={labelCls(isDark)}>Workflow Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Lead Welcome" className={inputCls(isDark)} />
          </div>
          <div>
            <label className={labelCls(isDark)}>Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this workflow do?" className={inputCls(isDark)} />
          </div>

          {/* WHEN */}
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>WHEN</p>
            <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className={inputCls(isDark)}>
              {TRIGGER_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          {/* IF */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-accent-400' : 'text-accent-600'}`}>IF <span className="font-normal normal-case opacity-70">(optional — runs for every lead if empty)</span></p>
            </div>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div key={i}>
                  {i > 0 && <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>AND</p>}
                  <ConditionRow condition={c} teamMembers={teamMembers} isDark={isDark}
                    onChange={(next) => setConditions((prev) => prev.map((c2, i2) => i2 === i ? next : c2))}
                    onRemove={() => setConditions((prev) => prev.filter((_, i2) => i2 !== i))}
                  />
                </div>
              ))}
            </div>
            <button onClick={addCondition} className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
              <Plus className="w-3.5 h-3.5" />Add Condition
            </button>
          </div>

          {/* THEN */}
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>THEN</p>
            <div className="space-y-3">
              {actions.map((a, i) => (
                <ActionRow key={i} action={a} index={i} total={actions.length} teamMembers={teamMembers} isDark={isDark}
                  onChange={(next) => setActions((prev) => prev.map((a2, i2) => i2 === i ? next : a2))}
                  onRemove={() => setActions((prev) => prev.filter((_, i2) => i2 !== i))}
                  onMove={(dir) => moveAction(i, dir)}
                />
              ))}
            </div>
            <button onClick={addAction} className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
              <Plus className="w-3.5 h-3.5" />Add Action
            </button>
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>

        <div className={`flex items-center justify-end gap-3 p-5 border-t shrink-0 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          {workflow ? (
            // Editing: keep whatever Draft/Active/Inactive it already was —
            // that's what the list row's Enable/Disable buttons are for,
            // this save must not silently flip it.
            <button disabled={saving} onClick={() => handleSave(workflow.status)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          ) : (
            <>
              <button disabled={saving} onClick={() => handleSave('draft')} className={`px-4 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-50 ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Save as Draft</button>
              <button disabled={saving} onClick={() => handleSave('active')} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save & Activate'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── WORKFLOW ROW (list) ─────────────────────────────────────────────────
function WorkflowRow({ workflow, isDark, canEdit, onEdit, onDuplicate, onEnable, onDisable, onDelete }) {
  const [menuAnchor, setMenuAnchor] = useState(null)
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-colors ${isDark ? 'bg-dark-900 border-dark-700/60 hover:border-dark-600' : 'bg-white border-dark-200/60 hover:border-dark-300 shadow-sm'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{workflow.name}</h4>
          <StatusPill status={workflow.status} isDark={isDark} />
        </div>
        <p className={`text-xs mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
          Trigger: <span className="font-medium">{triggerLabel(workflow.trigger_event)}</span>
          {workflow.conditions?.length > 0 && <span> · {workflow.conditions.length} condition{workflow.conditions.length === 1 ? '' : 's'}</span>}
          <span> · {workflow.actions?.length || 0} action{workflow.actions?.length === 1 ? '' : 's'}</span>
        </p>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
          Last run: {relativeTime(workflow.last_run_at)} · Created by {workflow.created_by_name || '—'}
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onEdit} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
            <Pencil className="w-3.5 h-3.5" />Edit
          </button>
          {workflow.status === 'active' ? (
            <button onClick={onDisable} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-dark-700 text-amber-400 hover:bg-dark-800' : 'border-dark-200 text-amber-600 hover:bg-amber-50'}`}>
              <PowerOff className="w-3.5 h-3.5" />Disable
            </button>
          ) : (
            <button onClick={onEnable} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-dark-700 text-emerald-400 hover:bg-dark-800' : 'border-dark-200 text-emerald-600 hover:bg-emerald-50'}`}>
              <Power className="w-3.5 h-3.5" />Enable
            </button>
          )}
          <button onClick={(e) => setMenuAnchor(e.currentTarget)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-dark-500 hover:bg-dark-100'}`}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {menuAnchor && (
              <AnchoredMenu anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)}>
                <div className={`w-48 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80' : 'bg-white border-dark-200'}`}>
                  <button onClick={() => { onDuplicate(); setMenuAnchor(null) }} className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'}`}>
                    <Copy className="w-3.5 h-3.5" />Duplicate
                  </button>
                  <button onClick={() => { onDelete(); setMenuAnchor(null) }} className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDark ? 'text-rose-400 hover:bg-dark-800' : 'text-rose-600 hover:bg-dark-50'}`}>
                    <Trash2 className="w-3.5 h-3.5" />Delete
                  </button>
                </div>
              </AnchoredMenu>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ── LOGS ─────────────────────────────────────────────────────────────────
const EXEC_STATUS_META = {
  running: { label: 'Running', icon: Clock, cls: 'text-sky-600 dark:text-sky-400' },
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
  partially_failed: { label: 'Partially Failed', icon: AlertCircle, cls: 'text-amber-600 dark:text-amber-400' },
  failed: { label: 'Failed', icon: XCircle, cls: 'text-rose-600 dark:text-rose-400' },
}
const ACTION_STATUS_ICON = { success: '✓', failed: '✗', skipped: '•', scheduled: '⏳', running: '…', pending: '…' }

function ExecutionRow({ execution, isDark, leadName, canRetry, onRetry }) {
  const [open, setOpen] = useState(false)
  const meta = EXEC_STATUS_META[execution.status] || EXEC_STATUS_META.running
  const Icon = meta.icon
  return (
    <div className={`rounded-xl border ${isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60 shadow-sm'}`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-4 text-left">
        <Icon className={`w-4 h-4 shrink-0 ${meta.cls}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{execution.workflow_name}</p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            {leadName || `Lead #${execution.lead_id}`} · {triggerLabel(execution.trigger_event)} · {relativeTime(execution.started_at)}
          </p>
        </div>
        <span className={`text-xs font-semibold shrink-0 ${meta.cls}`}>{meta.label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isDark ? 'text-dark-500' : 'text-dark-400'} ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className={`px-4 pb-4 space-y-2 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-100'}`}>
              {execution.actions.map((a) => (
                <div key={a.id} className="flex items-center gap-2 pt-2 text-xs">
                  <span className={`w-4 shrink-0 text-center font-bold ${a.status === 'success' ? 'text-emerald-500' : a.status === 'failed' ? 'text-rose-500' : isDark ? 'text-dark-500' : 'text-dark-400'}`}>{ACTION_STATUS_ICON[a.status] || '•'}</span>
                  <span className={isDark ? 'text-dark-300' : 'text-dark-600'}>{actionMeta(a.action_type).label}{a.status === 'scheduled' ? ` — scheduled for ${new Date(a.run_at).toLocaleString('en-IN')}` : ''}</span>
                  {a.status === 'failed' && (
                    <>
                      <span className="text-rose-500 truncate flex-1">— {a.error || 'Failed'}</span>
                      {canRetry && (
                        <button onClick={() => onRetry(a.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-medium shrink-0 ${isDark ? 'bg-dark-800 text-primary-400 hover:bg-dark-700' : 'bg-dark-100 text-primary-600 hover:bg-dark-200'}`}>
                          <RotateCcw className="w-3 h-3" />Retry
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────
export default function Automation() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { profile } = useAuth()
  const {
    leads, teamMembers,
    automationWorkflows, createWorkflow, updateWorkflow, setWorkflowStatus, duplicateWorkflow, deleteWorkflow,
    automationExecutions, fetchAutomationLogs, retryAutomationAction,
  } = useData()

  const canView = can(profile, 'automation', 'view')
  const canEdit = can(profile, 'automation', 'edit') || can(profile, 'automation', 'create')
  const canDelete = can(profile, 'automation', 'delete')
  const canViewLogs = can(profile, 'automation', 'view_logs')
  const canRetry = can(profile, 'automation', 'retry')

  const [tab, setTab] = useState('workflows')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    if (tab === 'logs' && canViewLogs) {
      setLogsLoading(true)
      fetchAutomationLogs().finally(() => setLogsLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Zap className={`w-10 h-10 mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
        <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>You don't have access to Automation.</p>
      </div>
    )
  }

  const realWorkflows = automationWorkflows.filter((w) => !w.is_template)
  const templates = automationWorkflows.filter((w) => w.is_template)

  const handleSaveWorkflow = async (payload) => {
    if (editingWorkflow) return updateWorkflow(editingWorkflow.id, payload)
    return createWorkflow(payload)
  }
  const handleUseTemplate = async (template) => {
    const result = await duplicateWorkflow(template.id)
    if (!result?.error) setTab('workflows')
  }

  const tabs = [
    { key: 'workflows', label: 'Workflows', icon: Workflow },
    { key: 'templates', label: 'Templates', icon: FileText },
    ...(canViewLogs ? [{ key: 'logs', label: 'Logs', icon: ListChecks }] : []),
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className={`text-2xl lg:text-3xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}><Zap className="w-7 h-7 text-primary-500" />Automation</h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>WHEN something happens, IF it matches, THEN do this — automatically.</p>
        </div>
        {canEdit && tab === 'workflows' && (
          <button onClick={() => { setEditingWorkflow(null); setShowBuilder(true) }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/25 transition-all">
            <Plus className="w-4 h-4" />Create Workflow
          </button>
        )}
      </div>

      <div className={`inline-flex items-center p-1 rounded-xl border ${isDark ? 'border-dark-700 bg-dark-900' : 'border-dark-200 bg-white'}`}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white' : isDark ? 'text-dark-300 hover:text-dark-100' : 'text-dark-600 hover:text-dark-800'}`}
          >
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'workflows' && (
        <div className="space-y-3">
          {realWorkflows.length === 0 ? (
            <div className={`rounded-xl border border-dashed p-10 text-center ${isDark ? 'border-dark-700 text-dark-500' : 'border-dark-300 text-dark-400'}`}>
              <Workflow className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No workflows yet. Create one, or start from a template.</p>
            </div>
          ) : realWorkflows.map((w) => (
            <WorkflowRow key={w.id} workflow={w} isDark={isDark} canEdit={canEdit}
              onEdit={() => { setEditingWorkflow(w); setShowBuilder(true) }}
              onDuplicate={() => duplicateWorkflow(w.id)}
              onEnable={() => setWorkflowStatus(w.id, 'active')}
              onDisable={() => setWorkflowStatus(w.id, 'inactive')}
              onDelete={() => canDelete && setConfirmDelete(w)}
            />
          ))}
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className={`rounded-xl border p-4 ${isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60 shadow-sm'}`}>
              <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{t.name}</h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{t.description}</p>
              <p className={`text-xs mt-2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Trigger: {triggerLabel(t.trigger_event)} · {t.actions?.length || 0} action{t.actions?.length === 1 ? '' : 's'}</p>
              {canEdit && (
                <button onClick={() => handleUseTemplate(t)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500">
                  <Plus className="w-3.5 h-3.5" />Use This Template
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'logs' && canViewLogs && (
        <div className="space-y-3">
          {logsLoading ? (
            <p className={`text-sm text-center py-10 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Loading…</p>
          ) : automationExecutions.length === 0 ? (
            <div className={`rounded-xl border border-dashed p-10 text-center ${isDark ? 'border-dark-700 text-dark-500' : 'border-dark-300 text-dark-400'}`}>
              <ListChecks className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No automation runs yet.</p>
            </div>
          ) : automationExecutions.map((e) => (
            <ExecutionRow key={e.id} execution={e} isDark={isDark} canRetry={canRetry}
              leadName={leads.find((l) => l.id === e.lead_id)?.name}
              onRetry={(executionActionId) => retryAutomationAction(executionActionId)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showBuilder && (
          <WorkflowBuilderModal isDark={isDark} workflow={editingWorkflow} teamMembers={teamMembers}
            onClose={() => setShowBuilder(false)} onSave={handleSaveWorkflow}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog isDark={isDark} title="Delete Workflow"
            message={`Delete "${confirmDelete.name}"? This can't be undone — past logs for it will still show its name.`}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={async () => { await deleteWorkflow(confirmDelete.id); setConfirmDelete(null) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
