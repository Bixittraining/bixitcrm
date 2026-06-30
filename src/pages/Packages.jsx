import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Plus,
  GitCompareArrows,
  Clock,
  Users,
  Star,
  BookOpen,
  Check,
  ChevronRight,
  X,
  BarChart3,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'

const categories = ['All', 'Development', 'Data & AI', 'Design', 'Marketing', 'Infrastructure', 'Security']

const categoryGradients = {
  Development: 'from-primary-500 to-primary-700',
  'Data & AI': 'from-violet-500 to-violet-600',
  Design: 'from-rose-400 to-rose-600',
  Marketing: 'from-accent-400 to-accent-600',
  Infrastructure: 'from-sky-400 to-sky-600',
  Security: 'from-emerald-400 to-emerald-600',
}

const categoryBadgeColors = {
  Development: 'bg-primary-500/20 text-primary-300',
  'Data & AI': 'bg-violet-500/20 text-violet-300',
  Design: 'bg-rose-500/20 text-rose-300',
  Marketing: 'bg-accent-500/20 text-accent-300',
  Infrastructure: 'bg-sky-500/20 text-sky-300',
  Security: 'bg-emerald-500/20 text-emerald-300',
}

const categoryBadgeColorsLight = {
  Development: 'bg-primary-100 text-primary-700',
  'Data & AI': 'bg-violet-100 text-violet-600',
  Design: 'bg-rose-100 text-rose-600',
  Marketing: 'bg-accent-100 text-accent-700',
  Infrastructure: 'bg-sky-100 text-sky-600',
  Security: 'bg-emerald-100 text-emerald-700',
}

function formatPrice(price) {
  return price.toLocaleString('en-IN')
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
}

