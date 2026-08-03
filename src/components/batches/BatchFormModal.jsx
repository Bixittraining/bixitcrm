import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, PlayCircle, Hourglass, CheckCircle2 } from 'lucide-react'
import { modalOverlayVariants, modalCardVariants } from '../../lib/modalVariants'

const courseOptions = [
  'Full Stack Development', 'Data Science & AI', 'UI/UX Design', 'Digital Marketing',
  'Cloud Computing', 'Cybersecurity', 'Mobile App Development', 'DevOps Engineering', 'Python Programming',
]

const weekdays = [
  { key: 'Mon', label: 'Mon' }, { key: 'Tue', label: 'Tue' }, { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' }, { key: 'Fri', label: 'Fri' }, { key: 'Sat', label: 'Sat' }, { key: 'Sun', label: 'Sun' },
]

const statusConfig = {
  upcoming: { label: 'Upcoming', color: 'sky', icon: Hourglass },
  ongoing: { label: 'Ongoing', color: 'emerald', icon: PlayCircle },
  completed: { label: 'Completed', color: 'violet', icon: CheckCircle2 },
}

export default function BatchFormModal({ batch, isDark, teamMembers, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: batch?.name || '',
    course: batch?.course || '',
    instructor_id: batch?.instructor_id || '',
    start_date: batch?.start_date || '',
    end_date: batch?.end_date || '',
    schedule_days: batch?.schedule_days || [],
    start_time: batch?.start_time || '',
    end_time: batch?.end_time || '',
    capacity: batch?.capacity ?? 30,
    status: batch?.status || 'upcoming',
  })
  const inputClass = isDark
    ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-primary-500/20'
    : 'bg-white border-dark-200 text-dark-900 placeholder-dark-400 focus:border-primary-500 focus:ring-primary-500/20'
  const [formError, setFormError] = useState('')
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const toggleDay = (day) => setForm((prev) => ({
    ...prev,
    schedule_days: prev.schedule_days.includes(day) ? prev.schedule_days.filter((d) => d !== day) : [...prev.schedule_days, day],
  }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.schedule_days.length === 0) { setFormError('Select at least one class day'); return }
    if (!form.start_time || !form.end_time) { setFormError('Set both a class start time and end time'); return }
    if (form.end_date && form.start_date && form.end_date < form.start_date) { setFormError('End date cannot be before start date'); return }
    setFormError('')
    onSubmit(form)
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl shadow-black/40' : 'bg-white border border-dark-200/60 shadow-2xl'}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{batch ? 'Edit Batch' : 'Create Batch'}</h2>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-500 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-400 hover:text-dark-600 hover:bg-dark-100'}`}
          ><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Batch Name</label>
            <input type="text" required value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Batch 2026-A"
              className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Course</label>
              <select required value={form.course} onChange={(e) => handleChange('course', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select course</option>
                {courseOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Instructor</label>
              <select required value={form.instructor_id} onChange={(e) => handleChange('instructor_id', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer transition-all ${inputClass}`}>
                <option value="">Select instructor</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Start Date</label>
              <input type="date" required value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>End Date</label>
              <input type="date" required min={form.start_date || undefined} value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Capacity</label>
              <input type="number" min="1" required value={form.capacity} onChange={(e) => handleChange('capacity', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Class Days</label>
            <div className="flex flex-wrap gap-1.5">
              {weekdays.map((d) => (
                <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                  className={`w-11 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    form.schedule_days.includes(d.key)
                      ? isDark ? 'border-primary-500 bg-primary-500/15 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                      : isDark ? 'border-dark-700 text-dark-400 hover:border-dark-600' : 'border-dark-200 text-dark-500 hover:border-dark-300'
                  }`}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Class Start Time</label>
              <input type="time" value={form.start_time} onChange={(e) => handleChange('start_time', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Class End Time</label>
              <input type="time" value={form.end_time} onChange={(e) => handleChange('end_time', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${inputClass}`} />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Status</label>
            <div className="flex gap-2">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => handleChange('status', key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form.status === key
                      ? isDark ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                      : isDark ? 'border-dark-700 text-dark-400' : 'border-dark-200 text-dark-500'
                  }`}>{cfg.label}</button>
              ))}
            </div>
          </div>
          {formError && <p className="text-xs font-medium text-rose-500">{formError}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
            >Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-lg shadow-primary-500/25 transition-all"
            >{batch ? 'Save Changes' : 'Create Batch'}</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
