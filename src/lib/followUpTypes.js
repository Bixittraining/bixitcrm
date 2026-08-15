// Single source of truth for what a Follow-up "type" (the action a sales
// executive needs to perform) is called and how it's drawn — Leads.jsx and
// FollowUps.jsx previously each kept their own separate label/icon list
// (and disagreed: one called the meeting type "Meeting", the other's
// Next Action card called it "Counselling"). Both now import this instead.
//
// `key` is the literal value stored in follow_ups.type (a free-text
// column, no DB constraint) — 'meeting' is kept as the stored value for
// Counselling rather than renamed, since it's already referenced by name
// across Next Action, Pipeline, the Meeting tab, and automation events;
// renaming it would be a data migration for zero functional gain.
//
// 'email' is kept only so historical records still render correctly — it
// is deliberately not offered as a choice when creating a new follow-up
// (not one of the seven action types the Follow-up module is scoped to).
import { PhoneCall, MessageCircle, Video, Package, IndianRupee, FileCheck, ListTodo, Mail } from 'lucide-react'

export const FOLLOWUP_TYPES = {
  call: { key: 'call', label: 'Call', icon: PhoneCall, color: 'sky' },
  whatsapp: { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'emerald' },
  meeting: { key: 'meeting', label: 'Counselling', icon: Video, color: 'violet' },
  package: { key: 'package', label: 'Package Follow-up', icon: Package, color: 'cyan' },
  payment: { key: 'payment', label: 'Payment Follow-up', icon: IndianRupee, color: 'amber' },
  document: { key: 'document', label: 'Document Collection', icon: FileCheck, color: 'indigo' },
  general: { key: 'general', label: 'General Follow-up', icon: ListTodo, color: 'slate' },
  // Legacy — not offered in the type picker, only for display of old data.
  email: { key: 'email', label: 'Email', icon: Mail, color: 'primary' },
}

// The seven action types the spec scopes the Follow-up module to — the
// only ones offered when creating/rescheduling a follow-up. `email` is
// excluded on purpose (see note above).
export const CREATABLE_FOLLOWUP_TYPES = ['call', 'whatsapp', 'meeting', 'package', 'payment', 'document', 'general']

export function followUpTypeInfo(type) {
  return FOLLOWUP_TYPES[type] || FOLLOWUP_TYPES.general
}
export function followUpTypeLabel(type) {
  return followUpTypeInfo(type).label
}