function EnrollmentChart({ theme }) {
  const bars = [35, 55, 42, 68, 50, 75, 60, 80, 65, 72, 85, 90]
  const maxBar = Math.max(...bars)

  return (
    <div className="flex items-end gap-1.5 h-24 mt-3">
      {bars.map((value, i) => (
        <motion.div
          key={i}
          className={`flex-1 rounded-t ${
            theme === 'dark'
              ? 'bg-primary-500/60'
              : 'bg-primary-400/50'
          }`}
          initial={{ height: 0 }}
          animate={{ height: `${(value / maxBar) * 100}%` }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function PackageDetailModal({ pkg, theme, onClose }) {
  const { students, setStudents, setInvoices, setPackages } = useData()
  const [showPicker, setShowPicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [enrolledId, setEnrolledId] = useState(null)
  const [enrollToast, setEnrollToast] = useState(null)

  if (!pkg) return null

  const isDark = theme === 'dark'
  const gradient = categoryGradients[pkg.category] || 'from-primary-500 to-primary-700'
  const badgeColor = isDark
    ? categoryBadgeColors[pkg.category]
    : categoryBadgeColorsLight[pkg.category]

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  function handleEnroll(student) {
    setStudents(prev => prev.map(s =>
      s.id === student.id ? { ...s, course: pkg.name, feeTotal: pkg.price } : s
    ))
    setInvoices(prev => {
      if (prev.find(inv => inv.student === student.name && inv.course === pkg.name)) return prev
      const invoiceId = `INV-${new Date().getFullYear()}-${String(prev.length + 1).padStart(3, '0')}`
      return [{
        id: invoiceId,
        student: student.name,
        course: pkg.name,
        amount: pkg.price,
        paid: 0,
        balance: pkg.price,
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: 'partial',
        paymentMode: 'UPI',
      }, ...prev]
    })
    setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, students: (p.students || 0) + 1 } : p))
    setEnrolledId(student.id)
    setShowPicker(false)
    setPickerSearch('')
    setEnrollToast(`${student.name} enrolled in ${pkg.name}!`)
    setTimeout(() => setEnrollToast(null), 3000)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <motion.div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${
          isDark
            ? 'bg-dark-900 border border-dark-700/60'
            : 'bg-white border border-dark-200/60 shadow-xl'
        }`}
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Gradient Header */}
        <div className={`relative h-32 bg-gradient-to-r ${gradient} rounded-t-2xl`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
              {pkg.category}
            </span>
            <h2 className="text-2xl font-bold text-white mt-2">{pkg.name}</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Duration & Price Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isDark ? 'text-dark-400' : 'text-dark-500'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                {pkg.duration}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>
                Rs {formatPrice(pkg.price)}
              </span>
              <span className={`block text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>/program</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${
              isDark ? 'text-dark-400' : 'text-dark-500'
            }`}>
              About This Program
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              {pkg.description}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Modules', value: pkg.modules, icon: BookOpen },
              { label: 'Enrolled', value: pkg.students, icon: Users },
              { label: 'Rating', value: pkg.rating, icon: Star },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-xl text-center ${
                  isDark
                    ? 'bg-dark-800/80 border border-dark-700/40'
                    : 'bg-dark-50 border border-dark-200/40'
                }`}
              >
                <stat.icon className={`w-5 h-5 mx-auto mb-2 ${isDark ? 'text-primary-400' : 'text-primary-500'}`} />
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
                <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* All Features */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${
              isDark ? 'text-dark-400' : 'text-dark-500'
            }`}>
              What's Included
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {pkg.features.map((feature, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                  <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Enrollment History Chart */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-1 ${
              isDark ? 'text-dark-400' : 'text-dark-500'
            }`}>
              Enrollment Trend (12 Months)
            </h3>
            <EnrollmentChart theme={theme} />
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Jul '25</span>
              <span className={`text-[10px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Jun '26</span>
            </div>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {enrollToast && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {enrollToast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPicker(true)}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Enroll Student in {pkg.name}
          </motion.button>

          {/* Student Picker */}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className={`rounded-xl border overflow-hidden ${
                  isDark ? 'bg-dark-800 border-dark-700/60' : 'bg-dark-50 border-dark-200/60'
                }`}
              >
                <div className={`flex items-center justify-between px-4 py-3 border-b ${
                  isDark ? 'border-dark-700/60' : 'border-dark-200/60'
                }`}>
                  <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>
                    Select a Student
                  </span>
                  <button
                    onClick={() => { setShowPicker(false); setPickerSearch('') }}
                    className={`p-1 rounded-lg hover:bg-dark-700/30 transition-colors cursor-pointer ${isDark ? 'text-dark-400' : 'text-dark-500'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-3 pt-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-dark-900/60 border-dark-700/40' : 'bg-white border-dark-200/60'
                  }`}>
                    <Search className={`w-3.5 h-3.5 ${isDark ? 'text-dark-400' : 'text-dark-400'}`} />
                    <input
                      autoFocus
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      placeholder="Search students..."
                      className={`flex-1 bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder-dark-500' : 'text-dark-900 placeholder-dark-400'}`}
                    />
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto p-3 space-y-1">
                  {filteredStudents.length === 0 ? (
                    <p className={`text-center text-sm py-6 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                      No students found
                    </p>
                  ) : filteredStudents.map(student => (
                    <motion.button
                      key={student.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleEnroll(student)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                        enrolledId === student.id
                          ? isDark ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'
                          : isDark ? 'hover:bg-dark-700/50' : 'hover:bg-white'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-500 flex-shrink-0">
                        {student.avatar || student.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>
                          {student.name}
                        </p>
                        <p className={`text-xs truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                          {student.email} · {student.course}
                        </p>
                      </div>
                      {enrolledId === student.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PackageCard({ pkg, theme, onViewDetails }) {
  const isDark = theme === 'dark'
  const gradient = categoryGradients[pkg.category] || 'from-primary-500 to-primary-700'
  const badgeColor = isDark
    ? categoryBadgeColors[pkg.category]
    : categoryBadgeColorsLight[pkg.category]
  const visibleFeatures = pkg.features.slice(0, 3)
  const remainingCount = pkg.features.length - 3

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`group rounded-2xl overflow-hidden ${
        isDark
          ? 'bg-dark-900 border border-dark-700/60 hover:shadow-2xl hover:shadow-primary-500/10'
          : 'bg-white border border-dark-200/60 shadow-sm hover:shadow-xl hover:shadow-dark-200/40'
      } transition-shadow`}
    >
      {/* Top Gradient Banner */}
      <div className={`relative h-28 bg-gradient-to-r ${gradient} p-5`}>
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
          {pkg.category}
        </div>
        <div className="absolute bottom-4 left-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-white/80" />
            <span className="text-xs text-white/80 font-medium">{pkg.duration}</span>
          </div>
          <h3 className="text-lg font-bold text-white leading-tight">{pkg.name}</h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Description */}
        <p className={`text-sm leading-relaxed line-clamp-2 ${
          isDark ? 'text-dark-400' : 'text-dark-500'
        }`}>
          {pkg.description}
        </p>

        {/* Stats Row */}
        <div className={`flex items-center justify-between py-3 border-y ${
          isDark ? 'border-dark-700/50' : 'border-dark-200/50'
        }`}>
          <div className="flex items-center gap-1.5">
            <BookOpen className={`w-4 h-4 ${isDark ? 'text-primary-400' : 'text-primary-500'}`} />
            <span className={`text-xs font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              {pkg.modules} Modules
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className={`w-4 h-4 ${isDark ? 'text-accent-400' : 'text-accent-500'}`} />
            <span className={`text-xs font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              {pkg.students} Students
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className={`w-4 h-4 text-accent-400 fill-accent-400`} />
            <span className={`text-xs font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
              {pkg.rating}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>
            Rs {formatPrice(pkg.price)}
          </span>
          <span className={`text-xs ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>/program</span>
        </div>

        {/* Features */}
        <div className="space-y-2">
          {visibleFeatures.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-shrink-0 w-4.5 h-4.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-500" />
              </div>
              <span className={`text-xs ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{feature}</span>
            </div>
          ))}
          {remainingCount > 0 && (
            <span className={`text-xs font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
              +{remainingCount} more
            </span>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2 pt-1">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onViewDetails(pkg)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-md shadow-primary-500/20 hover:shadow-primary-500/40 transition-shadow cursor-pointer flex items-center justify-center gap-1.5"
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onViewDetails(pkg)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              isDark
                ? 'border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-white'
                : 'border-dark-300 text-dark-600 hover:bg-dark-50 hover:text-dark-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Enroll Student
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

const packageCategories = ['Development', 'Data & AI', 'Design', 'Marketing', 'Infrastructure', 'Security']

function CreatePackageModal({ isDark, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', duration: '', price: '', description: '', category: 'Development', modules: '',
  })
  const [toast, setToast] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.duration) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    onSave({
      id: Date.now(),
      name: form.name,
      duration: form.duration,
      price: Number(form.price),
      description: form.description,
      category: form.category,
      modules: Number(form.modules) || 0,
      students: 0,
      rating: 0,
      status: 'active',
      features: [],
    })
    onClose()
  }

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
    isDark
      ? 'bg-dark-800 border-dark-700 text-dark-200 focus:border-primary-500'
      : 'bg-white border-dark-200 text-dark-800 focus:border-primary-500'
  }`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Create Package</h2>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Package Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Full Stack Development" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Category *</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                {packageCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Duration *</label>
              <input type="text" required value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 6 Months" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Price (₹) *</label>
              <input type="number" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="75000" className={inputCls} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Modules</label>
              <input type="number" value={form.modules} onChange={e => setForm(p => ({ ...p, modules: e.target.value }))} placeholder="24" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what this program covers..."
              className={`${inputCls} resize-none`} />
          </div>
          {toast && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${toast.type === 'error' ? isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-700' : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
              {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
              {toast.message}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">Create Package</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function ComparePackagesModal({ isDark, onClose, packages }) {
  const [selected, setSelected] = useState([])

  const toggleSelect = (pkg) => {
    setSelected(prev => {
      if (prev.find(p => p.id === pkg.id)) return prev.filter(p => p.id !== pkg.id)
      if (prev.length >= 3) return prev
      return [...prev, pkg]
    })
  }

  const formatPrice = (p) => `Rs ${p.toLocaleString('en-IN')}`

  const allFeatures = [...new Set(selected.flatMap(p => p.features || []))]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Compare Packages</h2>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Select up to 3 packages to compare side by side</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X size={20} /></button>
        </div>

        {/* Package Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {packages.map(pkg => {
            const isSelected = selected.find(p => p.id === pkg.id)
            return (
              <button key={pkg.id} onClick={() => toggleSelect(pkg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                    : isDark ? 'border-dark-700 text-dark-400 hover:border-dark-500' : 'border-dark-200 text-dark-500 hover:border-dark-400'
                }`}>
                {isSelected && <Check size={10} className="inline mr-1" />}
                {pkg.name}
              </button>
            )
          })}
        </div>

        {selected.length === 0 && (
          <div className={`rounded-xl p-12 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
            <GitCompareArrows size={36} className={`mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
            <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Select packages above to compare</p>
          </div>
        )}

        {selected.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Feature</th>
                  {selected.map(pkg => (
                    <th key={pkg.id} className={`py-3 px-4 text-center text-xs font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{pkg.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-700/40' : 'divide-dark-200/60'}`}>
                {[
                  { label: 'Price', key: 'price', format: formatPrice },
                  { label: 'Duration', key: 'duration' },
                  { label: 'Modules', key: 'modules' },
                  { label: 'Students', key: 'students' },
                  { label: 'Rating', key: 'rating' },
                  { label: 'Category', key: 'category' },
                ].map(row => (
                  <tr key={row.label} className={isDark ? 'hover:bg-dark-800/30' : 'hover:bg-dark-50/60'}>
                    <td className={`py-3 px-4 font-medium ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>{row.label}</td>
                    {selected.map(pkg => (
                      <td key={pkg.id} className={`py-3 px-4 text-center ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                        {row.format ? row.format(pkg[row.key]) : (pkg[row.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
                {allFeatures.length > 0 && allFeatures.map(feature => (
                  <tr key={feature} className={isDark ? 'hover:bg-dark-800/30' : 'hover:bg-dark-50/60'}>
                    <td className={`py-3 px-4 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>{feature}</td>
                    {selected.map(pkg => (
                      <td key={pkg.id} className="py-3 px-4 text-center">
                        {(pkg.features || []).includes(feature)
                          ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                          : <X size={16} className={`mx-auto ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Packages() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { packages, addPackage } = useData()
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filteredPackages = activeCategory === 'All'
    ? packages
    : packages.filter((pkg) => pkg.category === activeCategory)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}
          >
            Educational Packages
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}
          >
            Course programs and pricing for students
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-3"
        >
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Package
          </button>
          <button onClick={() => setShowCompareModal(true)} className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${
            isDark
              ? 'border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-white'
              : 'border-dark-300 text-dark-600 hover:bg-dark-50 hover:text-dark-900'
          }`}>
            <GitCompareArrows className="w-4 h-4" />
            Compare Packages
          </button>
        </motion.div>
      </div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category
          return (
            <motion.button
              key={category}
              onClick={() => setActiveCategory(category)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/25'
                  : isDark
                    ? 'bg-dark-800/80 text-dark-400 hover:text-dark-200 hover:bg-dark-700/80'
                    : 'bg-dark-100 text-dark-500 hover:text-dark-700 hover:bg-dark-200'
              }`}
            >
              {category}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Package Cards Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              theme={theme}
              onViewDetails={setSelectedPackage}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Empty State */}
      {filteredPackages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center py-16 rounded-2xl ${
            isDark
              ? 'bg-dark-900 border border-dark-700/60'
              : 'bg-white border border-dark-200/60'
          }`}
        >
          <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
          <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
            No packages found in this category
          </p>
        </motion.div>
      )}

      {/* Package Detail Modal */}
      <AnimatePresence>
        {selectedPackage && (
          <PackageDetailModal
            pkg={selectedPackage}
            theme={theme}
            onClose={() => setSelectedPackage(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Package Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePackageModal
            isDark={isDark}
            onClose={() => setShowCreateModal(false)}
            onSave={(pkg) => {
              addPackage(pkg)
              showToast(`Package "${pkg.name}" created successfully`)
            }}
          />
        )}
      </AnimatePresence>

      {/* Compare Packages Modal */}
      <AnimatePresence>
        {showCompareModal && (
          <ComparePackagesModal
            isDark={isDark}
            onClose={() => setShowCompareModal(false)}
            packages={packages}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
            className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border ${
              toast.type === 'success'
                ? isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
