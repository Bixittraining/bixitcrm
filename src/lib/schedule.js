// Single source of truth for "is a class actually scheduled on this date"
// — used by attendance marking (DataContext), the Class Schedule view, and
// future CLASS_* automation events, so the definition never drifts between
// them. Batch fields reused as-is (schedule_days, start_date, end_date) —
// no new schedule table, this was already real batch data.

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Whether `batch` runs a class on `dateStr` (YYYY-MM-DD).
 * Returns null (not false) when the batch has no schedule_days configured
 * at all — "unknown", not "no class", since we genuinely can't tell.
 */
export function isClassScheduledOn(batch, dateStr) {
  if (!batch?.schedule_days?.length) return null
  if (batch.start_date && dateStr < batch.start_date) return false
  if (batch.end_date && dateStr > batch.end_date) return false
  const weekday = DAY_ABBR[new Date(dateStr).getDay()]
  return batch.schedule_days.includes(weekday)
}

/** Human-readable "Mon, Wed, Fri" from a batch's schedule_days. */
export function formatClassDays(batch) {
  return batch?.schedule_days?.length ? batch.schedule_days.join(', ') : 'Not set'
}

/** "6:00 PM - 8:00 PM" from a batch's start_time/end_time (HH:MM 24h). */
export function formatClassTime(batch) {
  if (!batch?.start_time || !batch?.end_time) return 'Not set'
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${fmt(batch.start_time)} - ${fmt(batch.end_time)}`
}
