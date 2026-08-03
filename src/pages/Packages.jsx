import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CheckCircle2,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import PackageFormModal from '../components/packages/PackageFormModal'
import { categoryGradients, categoryBadgeColors, categoryBadgeColorsLight, formatPrice } from '../lib/packageStyles'

const categories = ['All', 'Development', 'Data & AI', 'Design', 'Marketing', 'Infrastructure', 'Security']

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

function PackageCard({ pkg, theme, onViewDetails }) {
  const { students } = useData()
  const isDark = theme === 'dark'
  const gradient = categoryGradients[pkg.category] || 'from-primary-500 to-primary-700'
  const badgeColor = isDark
    ? categoryBadgeColors[pkg.category]
    : categoryBadgeColorsLight[pkg.category]
  const visibleFeatures = (pkg.features || []).slice(0, 3)
  const remainingCount = (pkg.features?.length || 0) - 3
  const enrolledCount = students.filter((s) => s.course === pkg.name).length

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
              {enrolledCount}{pkg.capacity ? `/${pkg.capacity}` : ''} Students
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

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onViewDetails(pkg)}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-md shadow-primary-500/20 hover:shadow-primary-500/40 transition-shadow cursor-pointer flex items-center justify-center gap-1.5"
        >
          View Details
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}



export default function Packages() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const { packages, addPackage } = useData()
  const [activeCategory, setActiveCategory] = useState('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
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
          <button onClick={() => navigate('/packages/compare')} className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${
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
              onViewDetails={(p) => navigate(`/packages/${p.id}`)}
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

      {/* Create Package Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <PackageFormModal
            isDark={isDark}
            onClose={() => setShowCreateModal(false)}
            onSave={(pkg) => {
              addPackage({ ...pkg, students: 0, rating: 0, status: 'active' })
              showToast(`Package "${pkg.name}" created successfully`)
            }}
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
