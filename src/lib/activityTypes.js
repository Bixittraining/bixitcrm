// Single source of truth for the Lead Timeline's activity types — the icon,
// label, and filter bucket for every kind of entry the timeline can show.
// Both DataContext (which stamps activity_type when it writes an entry) and
// the Timeline UI (which reads it back to render/filter) import from here,
// so the two can never drift apart.

export const ACTIVITY_TYPES = {
  LEAD_CREATED: { label: 'Lead Created', icon: '🆕', bucket: null },
  LEAD_ASSIGNED: { label: 'Lead Assigned', icon: '👤', bucket: null },
  STATUS_CHANGED: { label: 'Status Changed', icon: '🔄', bucket: 'status' },
  CALL: { label: 'Call', icon: '📞', bucket: 'calls' },
  WHATSAPP: { label: 'WhatsApp', icon: '💬', bucket: 'messages' },
  EMAIL: { label: 'Email', icon: '✉️', bucket: 'messages' },
  FOLLOWUP_CREATED: { label: 'Follow-up Scheduled', icon: '📅', bucket: 'followups' },
  FOLLOWUP_COMPLETED: { label: 'Follow-up Completed', icon: '✅', bucket: 'followups' },
  FOLLOWUP_CANCELLED: { label: 'Follow-up Cancelled', icon: '🚫', bucket: 'followups' },
  MEETING_SCHEDULED: { label: 'Meeting Scheduled', icon: '📅', bucket: 'meetings' },
  MEETING_COMPLETED: { label: 'Meeting Completed', icon: '✅', bucket: 'meetings' },
  MEETING_CANCELLED: { label: 'Meeting Cancelled', icon: '🚫', bucket: 'meetings' },
  MEETING_NO_SHOW: { label: 'Meeting No Show', icon: '⚠️', bucket: 'meetings' },
  PACKAGE_SHARED: { label: 'Package Shared', icon: '📦', bucket: null },
  FEE_BILL_CREATED: { label: 'Fee Bill Created', icon: '🧾', bucket: 'payments' },
  PAYMENT_RECEIVED: { label: 'Payment Received', icon: '💰', bucket: 'payments' },
  NOTE_ADDED: { label: 'Note Added', icon: '📝', bucket: 'notes' },
  LEAD_ENROLLED: { label: 'Lead Enrolled', icon: '🎓', bucket: 'status' },
  LEAD_LOST: { label: 'Lead Lost', icon: '❌', bucket: 'status' },
  LEAD_REOPENED: { label: 'Lead Reopened', icon: '♻️', bucket: 'status' },
  AUTOMATION: { label: 'Automation', icon: '⚡', bucket: null },
}

// bucket: null types (Lead Created/Assigned/Package Shared) still show
// under "All" — they just don't belong to one of the specific filter tabs.
export const TIMELINE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'calls', label: 'Calls' },
  { key: 'messages', label: 'Messages' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'payments', label: 'Payments' },
  { key: 'status', label: 'Status Changes' },
  { key: 'notes', label: 'Notes' },
]

export function activityTypeInfo(type) {
  return ACTIVITY_TYPES[type] || { label: 'Activity', icon: '•', bucket: null }
}

// A short, human "when" phrase for a follow-up/meeting date+time, used to
// keep timeline descriptions readable ("Tomorrow at 10:00 AM") instead of
// a raw ISO date. Computed once at the moment the entry is written, so it
// reads relative to when the event happened — same convention as any other
// frozen timeline text.
export function relativeDayAt(dateStr, timeStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(`${dateStr}T00:00:00`)
  const diffDays = Math.round((d - today) / 86400000)
  const dayLabel = diffDays === 0 ? 'Today'
    : diffDays === 1 ? 'Tomorrow'
    : diffDays === -1 ? 'Yesterday'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  return timeStr ? `${dayLabel} at ${timeStr}` : dayLabel
}

// Day-group label for the timeline's "Today / Yesterday / 12 Aug" headers.
export function dayGroupLabel(dateObj) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateObj); d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((d - today) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
