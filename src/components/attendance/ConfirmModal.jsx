import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// Shared confirm dialog for bulk attendance actions (flat table + batch
// drill-down view) — same "Mark All Present" confirmation in both places.
export default function ConfirmModal({ title, body, confirmLabel, isDark, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl p-6 ${isDark ? 'bg-dark-900 border border-dark-700' : 'bg-white border border-dark-200'}`}>
        <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>{title}</h3>
        <p className={`text-sm mb-5 ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>{body}</p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={busy}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'text-dark-300 hover:bg-dark-800' : 'text-dark-600 hover:bg-dark-100'}`}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
