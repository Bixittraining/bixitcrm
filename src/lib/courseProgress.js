// Single source of truth for Course Module <-> Student Progress business
// rules — status/percent consistency, overall-progress calculation, and
// current/next-module derivation. Used by DataContext (server writes) and
// StudentDetail/PackageDetail (display) so the two can never disagree.

export const MODULE_STATUSES = {
  not_started: { label: 'Not Started', color: 'dark' },
  in_progress: { label: 'In Progress', color: 'primary' },
  completed: { label: 'Completed', color: 'emerald' },
  on_hold: { label: 'On Hold', color: 'amber' },
}
export const ALL_MODULE_STATUS_KEYS = Object.keys(MODULE_STATUSES)
export function moduleStatusLabel(key) { return MODULE_STATUSES[key]?.label || key }

/**
 * Keeps status and percent logically consistent, exactly per spec:
 * 100% -> Completed, 0% -> Not Started, 1-99% -> In Progress (unless the
 * caller explicitly chose On Hold, which is percent-independent).
 * Call with whichever of {status, percent} the user actually changed;
 * the other is derived unless it was also explicitly provided.
 */
export function reconcileStatusAndPercent({ status, percent }, previous) {
  let nextPercent = percent != null ? percent : previous?.percent ?? 0
  let nextStatus = status != null ? status : previous?.status ?? 'not_started'

  if (percent != null && status == null) {
    // Percent changed, status wasn't explicitly chosen — derive it.
    if (nextPercent >= 100) { nextPercent = 100; nextStatus = 'completed' }
    else if (nextPercent <= 0) { nextPercent = 0; nextStatus = 'not_started' }
    else nextStatus = 'in_progress'
  } else if (status != null) {
    // Status changed explicitly — snap percent to match, except On Hold
    // which keeps whatever percent it already had (it's a pause, not a
    // percentage statement).
    if (nextStatus === 'completed') nextPercent = 100
    else if (nextStatus === 'not_started') nextPercent = 0
    else if (nextStatus === 'in_progress' && (nextPercent <= 0 || nextPercent >= 100)) nextPercent = nextPercent >= 100 ? 99 : 1
  }
  return { status: nextStatus, percent: nextPercent }
}

/** Average of module percentages — the documented default calculation. */
export function calcOverallProgress(progressRows) {
  if (!progressRows.length) return null
  return Math.round(progressRows.reduce((sum, r) => sum + r.percent, 0) / progressRows.length)
}

/**
 * The module a trainer should look at next: the first in-progress module
 * (by course order), else the first not-started one, else null if
 * everything is completed/on-hold.
 */
export function currentModuleFor(orderedModules, progressByModuleId) {
  const inProgress = orderedModules.find((m) => progressByModuleId.get(m.id)?.status === 'in_progress')
  if (inProgress) return inProgress
  return orderedModules.find((m) => (progressByModuleId.get(m.id)?.status || 'not_started') === 'not_started') || null
}

export function nextModuleAfter(orderedModules, currentModule) {
  if (!currentModule) return null
  const idx = orderedModules.findIndex((m) => m.id === currentModule.id)
  return idx >= 0 && idx + 1 < orderedModules.length ? orderedModules[idx + 1] : null
}
