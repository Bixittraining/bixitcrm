import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, GitCompareArrows, Check, CheckCircle2, X } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useData } from '../context/DataContext'
import { formatPrice } from '../lib/packageStyles'

export default function PackageCompare() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { packages, students } = useData()
  const [selected, setSelected] = useState([])

  const cardClass = isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-sm'
  const enrolledCountFor = (pkg) => students.filter((s) => s.course === pkg.name).length

  const toggleSelect = (pkg) => {
    setSelected((prev) => {
      if (prev.find((p) => p.id === pkg.id)) return prev.filter((p) => p.id !== pkg.id)
      if (prev.length >= 3) return prev
      return [...prev, pkg]
    })
  }

  const allFeatures = [...new Set(selected.flatMap((p) => p.features || []))]

  return (
    <div className="space-y-6">
      <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/packages')}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-dark-400 hover:text-white' : 'text-dark-500 hover:text-dark-900'}`}>
        <ArrowLeft className="w-4 h-4" />Back to Packages
      </motion.button>

      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Compare Packages</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Select up to 3 packages to compare side by side</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-6 ${cardClass}`}>
        <div className="flex flex-wrap gap-2 mb-6">
          {packages.map((pkg) => {
            const isSelected = selected.find((p) => p.id === pkg.id)
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

        {selected.length === 0 ? (
          <div className={`rounded-xl p-12 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
            <GitCompareArrows size={36} className={`mx-auto mb-3 ${isDark ? 'text-dark-600' : 'text-dark-300'}`} />
            <p className={`text-sm ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Select packages above to compare</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>Feature</th>
                  {selected.map((pkg) => (
                    <th key={pkg.id} className={`py-3 px-4 text-center text-xs font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{pkg.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-dark-700/40' : 'divide-dark-200/60'}`}>
                {[
                  { label: 'Price', key: 'price', format: (v) => `Rs ${formatPrice(v)}` },
                  { label: 'Duration', key: 'duration' },
                  { label: 'Modules', key: 'modules' },
                  { label: 'Students', key: 'students', format: (_, pkg) => `${enrolledCountFor(pkg)}${pkg.capacity ? `/${pkg.capacity}` : ''}` },
                  { label: 'Rating', key: 'rating' },
                  { label: 'Category', key: 'category' },
                ].map((row) => (
                  <tr key={row.label} className={isDark ? 'hover:bg-dark-800/30' : 'hover:bg-dark-50/60'}>
                    <td className={`py-3 px-4 font-medium ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>{row.label}</td>
                    {selected.map((pkg) => (
                      <td key={pkg.id} className={`py-3 px-4 text-center ${isDark ? 'text-dark-200' : 'text-dark-800'}`}>
                        {row.format ? row.format(pkg[row.key], pkg) : (pkg[row.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
                {allFeatures.map((feature) => (
                  <tr key={feature} className={isDark ? 'hover:bg-dark-800/30' : 'hover:bg-dark-50/60'}>
                    <td className={`py-3 px-4 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>{feature}</td>
                    {selected.map((pkg) => (
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
    </div>
  )
}
