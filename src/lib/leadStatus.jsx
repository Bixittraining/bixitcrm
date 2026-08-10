import {
  UserPlus, MessageSquare, UserCheck, Users, Package, Clock,
  TrendingUp, GraduationCap, UserX, Moon,
} from 'lucide-react'

// Single source of truth for the lead lifecycle — Leads.jsx and
// Pipeline.jsx previously each hardcoded their own separate label/color
// list (Pipeline's even used a different label for "new" — "Inquiry" vs
// "New"). Both now derive from this instead of drifting independently.
//
// Existing DB values (new/contacted/qualified/negotiation/enrolled/lost)
// are unchanged and stay exactly where they were in the lifecycle —
// this only inserts new stages between them and adds one closed state
// (nurture). No existing lead's status value changes meaning.
export const LEAD_STATUSES = {
  new: { label: 'New', color: 'sky', icon: UserPlus, order: 0, active: true },
  contacted: { label: 'Contacted', color: 'accent', icon: MessageSquare, order: 1, active: true },
  qualified: { label: 'Qualified', color: 'emerald', icon: UserCheck, order: 2, active: true },
  counselling: { label: 'Counselling', color: 'indigo', icon: Users, order: 3, active: true },
  package_shared: { label: 'Package Shared', color: 'cyan', icon: Package, order: 4, active: true },
  follow_up: { label: 'Follow-up', color: 'amber', icon: Clock, order: 5, active: true },
  negotiation: { label: 'Negotiation', color: 'violet', icon: TrendingUp, order: 6, active: true },
  enrolled: { label: 'Enrolled', color: 'primary', icon: GraduationCap, order: 7, active: true, terminal: true },
  lost: { label: 'Lost', color: 'rose', icon: UserX, order: 8, active: false, terminal: true },
  nurture: { label: 'Nurture', color: 'slate', icon: Moon, order: 9, active: false, terminal: false },
}

// The active pipeline — what shows as Kanban columns and the lifecycle
// stepper. Lost/Nurture are deliberately excluded — they're closed/
// alternative outcomes, not stages a lead moves forward through.
export const PIPELINE_STAGE_KEYS = Object.entries(LEAD_STATUSES)
  .filter(([, v]) => v.active)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([k]) => k)

// Every value the status dropdown offers, in lifecycle order, active
// stages first then closed/alternative states.
export const ALL_STATUS_KEYS = [...PIPELINE_STAGE_KEYS, 'lost', 'nurture']

export function statusLabel(key) { return LEAD_STATUSES[key]?.label || key }
export function statusColor(key) { return LEAD_STATUSES[key]?.color || 'sky' }
export function statusIcon(key) { return LEAD_STATUSES[key]?.icon }
export function statusOrder(key) { return LEAD_STATUSES[key]?.order ?? 999 }
export function isPipelineStage(key) { return !!LEAD_STATUSES[key]?.active }
