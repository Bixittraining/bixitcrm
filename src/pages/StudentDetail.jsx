import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Phone, MessageCircle, Mail, Pencil, MoreHorizontal, Check,
  User, Users, Calendar, ClipboardCheck, TrendingUp, AlertTriangle,
  IndianRupee, FileText, StickyNote, History, MapPin, Cake,
  Plus, Trash2, ExternalLink, ArrowRightLeft, Receipt,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { canStudent } from '../lib/permissions'
import { STUDENT_STATUSES, ALL_STUDENT_STATUS_KEYS, studentStatusLabel, getAttendanceThreshold, isProgressBehindExpected } from '../lib/studentStatus'
import { getAvatarGradient } from '../lib/avatarColors'
import { addDurationToDate, nextClassLabel } from '../lib/studentDerived'
import { ALL_MODULE_STATUS_KEYS, moduleStatusLabel, reconcileStatusAndPercent, calcOverallProgress, currentModuleFor, nextModuleAfter } from '../lib/courseProgress'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import SendEmailModal from '../components/SendEmailModal'
import AnchoredMenu from '../components/AnchoredMenu'

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { key: 'progress', label: 'Progress', icon: TrendingUp },
  { key: 'batch', label: 'Batch', icon: Users },
  { key: 'communication', label: 'Communication', icon: MessageCircle },
  { key: 'fees', label: 'Fees', icon: IndianRupee },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'timeline', label: 'Timeline', icon: History },
]

const STATUS_BADGE_CLASSES = {
  emerald: (isDark) => isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
  primary: (isDark) => isDark ? 'bg-primary-500/15 text-primary-400' : 'bg-primary-50 text-primary-600',
  amber: (isDark) => isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',
  rose: (isDark) => isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600',
  indigo: (isDark) => isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
}

const DOCUMENT_CATEGORIES = ['ID Proof', 'Enrollment Form', 'Certificate', 'Payment Receipt', 'Other']

