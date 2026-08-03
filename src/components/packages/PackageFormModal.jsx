import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { modalOverlayVariants, modalCardVariants } from '../../lib/modalVariants'

const packageCategories = ['Development', 'Data & AI', 'Design', 'Marketing', 'Infrastructure', 'Security']

export default function PackageFormModal({ pkg, isDark, onClose, onSave }) {
  const [form, setForm] = useState({
    name: pkg?.name || '',
    duration: pkg?.duration || '',
    price: pkg?.price != null ? String(pkg.price) : '',
    description: pkg?.description || '',
    category: pkg?.category || 'Development',
    modules: pkg?.modules != null ? String(pkg.modules) : '',
    capacity: pkg?.capacity != null ? String(pkg.capacity) : '30',
    featuresText: (pkg?.features || []).join('\n'),
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
      name: form.name,
      duration: form.duration,
      price: Number(form.price),
      description: form.description,
      category: form.category,
      modules: Number(form.modules) || 0,
      capacity: Number(form.capacity) || 0,
      features: form.featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
    })
    onClose()
  }

  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors ${
    isDark
      ? 'bg-dark-800 border-dark-700 text-dark-200 focus:border-primary-500'
      : 'bg-white border-dark-200 text-dark-800 focus:border-primary-500'
  }`

  return (
    <motion.div variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 ${isDark ? 'bg-dark-900 border border-dark-700/60' : 'bg-white border border-dark-200/60 shadow-xl'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{pkg ? 'Edit Package' : 'Create Package'}</h2>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X size={20} /></motion.button>
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
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Capacity (max students)</label>
            <input type="number" min="0" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="30" className={inputCls} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what this program covers..."
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>What's Included (one per line)</label>
            <textarea rows={4} value={form.featuresText} onChange={e => setForm(p => ({ ...p, featuresText: e.target.value }))} placeholder={'Live Projects\nPlacement Assistance\nCertificate'}
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
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 transition-all">{pkg ? 'Save Changes' : 'Create Package'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
