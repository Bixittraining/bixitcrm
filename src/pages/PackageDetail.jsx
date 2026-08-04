import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Package, Clock, BookOpen, Users, UserCheck, Check, Pencil, Trash2, AlertTriangle, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { categoryGradients, categoryBadgeColors, categoryBadgeColorsLight, formatPrice } from '../lib/packageStyles'
import PackageFormModal from '../components/packages/PackageFormModal'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'

export default function PackageDetail() {
  const { packageId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { packages, students, updatePackage, deletePackage } = useData()
  const { isAdmin } = useAuth()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const pkg = packages.find((p) => String(p.id) === packageId)

  if (!pkg) {
    return (
      <div className="space-y-6">
        <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/packages')}
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
          <ArrowLeft className="w-4 h-4" />Back to Packages
        </motion.button>
        <div className={`rounded-2xl p-12 text-center ${cardClass}`}>
          <Package className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Package not found</p>
        </div>
      </div>
    )
  }

  const gradient = categoryGradients[pkg.category] || 'from-primary-500 to-primary-700'
  const badgeColor = isDark ? categoryBadgeColors[pkg.category] : categoryBadgeColorsLight[pkg.category]

  // Real enrollment count — a student's course field is set when they're
  // actually enrolled (Leads → Enroll → Batch), not by anything on this
  // page. Never a hardcoded stat.
  const enrolledCount = students.filter((s) => s.course === pkg.name).length
  const capacity = pkg.capacity || 0
  const remainingSlots = Math.max(capacity - enrolledCount, 0)
  const isFull = capacity > 0 && remainingSlots === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/packages')}
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
          <ArrowLeft className="w-4 h-4" />Back to Packages
        </motion.button>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEditModal(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'}`}>
              <Pencil className="w-3.5 h-3.5" />Edit Package
            </button>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Delete
            </button>
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl overflow-hidden ${cardClass}`}>
        <div className={`relative h-32 bg-gradient-to-r ${gradient}`}>
          <div className="absolute bottom-4 left-6 right-6">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badgeColor}`}>{pkg.category}</span>
            <h1 className="text-2xl font-bold text-white mt-2">{pkg.name}</h1>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isDark ? 'text-dark-400' : 'text-dark-500'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{pkg.duration}</span>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Rs {formatPrice(pkg.price)}</span>
              <span className={`block text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>/program</span>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>About This Program</h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{pkg.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Modules', value: pkg.modules, icon: BookOpen },
              { label: 'Enrolled', value: enrolledCount, icon: Users },
              { label: 'Remaining Slots', value: capacity > 0 ? remainingSlots : '—', icon: UserCheck },
            ].map((stat) => (
              <div key={stat.label} className={`p-4 rounded-xl text-center ${isDark ? 'bg-dark-800/80 border border-dark-700/40' : 'bg-dark-50 border border-dark-200/40'}`}>
                <stat.icon className={`w-5 h-5 mx-auto mb-2 ${isDark ? 'text-primary-400' : 'text-primary-500'}`} />
                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
                <p className={`text-xs ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          {capacity > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className={isDark ? 'text-dark-400' : 'text-dark-500'}>Capacity</span>
                <span className={`font-semibold ${isFull ? 'text-rose-500' : isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                  {enrolledCount} / {capacity} {isFull ? '— Full' : ''}
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                <div className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-gradient-to-r from-primary-500 to-violet-500'}`}
                  style={{ width: `${Math.min(100, Math.round((enrolledCount / capacity) * 100))}%` }} />
              </div>
            </div>
          )}

          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>What's Included</h3>
            {pkg.features?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pkg.features.map((feature, i) => (
                  <motion.div key={i} className="flex items-center gap-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className={`text-sm ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>{feature}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Nothing added yet for this package.</p>
            )}
          </div>

          {/* Enrollment happens through Leads → Enroll (creates the real
              student + invoice + batch link) or by assigning a batch from
              Students — not from here, to avoid a second enrollment path
              that skips GST and batch assignment. */}
          <button
            onClick={() => navigate('/students', { state: { filterCourse: pkg.name } })}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
          >
            <Users className="w-4 h-4" />View Enrolled Students
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showEditModal && (
          <PackageFormModal
            pkg={pkg}
            isDark={isDark}
            onClose={() => setShowEditModal(false)}
            onSave={(updates) => updatePackage(pkg.id, updates)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-2xl p-6 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                  <h2 className="text-base font-bold">Delete package?</h2>
                </div>
                <button onClick={() => setShowDeleteConfirm(false)} className={`p-1 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X size={18} /></button>
              </div>
              <p className={`text-sm mb-2 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>
                <strong>{pkg.name}</strong> will be permanently removed. This can't be undone.
              </p>
              {enrolledCount > 0 && (
                <p className="text-sm text-rose-500 mb-2">
                  {enrolledCount} student{enrolledCount === 1 ? ' is' : 's are'} currently enrolled in this course — their records won't be deleted, but this package will no longer show their real capacity/enrollment here.
                </p>
              )}
              <div className="flex justify-end gap-3 pt-3">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-60 ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    const ok = await deletePackage(pkg.id)
                    setDeleting(false)
                    if (ok) navigate('/packages')
                  }}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
