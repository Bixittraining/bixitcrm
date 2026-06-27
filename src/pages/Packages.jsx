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
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { packages } from '../data/mockData'

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
  if (!pkg) return null

  const isDark = theme === 'dark'
  const gradient = categoryGradients[pkg.category] || 'from-primary-500 to-primary-700'
  const badgeColor = isDark
    ? categoryBadgeColors[pkg.category]
    : categoryBadgeColorsLight[pkg.category]

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

          {/* CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Enroll Student in {pkg.name}
          </motion.button>
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
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${
              isDark
                ? 'border-dark-600 text-dark-300 hover:bg-dark-800 hover:text-white'
                : 'border-dark-300 text-dark-600 hover:bg-dark-50 hover:text-dark-900'
            }`}
          >
            Enroll Student
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Packages() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedPackage, setSelectedPackage] = useState(null)

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
          <button className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Package
          </button>
          <button className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${
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
    </div>
  )
}
