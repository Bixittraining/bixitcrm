import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Download, LayoutGrid, List, Eye, Mail, Receipt,
  Users, UserCheck, GraduationCap, BarChart3, X, Phone, Calendar,
  BookOpen, ChevronUp, ChevronDown, ArrowUpDown, MessageCircle,
  CheckCircle2, AlertCircle, Trash2
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'

const avatarGradients = {
  A: 'from-rose-500 to-pink-600',
  B: 'from-orange-500 to-amber-600',
  C: 'from-amber-500 to-yellow-600',
  D: 'from-emerald-500 to-green-600',
  E: 'from-teal-500 to-emerald-600',
  F: 'from-cyan-500 to-teal-600',
  G: 'from-sky-500 to-cyan-600',
  H: 'from-blue-500 to-sky-600',
  I: 'from-indigo-500 to-blue-600',
  J: 'from-violet-500 to-indigo-600',
  K: 'from-purple-500 to-violet-600',
  L: 'from-fuchsia-500 to-purple-600',
  M: 'from-pink-500 to-fuchsia-600',
  N: 'from-rose-500 to-red-600',
  O: 'from-emerald-500 to-teal-600',
  P: 'from-primary-500 to-violet-600',
  Q: 'from-sky-500 to-blue-600',
  R: 'from-accent-500 to-orange-600',
  S: 'from-emerald-500 to-cyan-600',
  T: 'from-violet-500 to-purple-600',
  U: 'from-rose-500 to-pink-600',
  V: 'from-sky-500 to-indigo-600',
  W: 'from-amber-500 to-orange-600',
  X: 'from-teal-500 to-green-600',
  Y: 'from-indigo-500 to-violet-600',
  Z: 'from-fuchsia-500 to-pink-600',
}

