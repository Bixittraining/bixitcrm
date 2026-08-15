import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Download, LayoutGrid, List, Eye, Phone,
  Users, UserCheck, GraduationCap, AlertTriangle, X, Calendar,
  ChevronUp, ChevronDown, ArrowUpDown, MessageCircle, SlidersHorizontal,
  CheckCircle2, AlertCircle, ClipboardCheck, TrendingUp, IndianRupee,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import { getAvatarGradient } from '../lib/avatarColors'
import { STUDENT_STATUSES, ALL_STUDENT_STATUS_KEYS, studentStatusLabel, getAttendanceThreshold } from '../lib/studentStatus'
import { canStudent } from '../lib/permissions'
import { computeAttendancePct, computeOverallProgress, computeNeedsAttention, nextClassLabel } from '../lib/studentDerived'

const STATUS_BADGE_CLASSES = {
  emerald: (isDark) => isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
  primary: (isDark) => isDark ? 'bg-primary-500/15 text-primary-400' : 'bg-primary-50 text-primary-600',
  amber: (isDark) => isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',
  rose: (isDark) => isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600',
  indigo: (isDark) => isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

function Students() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { profile } = useAuth()
  const {
    students, addStudent, batches, teamMembers, packages, attendance,
    studentProgressModules, academySettings, checkDuplicateStudent, invoices,
  } = useData()
  const location = useLocation()
  const navigate = useNavigate()

  const canExportFees = canStudent(profile, 'export_fees', null, batches)
  const canAdd = canStudent(profile, 'edit', null, batches)

  const [searchQuery, setSearchQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('All')
  const [batchFilter, setBatchFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [trainerFilter, setTrainerFilter] = useState('All')
  const [attendanceFilter, setAttendanceFilter] = useState('All') // All | below_threshold | no_data
  const [progressFilter, setProgressFilter] = useState('All') // All | behind | on_track | no_data
  const [joinedFrom, setJoinedFrom] = useState('')
  const [joinedTo, setJoinedTo] = useState('')
  const [viewMode, setViewMode] = useState('grid')

  // Deep-link support (e.g. a batch/lead page sending the user here with an
  // intended course filter). Opening a specific student's profile is now a
  // real route (/students/:id) rather than a modal state flag.
  useEffect(() => {
    if (location.state?.filterCourse) {
      setCourseFilter(location.state.filterCourse)
      navigate(location.pathname, { replace: true, state: {} })
    } else if (location.state?.resetView) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [notification, setNotification] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', course: '', batch: '', dob: '', location: '', feeTotal: '', notes: '' })
  const [duplicateMatch, setDuplicateMatch] = useState(null)
  const [addSubmitting, setAddSubmitting] = useState(false)

  const showToast = (message, type = 'success') => setNotification({ message, type })

  const attendanceThreshold = getAttendanceThreshold(academySettings)

  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches])
  const trainerById = useMemo(() => new Map(teamMembers.map((m) => [m.id, m])), [teamMembers])

  const derived = useMemo(() => {
    const map = new Map()
    for (const s of students) {
      const batch = batchById.get(s.batch_id)
      const trainer = batch ? trainerById.get(batch.instructor_id) : null
      const attendancePct = computeAttendancePct(s.id, attendance)
      const progressPct = computeOverallProgress(s.id, studentProgressModules)
      const needsAttention = computeNeedsAttention(s, { batch, attendance, studentProgressModules, invoices, academySettings })
      map.set(s.id, { batch, trainer, attendancePct, progressPct, needsAttention, nextClass: batch ? nextClassLabel(batch) : null })
    }
    return map
  }, [students, batchById, trainerById, attendance, studentProgressModules, invoices, academySettings])

  // Course options come from real Package data (the actual source of
  // truth for what courses the academy offers), plus any legacy course
  // strings already on students that don't match a current package name
  // (renamed/retired packages) so those students remain filterable.
  const courseOptions = useMemo(() => {
    const fromPackages = packages.map((p) => p.name)
    const fromStudents = students.map((s) => s.course).filter(Boolean)
    return ['All', ...new Set([...fromPackages, ...fromStudents])]
  }, [packages, students])

  const batchOptions = useMemo(() => ['All', 'Unassigned', ...batches.map((b) => b.name)], [batches])
  const trainerOptions = useMemo(() => ['All', ...new Set(teamMembers.filter((m) => batches.some((b) => b.instructor_id === m.id)).map((m) => m.name))], [teamMembers, batches])

  const handleAddStudent = async (e) => {
    e.preventDefault()
    if (!duplicateMatch) {
      const match = checkDuplicateStudent({ phone: addForm.phone, email: addForm.email })
      if (match) { setDuplicateMatch(match); return }
    }
    setAddSubmitting(true)
    const nameParts = addForm.name.trim().split(' ')
    const avatar = nameParts.length >= 2 ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : addForm.name.trim().slice(0, 2).toUpperCase()
    const batch = batches.find((b) => String(b.id) === addForm.batch)
    const { error } = await addStudent({
      name: addForm.name, email: addForm.email, phone: addForm.phone,
      course: addForm.course, batch_id: batch?.id || null, batch: batch?.name || 'Unassigned',
      enroll_date: new Date().toISOString().slice(0, 10), status: 'active',
      fee_paid: 0, fee_total: Number(addForm.feeTotal) || 0, avatar,
      date_of_birth: addForm.dob || null, location: addForm.location || null,
    })
    setAddSubmitting(false)
    if (error) { showToast(error, 'error'); return }
    setShowAddModal(false)
    setDuplicateMatch(null)
    setAddForm({ name: '', email: '', phone: '', course: '', batch: '', dob: '', location: '', feeTotal: '', notes: '' })
    showToast(`${addForm.name} added as a student`)
  }

  const handleWhatsApp = (student) => {
    if (!student.phone) { showToast('No phone number on file', 'error'); return }
    navigate('/conversations', { state: { openPhone: student.phone.replace(/\D/g, ''), leadId: student.lead_id || undefined, leadName: student.name } })
  }
  const handleCallStudent = (student) => window.open(`tel:${student.phone}`)

  const activeMoreFilterCount = [trainerFilter !== 'All', attendanceFilter !== 'All', progressFilter !== 'All', !!joinedFrom, !!joinedTo].filter(Boolean).length

  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      const q = searchQuery.toLowerCase()
      return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.course.toLowerCase().includes(q) || (s.batch || '').toLowerCase().includes(q)
    })
    if (courseFilter !== 'All') result = result.filter((s) => s.course === courseFilter)
    if (batchFilter === 'Unassigned') result = result.filter((s) => !s.batch_id)
    else if (batchFilter !== 'All') result = result.filter((s) => s.batch === batchFilter)
    if (statusFilter !== 'All') result = result.filter((s) => s.status === statusFilter)

    if (trainerFilter !== 'All') result = result.filter((s) => derived.get(s.id)?.trainer?.name === trainerFilter)
    if (attendanceFilter === 'below_threshold') result = result.filter((s) => { const pct = derived.get(s.id)?.attendancePct; return pct != null && pct < attendanceThreshold })
    else if (attendanceFilter === 'no_data') result = result.filter((s) => derived.get(s.id)?.attendancePct == null)
    if (progressFilter === 'behind') result = result.filter((s) => derived.get(s.id)?.needsAttention.includes('progress'))
    else if (progressFilter === 'no_data') result = result.filter((s) => derived.get(s.id)?.progressPct == null)
    else if (progressFilter === 'on_track') result = result.filter((s) => { const d = derived.get(s.id); return d?.progressPct != null && !d.needsAttention.includes('progress') })
    if (joinedFrom) result = result.filter((s) => s.enrollDate && s.enrollDate >= joinedFrom)
    if (joinedTo) result = result.filter((s) => s.enrollDate && s.enrollDate <= joinedTo)

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal, bVal
        if (sortConfig.key === 'attendancePct' || sortConfig.key === 'progressPct') {
          aVal = derived.get(a.id)?.[sortConfig.key] ?? -1
          bVal = derived.get(b.id)?.[sortConfig.key] ?? -1
        } else if (sortConfig.key === 'trainer') {
          aVal = (derived.get(a.id)?.trainer?.name || '').toLowerCase()
          bVal = (derived.get(b.id)?.trainer?.name || '').toLowerCase()
        } else {
          aVal = a[sortConfig.key]; bVal = b[sortConfig.key]
          if (typeof aVal === 'string') aVal = aVal.toLowerCase()
          if (typeof bVal === 'string') bVal = bVal.toLowerCase()
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [students, searchQuery, courseFilter, batchFilter, statusFilter, trainerFilter, attendanceFilter, progressFilter, joinedFrom, joinedTo, sortConfig, derived, attendanceThreshold])

  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter((s) => s.status === 'active').length
    const completed = students.filter((s) => s.status === 'completed').length
    const needsAttention = students.filter((s) => (derived.get(s.id)?.needsAttention.length || 0) > 0).length
    return { total, active, completed, needsAttention }
  }, [students, derived])

  const handleSort = (key) => {
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))
  }

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={14} className="opacity-40" />
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary-500" /> : <ChevronDown size={14} className="text-primary-500" />
  }

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'

  const statCards = [
    { label: 'Total Students', value: stats.total, icon: Users, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
    { label: 'Active Students', value: stats.active, icon: UserCheck, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
    { label: 'Completed', value: stats.completed, icon: GraduationCap, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
    { label: 'Needs Attention', value: stats.needsAttention, icon: AlertTriangle, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
  ]

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = ['Student', 'Phone', 'Email', 'Course', 'Batch', 'Trainer', 'Status', 'Enrollment Date', 'Attendance %', 'Progress %']
    if (canExportFees) headers.push('Fee Paid', 'Fee Total', 'Remaining Balance')
    const rows = filteredStudents.map((s) => {
      const d = derived.get(s.id)
      const row = [
        esc(s.name), `"=""${s.phone || ''}"""`, esc(s.email), esc(s.course), esc(s.batch || 'Unassigned'),
        esc(d?.trainer?.name || '—'), esc(studentStatusLabel(s.status)), esc(s.enrollDate || '—'),
        d?.attendancePct != null ? d.attendancePct : '—', d?.progressPct != null ? d.progressPct : '—',
      ]
      if (canExportFees) row.push(s.feePaid || 0, s.feeTotal || 0, Math.max((s.feeTotal || 0) - (s.feePaid || 0), 0))
      return row.join(',')
    })
    const csv = headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'students-export.csv'; a.click(); URL.revokeObjectURL(url)
    showToast('Students exported successfully')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Students</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Central profile for every enrolled student — course, batch, attendance, progress, and communication.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
            <Download size={16} className="inline mr-2 -mt-0.5" />Export
          </button>
          {canAdd && (
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all">
              <Plus size={16} className="inline mr-2 -mt-0.5" />Add Student
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants} className={`rounded-2xl p-5 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon size={22} className={stat.color} /></div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search & Primary Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
          <input type="text" placeholder="Search by name, email, course, or batch..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${isDark ? 'bg-dark-900 border-dark-700/60 text-white placeholder:text-dark-500' : 'bg-white border-dark-200/60 text-dark-900 placeholder:text-dark-400'}`} />
        </div>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
          className={`px-3 py-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`}>
          {courseOptions.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Courses' : c}</option>)}
        </select>
        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
          className={`px-3 py-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`}>
          {batchOptions.map((b) => <option key={b} value={b}>{b === 'All' ? 'All Batches' : b}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-3 py-3 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${isDark ? 'bg-dark-900 border-dark-700/60 text-dark-200' : 'bg-white border-dark-200/60 text-dark-700'}`}>
          <option value="All">All Statuses</option>
          {ALL_STUDENT_STATUS_KEYS.map((k) => <option key={k} value={k}>{studentStatusLabel(k)}</option>)}
        </select>
        <button type="button" onClick={() => setShowMoreFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-sm font-medium border transition-colors ${showMoreFilters || activeMoreFilterCount > 0 ? 'border-primary-500 text-primary-500 bg-primary-500/5' : isDark ? 'border-dark-700/60 text-dark-300 hover:bg-dark-800' : 'border-dark-200/60 text-dark-600 hover:bg-dark-50'}`}>
          <SlidersHorizontal size={15} />More Filters{activeMoreFilterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[11px] bg-primary-500 text-white">{activeMoreFilterCount}</span>}
        </button>
        {(courseFilter !== 'All' || batchFilter !== 'All' || statusFilter !== 'All' || searchQuery || activeMoreFilterCount > 0) && (
          <button type="button" onClick={() => { setCourseFilter('All'); setBatchFilter('All'); setStatusFilter('All'); setSearchQuery(''); setTrainerFilter('All'); setAttendanceFilter('All'); setProgressFilter('All'); setJoinedFrom(''); setJoinedTo('') }}
            className={`inline-flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
            <X size={14} />Clear
          </button>
        )}
      </motion.div>

      {/* More Filters panel */}
      <AnimatePresence>
        {showMoreFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-hidden ${cardClass}`}>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Trainer</label>
              <select value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-700'}`}>
                {trainerOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'Any Trainer' : t}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Attendance</label>
              <select value={attendanceFilter} onChange={(e) => setAttendanceFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-700'}`}>
                <option value="All">Any Attendance</option>
                <option value="below_threshold">Below {attendanceThreshold}%</option>
                <option value="no_data">No attendance recorded</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Progress</label>
              <select value={progressFilter} onChange={(e) => setProgressFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-700'}`}>
                <option value="All">Any Progress</option>
                <option value="behind">Behind expected pace</option>
                <option value="on_track">On track</option>
                <option value="no_data">No progress data</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Joined From</label>
              <input type="date" value={joinedFrom} onChange={(e) => setJoinedFrom(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-700'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Joined To</label>
              <input type="date" value={joinedTo} onChange={(e) => setJoinedTo(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-700'}`} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Toggle */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-between">
        <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Showing {filteredStudents.length} of {students.length} students</p>
        <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-primary-600 text-white' : isDark ? 'bg-dark-900 text-dark-400 hover:text-dark-200' : 'bg-white text-dark-500 hover:text-dark-700'}`}>
            <LayoutGrid size={16} />Grid
          </button>
          <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-primary-600 text-white' : isDark ? 'bg-dark-900 text-dark-400 hover:text-dark-200' : 'bg-white text-dark-500 hover:text-dark-700'}`}>
            <List size={16} />Table
          </button>
        </div>
      </motion.div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStudents.map((student) => {
            const d = derived.get(student.id) || {}
            const statusMeta = STUDENT_STATUSES[student.status] || STUDENT_STATUSES.active
            const badgeCls = (STATUS_BADGE_CLASSES[statusMeta.color] || STATUS_BADGE_CLASSES.emerald)(isDark)
            const balance = (student.feeTotal || 0) - (student.feePaid || 0)
            return (
              <motion.div key={student.id} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}
                onClick={() => navigate(`/students/${student.id}`)}
                className={`rounded-2xl p-6 ${cardClass} hover:shadow-lg transition-shadow cursor-pointer`}>
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                    {student.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{student.name}</h3>
                    <p className={`text-xs truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{student.course}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeCls}`}>{studentStatusLabel(student.status)}</span>
                    {d.needsAttention?.length > 0 && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                        <AlertTriangle size={11} />Needs attention
                      </span>
                    )}
                  </div>
                </div>

                {/* Batch / Trainer */}
                <div className={`flex items-center justify-between text-xs mb-3 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  <span className="truncate">{student.batch || 'Unassigned'}</span>
                  <span className="truncate">{d.trainer?.name || 'No trainer'}</span>
                </div>

                {/* Attendance / Progress */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}><ClipboardCheck size={12} />Attendance</div>
                    <p className={`text-sm font-bold ${d.attendancePct == null ? (isDark ? 'text-dark-500' : 'text-dark-400') : d.attendancePct < attendanceThreshold ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {d.attendancePct != null ? `${d.attendancePct}%` : '—'}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium mb-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}><TrendingUp size={12} />Progress</div>
                    <p className={`text-sm font-bold ${d.progressPct == null ? (isDark ? 'text-dark-500' : 'text-dark-400') : d.needsAttention?.includes('progress') ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {d.progressPct != null ? `${d.progressPct}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Next class */}
                <div className={`flex items-center gap-1.5 text-xs mb-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                  <Calendar size={12} />
                  {d.nextClass ? `Next class: ${d.nextClass}` : 'No upcoming class scheduled'}
                </div>

                {/* Fee — small secondary indicator only, and only when there's an outstanding balance */}
                {balance > 0 && (
                  <div className={`flex items-center gap-1.5 text-[11px] mb-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                    <IndianRupee size={11} />Balance due: {balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                  </div>
                )}

                {/* Actions */}
                <div className={`flex items-center gap-2 pt-4 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => navigate(`/students/${student.id}`)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white' : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'}`}>
                    <Eye size={14} />View Profile
                  </button>
                  <button onClick={() => handleWhatsApp(student)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white' : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'}`}>
                    <MessageCircle size={14} />WhatsApp
                  </button>
                  <button onClick={() => handleCallStudent(student)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white' : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'}`}>
                    <Phone size={14} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={`rounded-2xl overflow-hidden ${cardClass}`}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[1250px]">
              <colgroup>
                <col className="w-[220px]" /><col className="w-[160px]" /><col className="w-[150px]" /><col className="w-[140px]" />
                <col className="w-[110px]" /><col className="w-[110px]" /><col className="w-[110px]" /><col className="w-[110px]" /><col className="w-[150px]" />
              </colgroup>
              <thead>
                <tr className={isDark ? 'bg-dark-800/60' : 'bg-dark-50'}>
                  {[
                    { key: 'name', label: 'Student' },
                    { key: 'course', label: 'Course' },
                    { key: 'batch', label: 'Batch' },
                    { key: 'trainer', label: 'Trainer' },
                    { key: 'status', label: 'Status' },
                    { key: 'attendancePct', label: 'Attendance' },
                    { key: 'progressPct', label: 'Progress' },
                    { key: 'enrollDate', label: 'Joined' },
                    { key: null, label: 'Actions' },
                  ].map((col) => (
                    <th key={col.label} onClick={() => col.key && handleSort(col.key)}
                      className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'} ${col.key ? 'cursor-pointer hover:text-primary-500 select-none' : ''}`}>
                      <div className="flex items-center gap-1.5">{col.label}{col.key && <SortIcon column={col.key} />}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-700/40' : 'divide-dark-200/60'}`}>
                {filteredStudents.map((student, index) => {
                  const d = derived.get(student.id) || {}
                  const statusMeta = STUDENT_STATUSES[student.status] || STUDENT_STATUSES.active
                  const badgeCls = (STATUS_BADGE_CLASSES[statusMeta.color] || STATUS_BADGE_CLASSES.emerald)(isDark)
                  return (
                    <motion.tr key={student.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.03 }}
                      onClick={() => navigate(`/students/${student.id}`)}
                      className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>{student.avatar}</div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-dark-900'}`}>
                              {student.name}
                              {d.needsAttention?.length > 0 && <AlertTriangle size={12} className="text-rose-500 flex-shrink-0" />}
                            </p>
                            <p className={`text-xs truncate ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block max-w-full truncate align-middle px-2 py-1 rounded-md text-xs font-medium ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>{student.course}</span>
                      </td>
                      <td className={`px-5 py-4 text-sm truncate ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{student.batch || 'Unassigned'}</td>
                      <td className={`px-5 py-4 text-sm truncate ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{d.trainer?.name || '—'}</td>
                      <td className="px-5 py-4"><span className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${badgeCls}`}>{studentStatusLabel(student.status)}</span></td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-semibold ${d.attendancePct == null ? (isDark ? 'text-dark-500' : 'text-dark-400') : d.attendancePct < attendanceThreshold ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {d.attendancePct != null ? `${d.attendancePct}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-semibold ${d.progressPct == null ? (isDark ? 'text-dark-500' : 'text-dark-400') : d.needsAttention?.includes('progress') ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {d.progressPct != null ? `${d.progressPct}%` : '—'}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-sm truncate ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{student.enrollDate ? new Date(student.enrollDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button onClick={() => navigate(`/students/${student.id}`)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:bg-dark-700 hover:text-white' : 'text-dark-400 hover:bg-dark-100 hover:text-dark-700'}`} title="View Profile"><Eye size={16} /></button>
                          <button onClick={() => handleWhatsApp(student)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:bg-dark-700 hover:text-white' : 'text-dark-400 hover:bg-dark-100 hover:text-dark-700'}`} title="WhatsApp"><MessageCircle size={16} /></button>
                          <button onClick={() => handleCallStudent(student)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:bg-dark-700 hover:text-white' : 'text-dark-400 hover:bg-dark-100 hover:text-dark-700'}`} title="Call Student"><Phone size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredStudents.length === 0 && (
            <div className="py-12 text-center">
              <Users size={40} className={`mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
              <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No students found matching your search.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state for grid */}
      {viewMode === 'grid' && filteredStudents.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-2xl p-12 text-center ${cardClass}`}>
          <Users size={40} className={`mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
          <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>No students found matching your search.</p>
        </motion.div>
      )}

      {/* Toast Notification */}
      <div className="fixed top-6 right-6 z-[100]">
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, x: 80, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 80, scale: 0.9 }}
              onAnimationComplete={() => setTimeout(() => setNotification(null), 3000)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${notification.type === 'success' ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700' : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-medium">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowAddModal(false); setDuplicateMatch(null) }}>
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl overflow-x-hidden ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`}>
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Add New Student</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => { setShowAddModal(false); setDuplicateMatch(null) }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></motion.button>
              </div>
              <div className={`px-6 pt-4 text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                This is a manual, historical-record entry. New students normally join through the Leads → Enrollment flow, which keeps the lead's history connected automatically.
              </div>
              {duplicateMatch ? (
                <div className="p-6 space-y-4">
                  <div className={`rounded-xl p-4 border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                    <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Student may already exist</p>
                    <p className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                      A student named <strong>{duplicateMatch.name}</strong> already has this phone number or email on file ({duplicateMatch.course}, {studentStatusLabel(duplicateMatch.status)}).
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setShowAddModal(false); setDuplicateMatch(null); navigate(`/students/${duplicateMatch.id}`) }}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Open Existing Student</button>
                    <button onClick={handleAddStudent} disabled={addSubmitting}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50">
                      {addSubmitting ? 'Creating…' : 'Continue Creating Anyway'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Full Name</label>
                    <input type="text" required value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} placeholder="Enter full name"
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Email</label>
                      <input type="email" required value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@example.com"
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Phone</label>
                      <input type="tel" inputMode="numeric" maxLength={10} required value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="98765 43210"
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Course</label>
                      <select required value={addForm.course} onChange={(e) => setAddForm((p) => ({ ...p, course: e.target.value, batch: '' }))}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`}>
                        <option value="">Select course</option>
                        {packages.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Total Fee (₹)</label>
                      <input type="number" required value={addForm.feeTotal} onChange={(e) => setAddForm((p) => ({ ...p, feeTotal: e.target.value }))} placeholder="75000"
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Batch</label>
                    <select value={addForm.batch} onChange={(e) => setAddForm((p) => ({ ...p, batch: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`}>
                      <option value="">Unassigned (assign later)</option>
                      {batches.filter((b) => b.course === addForm.course).map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                    {addForm.course && batches.filter((b) => b.course === addForm.course).length === 0 && (
                      <p className={`text-xs mt-1.5 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>No batches created yet for {addForm.course} — create one from the Batches page.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Date of Birth <span className="opacity-60">(optional)</span></label>
                      <input type="date" value={addForm.dob} onChange={(e) => setAddForm((p) => ({ ...p, dob: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Location <span className="opacity-60">(optional)</span></label>
                      <input type="text" value={addForm.location} onChange={(e) => setAddForm((p) => ({ ...p, location: e.target.value }))} placeholder="City"
                        className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setShowAddModal(false); setDuplicateMatch(null) }}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                    <button type="submit" disabled={addSubmitting}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all disabled:opacity-50">
                      {addSubmitting ? 'Checking…' : 'Add Student'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Students