function formatINR(v) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0) }
function formatDate(d) { return d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' }

const cardCls = (isDark) => `rounded-2xl p-5 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`
const labelCls = (isDark) => `text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`
const inputCls = (isDark) => `w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`

// ✓ completed · ◉ in progress · ○ not started · ⏸ on hold
function ModuleStatusDot({ status, isDark }) {
  if (status === 'completed') return <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></span>
  if (status === 'in_progress') return <span className={`shrink-0 w-6 h-6 rounded-full border-2 border-primary-500 flex items-center justify-center`}><span className="w-2.5 h-2.5 rounded-full bg-primary-500" /></span>
  if (status === 'on_hold') return <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-amber-500" /></span>
  return <span className={`shrink-0 w-6 h-6 rounded-full border-2 ${isDark ? 'border-dark-600' : 'border-dark-300'}`} />
}

// ─── SMALL MODALS ───────────────────────────────────────────────────────
function ChangeBatchModal({ student, batches, isDark, onClose, onConfirm }) {
  const [batchId, setBatchId] = useState(student.batch_id || '')
  const [confirming, setConfirming] = useState(false)
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>Change Batch</h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Move {student.name} to a different batch. This updates their profile, the batch roster, and attendance going forward.</p>
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={`${inputCls(isDark)} mb-4`}>
          <option value="">Unassigned</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.course !== student.course ? ` (${b.course})` : ''}</option>)}
        </select>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          <button disabled={confirming} onClick={async () => { setConfirming(true); await onConfirm(batchId ? Number(batchId) : null); setConfirming(false) }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50">
            {confirming ? 'Saving…' : 'Confirm Change'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ChangeStatusModal({ student, isDark, onClose, onConfirm }) {
  const [status, setStatus] = useState(student.status)
  const [reason, setReason] = useState('')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [confirming, setConfirming] = useState(false)
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Change Status</h3>
        <div className="space-y-2 mb-4">
          {ALL_STUDENT_STATUS_KEYS.map((key) => (
            <button key={key} onClick={() => setStatus(key)} className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium border text-left transition-colors ${status === key ? 'border-primary-500 bg-primary-500/10 text-primary-500' : isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}>
              {studentStatusLabel(key)}
            </button>
          ))}
        </div>
        {status === 'on_hold' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className={labelCls(isDark)}>Reason</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Requested break" className={inputCls(isDark)} />
            </div>
            <div>
              <label className={labelCls(isDark)}>Expected Return Date</label>
              <input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className={inputCls(isDark)} />
            </div>
          </div>
        )}
        {(status === 'dropped' || status === 'transferred') && (
          <div className="mb-4">
            <label className={labelCls(isDark)}>Reason (optional)</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls(isDark)} />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          <button disabled={confirming || status === student.status} onClick={async () => { setConfirming(true); await onConfirm(status, { reason, expectedReturnDate: expectedReturn || undefined }); setConfirming(false) }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50">
            {confirming ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function EditStudentModal({ student, packages, isDark, onClose, onSave }) {
  const [form, setForm] = useState({ name: student.name || '', phone: student.phone || '', email: student.email || '', date_of_birth: student.date_of_birth || '', location: student.location || '', course: student.course || '' })
  const [saving, setSaving] = useState(false)
  const courseChanged = form.course !== student.course
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Edit Student Information</h3>
        <div className="space-y-3">
          <div><label className={labelCls(isDark)}>Full Name</label><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls(isDark)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls(isDark)}>Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={inputCls(isDark)} /></div>
            <div><label className={labelCls(isDark)}>Email</label><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls(isDark)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls(isDark)}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))} className={inputCls(isDark)} /></div>
            <div><label className={labelCls(isDark)}>Location</label><input type="text" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="City" className={inputCls(isDark)} /></div>
          </div>
          <div>
            <label className={labelCls(isDark)}>Course</label>
            <select value={form.course} onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))} className={inputCls(isDark)}>
              <option value={student.course}>{student.course}</option>
              {packages.filter((pk) => pk.name !== student.course).map((pk) => <option key={pk.id} value={pk.name}>{pk.name}</option>)}
            </select>
            {courseChanged && <p className={`text-xs mt-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Progress on {student.course} is kept as history — a fresh progress list initializes for {form.course}.</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          <button disabled={saving} onClick={async () => { setSaving(true); await onSave(form); setSaving(false) }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// The trainer/admin workflow for updating one module's progress — status
// and percent stay reconciled (lib/courseProgress) both here (for instant
// visual feedback) and again server-side in updateModuleProgress, so a
// slider drag and a status click can never disagree.
function UpdateModuleProgressModal({ module, progress, isDark, onClose, onSave }) {
  const [status, setStatus] = useState(progress?.status || 'not_started')
  const [percent, setPercent] = useState(progress?.percent ?? 0)
  const [notes, setNotes] = useState(progress?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleStatusChange = (next) => {
    setStatus(next)
    const r = reconcileStatusAndPercent({ status: next }, { status, percent })
    setPercent(r.percent)
  }
  const handlePercentChange = (next) => {
    setPercent(next)
    const r = reconcileStatusAndPercent({ percent: next }, { status, percent })
    setStatus(r.status)
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>{module.name}</h3>
        <p className={`text-xs mb-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Update Module Progress</p>

        <label className={labelCls(isDark)}>Status</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {ALL_MODULE_STATUS_KEYS.map((key) => (
            <button key={key} type="button" onClick={() => handleStatusChange(key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${status === key ? 'border-primary-500 bg-primary-500/10 text-primary-500' : isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}>
              {moduleStatusLabel(key)}
            </button>
          ))}
        </div>

        <label className={labelCls(isDark)}>Progress — {percent}%</label>
        <input type="range" min="0" max="100" value={percent} onChange={(e) => handlePercentChange(Number(e.target.value))} className="w-full mb-1 accent-primary-500" />
        <div className={`h-2 rounded-full overflow-hidden mb-4 ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
          <div className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-600 to-primary-500'}`} style={{ width: `${percent}%` }} />
        </div>

        <label className={labelCls(isDark)}>Trainer Note <span className="opacity-60">(optional)</span></label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Completed hooks and state management." className={`${inputCls(isDark)} resize-none mb-2`} />

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
          <button disabled={saving} onClick={async () => { setSaving(true); await onSave({ status, percent, notes }); setSaving(false) }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50">{saving ? 'Saving…' : 'Save Progress'}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────
export default function StudentDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { profile, isAdmin } = useAuth()
  const {
    students, batches, teamMembers, packages, invoices, installments, attendance, leads,
    studentNotes, addStudentNote, studentActivities, studentDocuments, addStudentDocument, deleteStudentDocument,
    courseModules, studentModuleProgress, initializeStudentProgress, updateModuleProgress, changeStudentCourse,
    changeStudentBatch, changeStudentStatus, updateStudent, deleteStudent, academySettings,
  } = useData()

  const [tab, setTab] = useState('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [showChangeBatch, setShowChangeBatch] = useState(false)
  const [showChangeStatus, setShowChangeStatus] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [moreAnchor, setMoreAnchor] = useState(null)
  const [notification, setNotification] = useState(null)
  const [progressModuleTarget, setProgressModuleTarget] = useState(null)

  const showToast = (message, type = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 3000) }

  const student = students.find((s) => String(s.id) === studentId)

  // Existing students who predate this feature (or whose course only just
  // gained its first modules) get their progress rows created the moment
  // their profile is opened — no "Add Module" click required. Idempotent:
  // initializeStudentProgress only inserts what's actually missing, and
  // this effect stops re-firing the instant any progress row exists.
  useEffect(() => {
    if (!student) return
    const studentPkg = packages.find((p) => p.name.toLowerCase() === student.course?.toLowerCase())
    if (!studentPkg) return
    const hasActiveModules = courseModules.some((m) => m.package_id === studentPkg.id && m.is_active)
    if (!hasActiveModules) return
    const hasAnyProgress = studentModuleProgress.some((p) => p.student_id === student.id)
    if (hasAnyProgress) return
    initializeStudentProgress(student.id, studentPkg.id)
  }, [student, packages, courseModules, studentModuleProgress, initializeStudentProgress])

  if (!student) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/students')} className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}><ArrowLeft className="w-4 h-4" />Back to Students</button>
        <div className={`rounded-2xl p-12 text-center ${cardCls(isDark)}`}>
          <User className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
          <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Student not found.</p>
        </div>
      </div>
    )
  }

  const canEdit = canStudent(profile, 'edit', student, batches)
  const canChangeBatch = canStudent(profile, 'change_batch', student, batches)
  const canChangeStatus = canStudent(profile, 'change_status', student, batches)
  const canManageDocs = canStudent(profile, 'documents', student, batches)
  const canManageFees = canStudent(profile, 'fees', student, batches)
  const canManageProgress = canStudent(profile, 'progress', student, batches)
  const canManageNotes = canStudent(profile, 'notes', student, batches)

  const batch = batches.find((b) => b.id === student.batch_id)
  const trainer = teamMembers.find((m) => m.id === batch?.instructor_id)
  const pkg = packages.find((p) => p.name.toLowerCase() === student.course.toLowerCase())
  const originLead = student.lead_id ? leads.find((l) => l.id === student.lead_id) : null
  const invoice = invoices.find((inv) => inv.student === student.name && inv.course === student.course)
  const studentInstallments = invoice ? installments.filter((i) => i.invoice_id === invoice.id).sort((a, b) => a.seq - b.seq) : []

  const studentAttendance = attendance.filter((a) => a.student_id === student.id).sort((a, b) => b.date.localeCompare(a.date))
  const attendancePct = studentAttendance.length ? Math.round((studentAttendance.filter((a) => a.status === 'present').length / studentAttendance.length) * 100) : null
  const attendanceThreshold = getAttendanceThreshold(academySettings)

  // Modules come from the course's master list (package_id -> pkg.id),
  // never re-typed per student — myProgress is this student's INSTANCE of
  // each, joined by module_id. Editing myProgress never touches
  // courseModules, and vice versa (spec: master vs. instance).
  const orderedModules = pkg ? courseModules.filter((m) => m.package_id === pkg.id && m.is_active).sort((a, b) => a.position - b.position) : []
  const myProgress = studentModuleProgress.filter((p) => p.student_id === student.id)
  const progressByModuleId = new Map(myProgress.map((p) => [p.module_id, p]))
  const moduleProgressRows = orderedModules.map((m) => progressByModuleId.get(m.id)).filter(Boolean)
  const overallProgress = calcOverallProgress(moduleProgressRows)
  const completedCount = moduleProgressRows.filter((p) => p.status === 'completed').length
  const currentModule = currentModuleFor(orderedModules, progressByModuleId)
  const nextModule = nextModuleAfter(orderedModules, currentModule)
  const lastProgressUpdate = moduleProgressRows.reduce((latest, p) => (!latest || p.updated_at > latest ? p.updated_at : latest), null)
  const progressBehind = overallProgress != null && batch?.start_date && batch?.end_date && isProgressBehindExpected(overallProgress, batch.start_date, batch.end_date)
  const courseFullyCompleted = orderedModules.length > 0 && completedCount === orderedModules.length

  const balance = invoice ? invoice.amount - invoice.paid : 0
  const feeOverdue = invoice && balance > 0 && invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10)

  const needsAttention = []
  if (student.status === 'active') {
    if (attendancePct != null && attendancePct < attendanceThreshold) needsAttention.push({ text: `Attendance is below ${attendanceThreshold}%.`, tab: 'attendance', cta: 'View Attendance' })
    if (progressBehind) needsAttention.push({ text: 'Course progress is behind the expected pace.', tab: 'progress', cta: 'View Progress' })
    if (!student.batch_id) needsAttention.push({ text: 'No batch assigned yet.', tab: 'batch', cta: 'Assign Batch' })
    if (feeOverdue) needsAttention.push({ text: 'Payment overdue.', tab: 'fees', cta: 'View Fees' })
  }

  const courseCompletionExpected = addDurationToDate(student.enrollDate, pkg?.duration)
  const nextClass = batch ? nextClassLabel(batch) : null

  const timelineEvents = [
    ...studentActivities.filter((a) => a.student_id === student.id).map((a) => ({ id: `act-${a.id}`, date: a.created_at, title: a.description, by: a.actor_name })),
    ...studentAttendance.slice(0, 15).map((a) => ({ id: `att-${a.id}`, date: a.marked_at || a.date, title: `Attendance marked ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}`, by: a.marked_by_name })),
    ...studentNotes.filter((n) => n.student_id === student.id).map((n) => ({ id: `note-${n.id}`, date: n.created_at, title: `Note added: "${n.text.slice(0, 60)}${n.text.length > 60 ? '…' : ''}"`, by: n.author_name })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const statusMeta = STUDENT_STATUSES[student.status] || STUDENT_STATUSES.active
  const badgeCls = (STATUS_BADGE_CLASSES[statusMeta.color] || STATUS_BADGE_CLASSES.emerald)(isDark)

  const handleCall = () => window.open(`tel:${student.phone}`)
  const handleWhatsApp = () => {
    if (!student.phone) { showToast('No phone number on file', 'error'); return }
    navigate('/conversations', { state: { openPhone: student.phone.replace(/\D/g, ''), leadId: student.lead_id || undefined, leadName: student.name } })
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/students')} className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}><ArrowLeft className="w-4 h-4" />Back to Students</button>

      {/* Header — Student, Course, Batch, Trainer take the visual weight; no fee number in sight. */}
      <div className={cardCls(isDark)}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0`}>{student.avatar}</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{student.name}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeCls}`}><span className={`w-1.5 h-1.5 rounded-full bg-current`} />{studentStatusLabel(student.status)}</span>
              </div>
              <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{student.course}</p>
              <div className={`flex items-center gap-4 mt-1.5 text-xs flex-wrap ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                <span>Batch: <span className={isDark ? 'text-dark-300' : 'text-dark-600'}>{batch?.name || 'Unassigned'}</span></span>
                <span>Trainer: <span className={isDark ? 'text-dark-300' : 'text-dark-600'}>{trainer?.name || '—'}</span></span>
                <span>Joined: <span className={isDark ? 'text-dark-300' : 'text-dark-600'}>{formatDate(student.enrollDate)}</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleCall} title="Call" className={`p-2.5 rounded-xl transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-emerald-400' : 'bg-dark-100 text-dark-600 hover:text-emerald-600'}`}><Phone className="w-4 h-4" /></button>
            <button onClick={handleWhatsApp} title="WhatsApp" className={`p-2.5 rounded-xl transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-emerald-400' : 'bg-dark-100 text-dark-600 hover:text-emerald-600'}`}><MessageCircle className="w-4 h-4" /></button>
            <button onClick={() => setEmailModalOpen(true)} title="Email" className={`p-2.5 rounded-xl transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:text-primary-400' : 'bg-dark-100 text-dark-600 hover:text-primary-600'}`}><Mail className="w-4 h-4" /></button>
            {canEdit && <button onClick={() => setShowEdit(true)} className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}><Pencil className="w-4 h-4" />Edit</button>}
            <button onClick={(e) => setMoreAnchor(e.currentTarget)} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-dark-500 hover:bg-dark-100'}`}><MoreHorizontal className="w-4 h-4" /></button>
            <AnimatePresence>
              {moreAnchor && (
                <AnchoredMenu anchorEl={moreAnchor} onClose={() => setMoreAnchor(null)}>
                  <div className={`w-52 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-dark-900 border-dark-700/80' : 'bg-white border-dark-200'}`}>
                    {canChangeBatch && <button onClick={() => { setShowChangeBatch(true); setMoreAnchor(null) }} className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'}`}><ArrowRightLeft className="w-3.5 h-3.5" />Change Batch</button>}
                    {canChangeStatus && <button onClick={() => { setShowChangeStatus(true); setMoreAnchor(null) }} className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-50'}`}><Check className="w-3.5 h-3.5" />Change Status</button>}
                    {isAdmin && <button onClick={() => { setShowDeleteConfirm(true); setMoreAnchor(null) }} className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${isDark ? 'text-rose-400 hover:bg-dark-800' : 'text-rose-600 hover:bg-dark-50'}`}><Trash2 className="w-3.5 h-3.5" />Delete Student</button>}
                  </div>
                </AnchoredMenu>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex items-center gap-1 overflow-x-auto p-1 rounded-xl ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'}`}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white' : isDark ? 'text-dark-300 hover:text-dark-100' : 'text-dark-600 hover:text-dark-800'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {needsAttention.length > 0 && (
            <div className={`rounded-2xl p-4 border-l-4 border-l-amber-500 ${isDark ? 'bg-amber-500/5' : 'bg-amber-50/60'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}><AlertTriangle className="w-3.5 h-3.5" />Needs Attention</p>
              <div className="space-y-2">
                {needsAttention.map((n, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <p className={`text-sm ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{n.text}</p>
                    <button onClick={() => setTab(n.tab)} className={`text-xs font-semibold shrink-0 ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'}`}>{n.cta} →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Attendance', value: attendancePct != null ? `${attendancePct}%` : '—', warn: attendancePct != null && attendancePct < attendanceThreshold },
              { label: 'Course Progress', value: overallProgress != null ? `${overallProgress}%` : 'Not started', warn: progressBehind },
              { label: 'Current Batch', value: batch?.name || 'Unassigned', warn: !batch },
              { label: 'Next Class', value: nextClass || '—', warn: false },
            ].map((s) => (
              <div key={s.label} className={cardCls(isDark)}>
                <p className={labelCls(isDark)}>{s.label}</p>
                <p className={`text-lg font-bold truncate ${s.warn ? 'text-amber-500' : isDark ? 'text-white' : 'text-dark-900'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={cardCls(isDark)}>
              <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Student Information</h3>
              <div className="space-y-3">
                {[
                  { icon: User, label: 'Full Name', value: student.name },
                  { icon: Phone, label: 'Phone', value: student.phone || '—' },
                  { icon: Mail, label: 'Email', value: student.email || '—' },
                  { icon: Cake, label: 'Date of Birth', value: formatDate(student.date_of_birth) },
                  { icon: MapPin, label: 'Location', value: student.location || '—' },
                  { icon: Calendar, label: 'Enrollment Date', value: formatDate(student.enrollDate) },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <f.icon className={`w-4 h-4 shrink-0 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
                    <span className={`text-xs w-32 shrink-0 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{f.label}</span>
                    <span className={`text-sm truncate ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{f.value}</span>
                  </div>
                ))}
                {originLead && (
                  <button onClick={() => navigate('/leads', { state: { openLeadId: originLead.id } })} className={`text-xs font-medium inline-flex items-center gap-1 mt-1 ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>
                    <ExternalLink className="w-3 h-3" />View original Lead inquiry
                  </button>
                )}
              </div>
            </div>

            <div className={cardCls(isDark)}>
              <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>{student.course}</h3>
              {pkg?.duration && <p className={`text-xs mb-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Duration: {pkg.duration}</p>}
              <div className="space-y-3">
                {[
                  { label: 'Start', value: formatDate(student.enrollDate) },
                  { label: 'Expected Completion', value: courseCompletionExpected ? formatDate(courseCompletionExpected) : '—' },
                  { label: 'Trainer', value: trainer?.name || '—' },
                  { label: 'Batch', value: batch?.name || 'Unassigned' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <span className={`text-xs w-32 shrink-0 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{f.label}</span>
                    <span className={`text-sm ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === 'attendance' && (() => {
        const present = studentAttendance.filter((a) => a.status === 'present').length
        const absent = studentAttendance.filter((a) => a.status === 'absent').length
        const late = studentAttendance.filter((a) => a.status === 'late').length
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={cardCls(isDark)}><p className={labelCls(isDark)}>Attendance</p><p className={`text-2xl font-bold ${attendancePct != null && attendancePct < attendanceThreshold ? 'text-rose-500' : isDark ? 'text-white' : 'text-dark-900'}`}>{attendancePct != null ? `${attendancePct}%` : '—'}</p></div>
              <div className={cardCls(isDark)}><p className={labelCls(isDark)}>Present</p><p className={`text-2xl font-bold text-emerald-500`}>{present}</p></div>
              <div className={cardCls(isDark)}><p className={labelCls(isDark)}>Absent</p><p className={`text-2xl font-bold text-rose-500`}>{absent}</p></div>
              <div className={cardCls(isDark)}><p className={labelCls(isDark)}>Late</p><p className={`text-2xl font-bold text-amber-500`}>{late}</p></div>
            </div>
            {attendancePct != null && attendancePct < attendanceThreshold && (
              <div className={`rounded-xl p-4 flex items-center justify-between gap-3 border-l-4 border-l-rose-500 ${isDark ? 'bg-rose-500/5' : 'bg-rose-50/60'}`}>
                <p className={`text-sm ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>Attendance is below {attendanceThreshold}%.</p>
                <button onClick={() => navigate('/attendance')} className={`text-xs font-semibold shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>View Attendance →</button>
              </div>
            )}
            <div className={cardCls(isDark)}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Recent Records ({studentAttendance.length} total)</h3>
                <button onClick={() => navigate('/attendance')} className={`text-xs font-medium ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>Open Attendance Module →</button>
              </div>
              {studentAttendance.length === 0 ? (
                <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No attendance recorded yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
                  {studentAttendance.map((a) => (
                    <span key={a.id} title={`${formatDate(a.date)} — ${a.status}`} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${a.status === 'present' ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : a.status === 'late' ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600') : (isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>
                      {new Date(`${a.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── PROGRESS ── */}
      {tab === 'progress' && (
        <div className="space-y-5">
          {!pkg ? (
            <div className={cardCls(isDark)}>
              <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                {student.course} doesn't match any course in Packages, so no module list is available to track progress against.
              </p>
            </div>
          ) : orderedModules.length === 0 ? (
            <div className={cardCls(isDark)}>
              <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Course Progress</p>
              <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                No modules have been defined yet for {pkg.name}. {isAdmin ? <button onClick={() => navigate(`/packages/${pkg.id}`)} className="font-semibold text-primary-500 hover:text-primary-600">Add them from the course's Modules section →</button> : 'Ask an admin to add them from Packages → this course → Modules.'}
              </p>
            </div>
          ) : (
            <>
              <div className={cardCls(isDark)}>
                <div className="flex items-center justify-between mb-1">
                  <p className={labelCls(isDark)}>Course Progress</p>
                  {courseFullyCompleted && <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><Check className="w-3 h-3" />Course Completed</span>}
                </div>
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{pkg.name}</p>
                <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{overallProgress != null ? `${overallProgress}%` : '0%'}</p>
                <div className={`h-2.5 rounded-full overflow-hidden my-2 ${isDark ? 'bg-dark-800' : 'bg-dark-100'}`}>
                  <div className={`h-full rounded-full ${courseFullyCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-600 to-primary-500'}`} style={{ width: `${overallProgress || 0}%` }} />
                </div>
                <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{completedCount} of {orderedModules.length} modules completed</p>
                {progressBehind && <p className={`text-xs mt-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Progress is behind the expected pace for this batch.</p>}

                <div className={`grid grid-cols-2 gap-3 mt-4 pt-4 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                  <div>
                    <p className={labelCls(isDark)}>Current Module</p>
                    {currentModule ? (
                      <>
                        <p className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>{currentModule.name}</p>
                        <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{progressByModuleId.get(currentModule.id)?.percent ?? 0}%</p>
                      </>
                    ) : <p className={`text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{courseFullyCompleted ? 'All modules completed' : 'Not started'}</p>}
                  </div>
                  <div>
                    <p className={labelCls(isDark)}>Next</p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>{nextModule?.name || (courseFullyCompleted ? 'Final Project / Course Completion' : '—')}</p>
                  </div>
                </div>
                <p className={`text-xs mt-3 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Last Updated: {lastProgressUpdate ? formatDateTime(lastProgressUpdate) : '—'}</p>
              </div>

              <div className={cardCls(isDark)}>
                <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Modules</h3>
                <div className="space-y-3">
                  {orderedModules.map((m, idx) => {
                    const p = progressByModuleId.get(m.id)
                    const status = p?.status || 'not_started'
                    const percent = p?.percent ?? 0
                    return (
                      <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                        <ModuleStatusDot status={status} isDark={isDark} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-sm font-medium truncate ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{idx + 1}. {m.name}</span>
                            <span className={`text-xs font-semibold shrink-0 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{moduleStatusLabel(status)} · {percent}%</span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                            <div className={`h-full rounded-full ${status === 'completed' ? 'bg-emerald-500' : status === 'on_hold' ? 'bg-amber-500' : 'bg-gradient-to-r from-primary-600 to-primary-500'}`} style={{ width: `${percent}%` }} />
                          </div>
                          {p?.updated_at && <p className={`text-[11px] mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Last updated {formatDateTime(p.updated_at)}</p>}
                        </div>
                        {canManageProgress && (
                          <button onClick={() => setProgressModuleTarget(m)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-dark-700 text-dark-200 hover:bg-dark-600' : 'bg-white text-dark-700 hover:bg-dark-100 border border-dark-200'}`}>Update</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BATCH ── */}
      {tab === 'batch' && (
        <div className={cardCls(isDark)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Batch Information</h3>
            {canChangeBatch && <button onClick={() => setShowChangeBatch(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600"><ArrowRightLeft className="w-3.5 h-3.5" />Change Batch</button>}
          </div>
          {!batch ? (
            <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No batch assigned yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Batch Name', value: batch.name },
                { label: 'Trainer', value: trainer?.name || '—' },
                { label: 'Schedule', value: batch.schedule_days?.length ? `${batch.schedule_days.join(' / ')} · ${batch.start_time || ''}${batch.end_time ? ` – ${batch.end_time}` : ''}` : '—' },
                { label: 'Batch Start', value: formatDate(batch.start_date) },
                { label: 'Batch End', value: formatDate(batch.end_date) },
                { label: 'Batch Status', value: batch.status },
              ].map((f) => (
                <div key={f.label} className={`rounded-xl p-3 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                  <p className={labelCls(isDark)}>{f.label}</p>
                  <p className={`text-sm font-medium capitalize ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{f.value}</p>
                </div>
              ))}
              <button onClick={() => navigate(`/batches/${batch.id}`)} className={`sm:col-span-2 text-xs font-medium text-left ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>Open full Batch page →</button>
            </div>
          )}
        </div>
      )}

      {/* ── COMMUNICATION ── */}
      {tab === 'communication' && (
        <CommunicationTab student={student} isDark={isDark} navigate={navigate} onWhatsApp={handleWhatsApp} />
      )}

      {/* ── FEES ── */}
      {tab === 'fees' && (
        <div className="space-y-5">
          {feeOverdue && (
            <div className={`rounded-xl p-4 flex items-center justify-between gap-3 border-l-4 border-l-rose-500 ${isDark ? 'bg-rose-500/5' : 'bg-rose-50/60'}`}>
              <p className={`text-sm ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>Payment overdue.</p>
              <button onClick={() => navigate('/billing', { state: { openInvoiceForStudent: student.name } })} className={`text-xs font-semibold shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>View Fees →</button>
            </div>
          )}
          {!invoice ? (
            <div className={cardCls(isDark)}><p className={`text-sm text-center py-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No fee bill generated yet for this student.</p></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className={cardCls(isDark)}><p className={labelCls(isDark)}>Course Fee</p><p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(invoice.amount)}</p></div>
                <div className={cardCls(isDark)}><p className={labelCls(isDark)}>Paid</p><p className="text-lg font-bold text-emerald-500">{formatINR(invoice.paid)}</p></div>
                <div className={cardCls(isDark)}><p className={labelCls(isDark)}>Pending</p><p className={`text-lg font-bold ${balance > 0 ? 'text-rose-500' : isDark ? 'text-white' : 'text-dark-900'}`}>{formatINR(balance)}</p></div>
              </div>
              {studentInstallments.length > 0 && (
                <div className={cardCls(isDark)}>
                  <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Payment Plan — {invoice.payment_plan || `${studentInstallments.length} Installments`}</h3>
                  <div className="space-y-2">
                    {studentInstallments.map((inst) => (
                      <div key={inst.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                        <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Installment {inst.seq} — {formatINR(inst.amount)} · due {formatDate(inst.due_date)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${inst.status === 'paid' ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : isDark ? 'bg-dark-700 text-dark-300' : 'bg-dark-100 text-dark-600'}`}>{inst.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {canManageFees && <button onClick={() => navigate('/billing', { state: { openInvoiceForStudent: student.name } })} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500"><IndianRupee className="w-4 h-4" />Record Payment</button>}
                <button onClick={() => navigate('/billing', { state: { openInvoiceForStudent: student.name } })} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}><Receipt className="w-4 h-4" />View Invoice</button>
                {canManageFees && balance > 0 && <button onClick={() => setEmailModalOpen(true)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}><Mail className="w-4 h-4" />Send Reminder</button>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab === 'documents' && (
        <DocumentsTab student={student} isDark={isDark} documents={studentDocuments.filter((d) => d.student_id === student.id)} canManage={canManageDocs} onAdd={addStudentDocument} onDelete={deleteStudentDocument} />
      )}

      {/* ── NOTES ── */}
      {tab === 'notes' && (
        <NotesTab student={student} isDark={isDark} notes={studentNotes.filter((n) => n.student_id === student.id)} canManage={canManageNotes} onAdd={addStudentNote} />
      )}

      {/* ── TIMELINE ── */}
      {tab === 'timeline' && (
        <div className={cardCls(isDark)}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Timeline</h3>
          {timelineEvents.length === 0 ? (
            <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Nothing recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {timelineEvents.map((e) => (
                <div key={e.id} className={`flex gap-3 pb-3 border-b last:border-0 ${isDark ? 'border-dark-800' : 'border-dark-100'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-primary-500`} />
                  <div className="min-w-0">
                    <p className={`text-sm ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{e.title}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{formatDateTime(e.date)}{e.by ? ` · ${e.by}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showEdit && (
          <EditStudentModal
            student={student}
            packages={packages}
            isDark={isDark}
            onClose={() => setShowEdit(false)}
            onSave={async ({ course, ...rest }) => {
              if (course !== student.course) await changeStudentCourse(student, course)
              await updateStudent(student.id, rest)
              setShowEdit(false)
              showToast('Student updated')
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{showChangeBatch && <ChangeBatchModal student={student} batches={batches} isDark={isDark} onClose={() => setShowChangeBatch(false)} onConfirm={async (batchId) => { await changeStudentBatch(student, batchId); setShowChangeBatch(false); showToast('Batch updated') }} />}</AnimatePresence>
      <AnimatePresence>{showChangeStatus && <ChangeStatusModal student={student} isDark={isDark} onClose={() => setShowChangeStatus(false)} onConfirm={async (status, opts) => { await changeStudentStatus(student, status, opts); setShowChangeStatus(false); showToast('Status updated') }} />}</AnimatePresence>
      <AnimatePresence>
        {progressModuleTarget && (
          <UpdateModuleProgressModal
            module={progressModuleTarget}
            progress={progressByModuleId.get(progressModuleTarget.id)}
            isDark={isDark}
            onClose={() => setProgressModuleTarget(null)}
            onSave={async ({ status, percent, notes }) => {
              await updateModuleProgress(student.id, progressModuleTarget.id, { status, percent, notes })
              setProgressModuleTarget(null)
              showToast('Progress updated')
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {emailModalOpen && (
          <SendEmailModal to={student.email} subject={`BIX Academy — ${student.course}`} body={`Hi ${student.name},\n\n`} studentId={student.id} isDark={isDark} onClose={() => setEmailModalOpen(false)} onSent={() => { setEmailModalOpen(false); showToast(`Email sent to ${student.name}`) }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Delete Student</h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Permanently delete <strong>{student.name}</strong>? This can't be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                <button onClick={() => { deleteStudent(student.id); navigate('/students') }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-6 right-6 z-[100]">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }} className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${notification.type === 'success' ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700' : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              <Check className="w-5 h-5" /><span className="text-sm font-medium">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── SUB-TABS ────────────────────────────────────────────────────────────
function CommunicationTab({ student, isDark, navigate, onWhatsApp }) {
  const { emailMessages } = useData()
  const studentEmails = emailMessages.filter((m) => m.student_id === student.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return (
    <div className="space-y-5">
      <div className={cardCls(isDark)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>WhatsApp</h3>
          <button onClick={onWhatsApp} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600"><MessageCircle className="w-3.5 h-3.5" />Open Conversation</button>
        </div>
        <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>WhatsApp threads live in the Conversations module — this opens the real thread for {student.name}, nothing is duplicated here.</p>
      </div>
      <div className={cardCls(isDark)}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Email History</h3>
        {studentEmails.length === 0 ? (
          <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No emails sent yet.</p>
        ) : (
          <div className="space-y-2">
            {studentEmails.map((msg) => (
              <div key={msg.id} className={`rounded-lg p-3 text-sm ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-medium truncate ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>{msg.subject}</p>
                  <span className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${msg.status === 'sent' ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>{msg.status === 'sent' ? 'Sent' : 'Failed'}</span>
                </div>
                <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{msg.sender_name} · {formatDateTime(msg.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Calls aren't logged anywhere in this CRM yet — the Call button just dials; nothing is fabricated here to look like a call history.</p>
      <button onClick={() => navigate('/conversations')} className={`text-xs font-medium ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>Open full Conversations module →</button>
    </div>
  )
}

function DocumentsTab({ student, isDark, documents, canManage, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ category: 'ID Proof', title: '', url: '' })
  return (
    <div className={cardCls(isDark)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Documents</h3>
        {canManage && <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600"><Plus className="w-3.5 h-3.5" />Add Document</button>}
      </div>
      {adding && (
        <div className={`rounded-xl p-4 mb-4 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
            <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className={inputCls(isDark)}>{DOCUMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inputCls(isDark)} />
            <input type="url" placeholder="Link (Drive, Docs, etc.)" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} className={inputCls(isDark)} />
          </div>
          <button onClick={() => { if (!form.title.trim() || !form.url.trim()) return; onAdd(student.id, form.category, form.title.trim(), form.url.trim()); setForm({ category: 'ID Proof', title: '', url: '' }); setAdding(false) }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600">Save</button>
        </div>
      )}
      {documents.length === 0 ? (
        <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No documents added yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
              <div className="min-w-0">
                <a href={d.url} target="_blank" rel="noreferrer" className={`text-sm font-medium truncate hover:underline ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{d.title}</a>
                <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{d.category}</p>
              </div>
              {canManage && <button onClick={() => onDelete(d.id, student.id, d.title)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded shrink-0"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesTab({ student, isDark, notes, canManage, onAdd }) {
  const [text, setText] = useState('')
  return (
    <div className={cardCls(isDark)}>
      <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>Notes</h3>
      {canManage && (
        <div className="flex gap-2 mb-4">
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Student prefers weekend classes." className={`flex-1 resize-none ${inputCls(isDark)}`} />
          <button onClick={() => { if (!text.trim()) return; onAdd(student.id, text.trim()); setText('') }} className="self-end px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600">Add</button>
        </div>
      )}
      {notes.length === 0 ? (
        <p className={`text-sm text-center py-6 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className={`rounded-lg p-3 text-sm ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
              <p className={isDark ? 'text-dark-300' : 'text-dark-600'}>{n.text}</p>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Created by: {n.author_name} · {formatDate(n.created_at?.slice(0, 10))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