function getAvatarGradient(name) {
  const letter = name.charAt(0).toUpperCase()
  return avatarGradients[letter] || 'from-primary-500 to-violet-600'
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

function StudentProfileModal({ student, onClose, theme, onMessage, onCall, onWhatsApp, onDelete }) {
  if (!student) return null

  const isDark = theme === 'dark'
  const feePercent = Math.round((student.feePaid / student.feeTotal) * 100)
  const feeRemaining = student.feeTotal - student.feePaid

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 ${
          isDark
            ? 'bg-dark-900 border-dark-700/60'
            : 'bg-white border-dark-200/60 shadow-xl'
        }`}
        variants={modalCardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
          {/* Close Button */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'
            }`}
          >
            <X size={20} />
          </motion.button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
              {student.avatar}
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>
                {student.name}
              </h2>
              <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                {student.course}
              </p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                student.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-primary-500/15 text-primary-500'
              }`}>
                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => { onCall?.(student) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
              <Phone size={14} /> Call
            </button>
            <button onClick={() => { onWhatsApp?.(student) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button onClick={() => { onMessage?.(student) }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
              <Mail size={14} /> Email
            </button>
            <button onClick={() => { onDelete?.(student.id); onClose() }}
              className={`ml-auto p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors`}>
              <Trash2 size={16} />
            </button>
          </div>

          {/* Contact Info */}
          <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Mail size={14} className={isDark ? 'text-dark-500' : 'text-dark-400'} />
                <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{student.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className={isDark ? 'text-dark-500' : 'text-dark-400'} />
                <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{student.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen size={14} className={isDark ? 'text-dark-500' : 'text-dark-400'} />
                <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{student.batch}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className={isDark ? 'text-dark-500' : 'text-dark-400'} />
                <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                  Enrolled: {new Date(student.enrollDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              Fee Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Total Fee</p>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>
                  {student.feeTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Paid</p>
                <p className="text-lg font-bold text-emerald-500">
                  {student.feePaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Remaining</p>
                <p className={`text-lg font-bold ${feeRemaining > 0 ? 'text-accent-500' : 'text-emerald-500'}`}>
                  {feeRemaining.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${feePercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className={`text-xs mt-1.5 text-right ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
              {feePercent}% paid
            </p>
          </div>

          {/* Attendance */}
          <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              Attendance
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                  <motion.div
                    className={`h-full rounded-full ${
                      student.attendance >= 90
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : student.attendance >= 75
                        ? 'bg-gradient-to-r from-sky-500 to-sky-400'
                        : 'bg-gradient-to-r from-accent-500 to-accent-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${student.attendance}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
              </div>
              <span className={`text-lg font-bold min-w-[48px] text-right ${
                student.attendance >= 90
                  ? 'text-emerald-500'
                  : student.attendance >= 75
                  ? 'text-sky-500'
                  : 'text-accent-500'
              }`}>
                {student.attendance}%
              </span>
            </div>
          </div>

          {/* Course Progress */}
          <div className={`rounded-xl p-4 ${isDark ? 'bg-dark-800/60' : 'bg-dark-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              Course Progress
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${student.status === 'completed' ? 100 : Math.round(student.attendance * 0.7)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                  />
                </div>
              </div>
              <span className={`text-lg font-bold min-w-[48px] text-right text-primary-500`}>
                {student.status === 'completed' ? 100 : Math.round(student.attendance * 0.7)}%
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
  )
}

function Students() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { students, setStudents } = useData()

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [notification, setNotification] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', course: '', batch: '', feeTotal: '' })

  const showToast = (message, type = 'success') => setNotification({ message, type })

  const handleAddStudent = (e) => {
    e.preventDefault()
    const nameParts = addForm.name.trim().split(' ')
    const avatar = nameParts.length >= 2 ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : addForm.name.trim().slice(0, 2).toUpperCase()
    const newStudent = {
      id: Date.now(), name: addForm.name, email: addForm.email, phone: addForm.phone,
      course: addForm.course, batch: addForm.batch || `Batch ${new Date().getFullYear()}-A`,
      enrollDate: new Date().toISOString().slice(0, 10), status: 'active',
      feePaid: 0, feeTotal: Number(addForm.feeTotal) || 0, avatar, attendance: 0,
    }
    setStudents((prev) => [newStudent, ...prev])
    setShowAddModal(false)
    setAddForm({ name: '', email: '', phone: '', course: '', batch: '', feeTotal: '' })
    showToast(`${newStudent.name} added as a student`)
  }

  const handleDeleteStudent = (id) => {
    const student = students.find(s => s.id === id)
    setStudents((prev) => prev.filter((s) => s.id !== id))
    setSelectedStudent(null)
    showToast(student ? `${student.name} removed` : 'Student removed')
  }

  const handleMessageStudent = (student) => {
    window.open(`mailto:${student.email}?subject=${encodeURIComponent(`BIX Academy - ${student.course}`)}`)
    showToast(`Opening email for ${student.name}`)
  }

  const handleCallStudent = (student) => {
    window.open(`tel:${student.phone}`)
  }

  const handleWhatsApp = (student) => {
    window.open(`https://wa.me/${student.phone.replace(/\s+/g, '').replace('+', '')}`)
  }

  // Filtered students
  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const q = searchQuery.toLowerCase()
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q)
      )
    })

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]
        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [students, searchQuery, sortConfig])

  // Stats
  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter(s => s.status === 'active').length
    const completed = students.filter(s => s.status === 'completed').length
    const avgAttendance = Math.round(students.reduce((sum, s) => sum + s.attendance, 0) / total)
    return { total, active, completed, avgAttendance }
  }, [students])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown size={14} className="opacity-40" />
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={14} className="text-primary-500" />
      : <ChevronDown size={14} className="text-primary-500" />
  }

  const cardClass = isDark
    ? 'bg-dark-900 border border-dark-700/60'
    : 'bg-white border border-dark-200/60 shadow-sm'

  const statCards = [
    { label: 'Total Students', value: stats.total, icon: Users, color: 'text-primary-500', bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50' },
    { label: 'Active Students', value: stats.active, icon: UserCheck, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
    { label: 'Completed', value: stats.completed, icon: GraduationCap, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50' },
    { label: 'Avg Attendance', value: `${stats.avgAttendance}%`, icon: BarChart3, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>
            Students
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            Manage enrolled students and track their progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const csv = 'Name,Email,Phone,Course,Batch,Enroll Date,Status,Fee Paid,Fee Total,Attendance\n' +
                students.map(s => `${s.name},${s.email},${s.phone},${s.course},${s.batch},${s.enrollDate},${s.status},${s.feePaid},${s.feeTotal},${s.attendance}%`).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'students-export.csv'; a.click(); URL.revokeObjectURL(url)
              showToast('Students exported successfully')
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            isDark
              ? 'border-dark-700 text-dark-300 hover:bg-dark-800'
              : 'border-dark-200 text-dark-600 hover:bg-dark-50'
          }`}>
            <Download size={16} className="inline mr-2 -mt-0.5" />
            Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all">
            <Plus size={16} className="inline mr-2 -mt-0.5" />
            Add Student
          </button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className={`relative`}
      >
        <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
        <input
          type="text"
          placeholder="Search students by name, email, course, or batch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
            isDark
              ? 'bg-dark-900 border-dark-700/60 text-white placeholder:text-dark-500'
              : 'bg-white border-dark-200/60 text-dark-900 placeholder:text-dark-400'
          }`}
        />
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            className={`rounded-2xl p-5 ${cardClass}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon size={22} className={stat.color} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* View Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between"
      >
        <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
          Showing {filteredStudents.length} of {students.length} students
        </p>
        <div className={`flex rounded-xl border overflow-hidden ${
          isDark ? 'border-dark-700/60' : 'border-dark-200/60'
        }`}>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-600 text-white'
                : isDark
                ? 'bg-dark-900 text-dark-400 hover:text-dark-200'
                : 'bg-white text-dark-500 hover:text-dark-700'
            }`}
          >
            <LayoutGrid size={16} />
            Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-primary-600 text-white'
                : isDark
                ? 'bg-dark-900 text-dark-400 hover:text-dark-200'
                : 'bg-white text-dark-500 hover:text-dark-700'
            }`}
          >
            <List size={16} />
            Table
          </button>
        </div>
      </motion.div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {filteredStudents.map((student) => {
            const feePercent = Math.round((student.feePaid / student.feeTotal) * 100)
            return (
              <motion.div
                key={student.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
                className={`rounded-2xl p-6 ${cardClass} hover:shadow-lg transition-shadow cursor-default`}
              >
                {/* Student Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                    {student.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>
                      {student.name}
                    </h3>
                    <p className={`text-xs truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      {student.email}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    student.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-primary-500/15 text-primary-500'
                  }`}>
                    {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                  </span>
                </div>

                {/* Course & Batch */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                  }`}>
                    {student.course}
                  </span>
                </div>
                <p className={`text-xs mb-4 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                  {student.batch}
                </p>

                {/* Fee Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      Fee Progress
                    </span>
                    <span className={`text-xs font-semibold ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                      {student.feePaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                      {' / '}
                      {student.feeTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${feePercent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <p className={`text-xs mt-1 text-right ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                    {feePercent}%
                  </p>
                </div>

                {/* Attendance */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      Attendance
                    </span>
                    <span className={`text-xs font-semibold ${
                      student.attendance >= 90
                        ? 'text-emerald-500'
                        : student.attendance >= 75
                        ? 'text-sky-500'
                        : 'text-accent-500'
                    }`}>
                      {student.attendance}%
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                    <motion.div
                      className={`h-full rounded-full ${
                        student.attendance >= 90
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : student.attendance >= 75
                          ? 'bg-gradient-to-r from-sky-500 to-sky-400'
                          : 'bg-gradient-to-r from-accent-500 to-accent-400'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${student.attendance}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`flex items-center gap-2 pt-4 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isDark
                        ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
                        : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'
                    }`}
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    onClick={() => handleMessageStudent(student)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isDark
                        ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
                        : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'
                    }`}
                  >
                    <Mail size={14} />
                    Message
                  </button>
                  <button
                    onClick={() => { setSelectedStudent(student) }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isDark
                        ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
                        : 'bg-dark-50 text-dark-600 hover:bg-dark-100 hover:text-dark-900'
                    }`}
                  >
                    <Receipt size={14} />
                    Fees
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`rounded-2xl overflow-hidden ${cardClass}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full table-fixed min-w-[1230px]">
              <colgroup>
                <col className="w-[225px]" />
                <col className="w-[150px]" />
                <col className="w-[200px]" />
                <col className="w-[120px]" />
                <col className="w-[185px]" />
                <col className="w-[85px]" />
                <col className="w-[120px]" />
                <col className="w-[145px]" />
              </colgroup>
              <thead>
                <tr className={isDark ? 'bg-dark-800/60' : 'bg-dark-50'}>
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'phone', label: 'Contact' },
                    { key: 'course', label: 'Course' },
                    { key: 'batch', label: 'Batch' },
                    { key: 'feePaid', label: 'Fee Status' },
                    { key: 'attendance', label: 'Attendance' },
                    { key: 'status', label: 'Status' },
                    { key: null, label: 'Actions' },
                  ].map((col) => (
                    <th
                      key={col.label}
                      onClick={() => col.key && handleSort(col.key)}
                      className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${
                        isDark ? 'text-dark-400' : 'text-dark-500'
                      } ${col.key ? 'cursor-pointer hover:text-primary-500 select-none' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {col.key && <SortIcon column={col.key} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-700/40' : 'divide-dark-200/60'}`}>
                {filteredStudents.map((student, index) => {
                  const feePercent = Math.round((student.feePaid / student.feeTotal) * 100)
                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-dark-800/40' : 'hover:bg-dark-50/60'
                      }`}
                    >
                      {/* Name with Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                            {student.avatar}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>
                              {student.name}
                            </p>
                            <p className={`text-xs truncate ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className={`px-5 py-4 text-sm truncate ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                        {student.phone}
                      </td>

                      {/* Course */}
                      <td className="px-5 py-4">
                        <span className={`inline-block max-w-full truncate align-middle px-2 py-1 rounded-md text-xs font-medium ${
                          isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                        }`}>
                          {student.course}
                        </span>
                      </td>

                      {/* Batch */}
                      <td className={`px-5 py-4 text-sm truncate ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                        {student.batch}
                      </td>

                      {/* Fee Status */}
                      <td className="px-5 py-4">
                        <div className="w-full max-w-[140px]">
                          <div className={`h-1.5 rounded-full overflow-hidden mb-1 ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                              style={{ width: `${feePercent}%` }}
                            />
                          </div>
                          <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                            {feePercent}% paid
                          </p>
                        </div>
                      </td>

                      {/* Attendance */}
                      <td className="px-5 py-4">
                        <span className={`text-sm font-semibold ${
                          student.attendance >= 90
                            ? 'text-emerald-500'
                            : student.attendance >= 75
                            ? 'text-sky-500'
                            : 'text-accent-500'
                        }`}>
                          {student.attendance}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${
                          student.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-primary-500/15 text-primary-500'
                        }`}>
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? 'text-dark-400 hover:bg-dark-700 hover:text-white'
                                : 'text-dark-400 hover:bg-dark-100 hover:text-dark-700'
                            }`}
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleMessageStudent(student)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? 'text-dark-400 hover:bg-dark-700 hover:text-white'
                                : 'text-dark-400 hover:bg-dark-100 hover:text-dark-700'
                            }`}
                            title="Send Message"
                          >
                            <Mail size={16} />
                          </button>
                          <button
                            onClick={() => handleCallStudent(student)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? 'text-dark-400 hover:bg-dark-700 hover:text-white'
                                : 'text-dark-400 hover:bg-dark-100 hover:text-dark-700'
                            }`}
                            title="Call Student"
                          >
                            <Phone size={16} />
                          </button>
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
              <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                No students found matching your search.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state for grid */}
      {viewMode === 'grid' && filteredStudents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-2xl p-12 text-center ${cardClass}`}
        >
          <Users size={40} className={`mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
          <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            No students found matching your search.
          </p>
        </motion.div>
      )}

      {/* Student Profile Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentProfileModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            theme={theme}
            onMessage={handleMessageStudent}
            onCall={handleCallStudent}
            onWhatsApp={handleWhatsApp}
            onDelete={handleDeleteStudent}
          />
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <div className="fixed top-6 right-6 z-[100]">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              onAnimationComplete={() => setTimeout(() => setNotification(null), 3000)}
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
                notification.type === 'success'
                  ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
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
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl overflow-hidden ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`}
            >
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Add New Student</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowAddModal(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></motion.button>
              </div>
              <form onSubmit={handleAddStudent} className="p-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Full Name</label>
                  <input type="text" required value={addForm.name} onChange={(e) => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter full name"
                    className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Email</label>
                    <input type="email" required value={addForm.email} onChange={(e) => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com"
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Phone</label>
                    <input type="tel" required value={addForm.phone} onChange={(e) => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210"
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Course</label>
                    <select required value={addForm.course} onChange={(e) => setAddForm(p => ({ ...p, course: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`}>
                      <option value="">Select course</option>
                      {['Full Stack Development','Data Science & AI','UI/UX Design','Digital Marketing','Cloud Computing','Cybersecurity','Mobile App Development','DevOps Engineering','Python Programming'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Total Fee (₹)</label>
                    <input type="number" required value={addForm.feeTotal} onChange={(e) => setAddForm(p => ({ ...p, feeTotal: e.target.value }))} placeholder="75000"
                      className={`w-full px-3 py-2.5 rounded-xl text-sm border ${isDark ? 'bg-dark-800 border-dark-700 text-dark-200' : 'bg-white border-dark-200 text-dark-800'}`} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                  <button type="submit"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">Add Student</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Students
