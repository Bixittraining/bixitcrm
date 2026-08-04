import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Plane, ChevronLeft, AlertCircle, Pencil } from 'lucide-react'

const STATUS_STYLE = {
  present: { label: 'Present', icon: Check, activeBg: 'bg-emerald-500', dotBg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', chip: { light: 'bg-emerald-50 text-emerald-600', dark: 'bg-emerald-500/15 text-emerald-400' }, summary: { light: 'bg-emerald-50', dark: 'bg-emerald-500/10' }, text: 'text-emerald-500' },
  absent: { label: 'Absent', icon: X, activeBg: 'bg-rose-500', dotBg: 'bg-rose-500', hover: 'hover:bg-rose-600', chip: { light: 'bg-rose-50 text-rose-600', dark: 'bg-rose-500/15 text-rose-400' }, summary: { light: 'bg-rose-50', dark: 'bg-rose-500/10' }, text: 'text-rose-500' },
  leave: { label: 'Leave', icon: Plane, activeBg: 'bg-amber-500', dotBg: 'bg-amber-500', hover: 'hover:bg-amber-600', chip: { light: 'bg-amber-50 text-amber-600', dark: 'bg-amber-500/15 text-amber-400' }, summary: { light: 'bg-amber-50', dark: 'bg-amber-500/10' }, text: 'text-amber-500' },
}

// One-at-a-time card-based attendance marking, shared between student
// attendance (Batch Detail / Attendance page) and staff attendance
// (Attendance page) — same interaction, different roster + status set.
//
// `records` must already be normalized to a common shape:
// [{ personId, status, marked_at | created_at }] for the given `date`.
// `roster` is [{ id, name, avatar? }]. `onMark(personId, status)` must
// return a boolean (or Promise<boolean>) indicating whether the save
// succeeded, so the UI can hold position on failure instead of advancing.
export default function AttendanceRegister({
  roster, records, date, onMark, isDark, statusKeys = ['present', 'absent'], contextKey,
}) {
  const [cardIndex, setCardIndex] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [editingSingle, setEditingSingle] = useState(false)
  const [markError, setMarkError] = useState(false)

  useEffect(() => {
    if (!roster.length) return
    const firstUnmarked = roster.findIndex((p) => !records.some((r) => r.personId === p.id))
    setEditingSingle(false)
    setMarkError(false)
    if (firstUnmarked === -1) {
      setShowSummary(true)
      setCardIndex(0)
    } else {
      setShowSummary(false)
      setCardIndex(firstUnmarked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, roster.length, contextKey])

  const handleMarkAndAdvance = async (personId, status) => {
    setMarkError(false)
    const ok = await onMark(personId, status)
    if (!ok) { setMarkError(true); return }
    if (editingSingle) {
      setEditingSingle(false)
      setShowSummary(true)
      return
    }
    if (cardIndex + 1 < roster.length) setCardIndex((i) => i + 1)
    else setShowSummary(true)
  }

  const handleEdit = (index) => {
    setCardIndex(index)
    setEditingSingle(true)
    setShowSummary(false)
    setMarkError(false)
  }

  if (!roster.length) {
    return (
      <p className={`text-sm text-center py-10 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Nobody to mark attendance for yet.</p>
    )
  }

  if (showSummary) {
    const counts = Object.fromEntries(statusKeys.map((k) => [k, records.filter((r) => r.status === k).length]))
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`grid gap-3 mb-5`} style={{ gridTemplateColumns: `repeat(${statusKeys.length + 1}, minmax(0, 1fr))` }}>
          <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
            <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{records.length}/{roster.length}</p>
            <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>Marked</p>
          </div>
          {statusKeys.map((k) => (
            <div key={k} className={`rounded-xl p-3 text-center ${isDark ? STATUS_STYLE[k].summary.dark : STATUS_STYLE[k].summary.light}`}>
              <p className={`text-lg font-bold ${STATUS_STYLE[k].text}`}>{counts[k]}</p>
              <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>{STATUS_STYLE[k].label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {roster.map((p, i) => {
            const record = records.find((r) => r.personId === p.id)
            return (
              <div key={p.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br from-primary-500 to-violet-500">
                    {p.avatar || p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{p.name}</p>
                    {record && (
                      <p className={`text-[11px] ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                        {new Date(record.marked_at || record.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {record ? (
                    <span className={`px-2 py-1 rounded-md text-[11px] font-semibold ${isDark ? STATUS_STYLE[record.status].chip.dark : STATUS_STYLE[record.status].chip.light}`}>
                      {STATUS_STYLE[record.status].label}
                    </span>
                  ) : (
                    <span className={`px-2 py-1 rounded-md text-[11px] font-medium ${isDark ? 'bg-dark-700 text-dark-400' : 'bg-dark-200 text-dark-500'}`}>Not marked</span>
                  )}
                  <button onClick={() => handleEdit(i)} title="Update this mark"
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:bg-dark-700 hover:text-white' : 'text-dark-400 hover:bg-dark-100 hover:text-dark-700'}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  const person = roster[cardIndex]
  const existing = person ? records.find((r) => r.personId === person.id) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-medium ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
          {editingSingle ? 'Editing attendance' : `Marking ${cardIndex + 1} of ${roster.length}`}
        </p>
        {!editingSingle && cardIndex > 0 && (
          <button onClick={() => setCardIndex((i) => Math.max(0, i - 1))}
            className={`inline-flex items-center gap-1 text-xs font-medium ${isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
            <ChevronLeft className="w-3.5 h-3.5" />Back
          </button>
        )}
      </div>
      {!editingSingle && (
        <div className={`h-1.5 rounded-full overflow-hidden mb-5 ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500"
            animate={{ width: `${(cardIndex / roster.length) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {person && (
          <motion.div
            key={person.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`rounded-xl p-6 text-center ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}
          >
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-primary-500 to-violet-500 mb-3">
              {person.avatar || person.name.slice(0, 2).toUpperCase()}
            </div>
            <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{person.name}</p>
            {existing && (
              <p className={`text-xs mt-1 ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>
                Currently marked {STATUS_STYLE[existing.status].label} at{' '}
                {new Date(existing.marked_at || existing.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — tap to update
              </p>
            )}
            <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
              {statusKeys.map((k) => {
                const s = STATUS_STYLE[k]
                const Icon = s.icon
                return (
                  <button
                    key={k}
                    onClick={() => handleMarkAndAdvance(person.id, k)}
                    className={`flex-1 max-w-[160px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors ${s.activeBg} ${s.hover}`}
                  >
                    <Icon className="w-4 h-4" />{s.label}
                  </button>
                )
              })}
            </div>
            {markError && (
              <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500 mt-3">
                <AlertCircle className="w-3.5 h-3.5" />Couldn't save — check connection and tap again
              </p>
            )}
            {editingSingle && (
              <button onClick={() => { setEditingSingle(false); setShowSummary(true) }}
                className={`text-xs font-medium mt-4 ${isDark ? 'text-dark-400 hover:text-dark-200' : 'text-dark-500 hover:text-dark-700'}`}>
                Cancel
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
