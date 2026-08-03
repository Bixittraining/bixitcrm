import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'

// Real email send (Gmail SMTP, configured under Settings > Integrations)
// replacing mailto: links across the app — those only opened the user's
// own local mail client and left zero record in the CRM. This sends for
// real and logs the result to email_messages, so it shows up in the
// lead/student's Email History the same way WhatsApp messages do.
export default function SendEmailModal({ to, subject: initialSubject, body: initialBody, leadId, studentId, isDark, onClose, onSent }) {
  const { sendEmail } = useData()
  const [subject, setSubject] = useState(initialSubject || '')
  const [body, setBody] = useState(initialBody || '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    setError('')
    const result = await sendEmail({ to, subject: subject.trim(), body: body.trim(), leadId, studentId })
    setSending(false)
    if (result.error) { setError(result.error); return }
    onSent?.()
    onClose()
  }

  const inputCls = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-all ${
    isDark ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500' : 'bg-white border-dark-200 text-dark-900 placeholder-dark-400'
  }`

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
      <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>
            <Mail className="w-5 h-5" />Send Email
          </h2>
          <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}><X className="w-5 h-5" /></motion.button>
        </div>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>To</label>
            <p className={`text-sm px-3 py-2 rounded-lg ${isDark ? 'bg-dark-800/60 text-dark-300' : 'bg-dark-50 text-dark-600'}`}>{to}</p>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Subject</label>
            <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>Message</label>
            <textarea rows={8} required value={body} onChange={(e) => setBody(e.target.value)} className={`${inputCls} resize-none`} />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-rose-500"><AlertCircle className="w-3.5 h-3.5" />{error}</p>
          )}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className={`px-4 py-2.5 rounded-lg text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
            <button type="submit" disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/25 disabled:opacity-60">
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
