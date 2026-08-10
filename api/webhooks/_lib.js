import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export function getAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server is not configured (missing SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function avatarFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

// Constant-time string comparison so secret/signature checks don't leak
// timing information about how many leading bytes matched.
export function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a ?? ''))
  const bufB = Buffer.from(String(b ?? ''))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

// Verifies the caller's bearer token against Supabase Auth — any logged-in
// team member, not just admins (used by api/whatsapp/send, where anyone on
// the team should be able to reply to a conversation).
export async function requireAuth(req, admin) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return { error: 'Missing authorization token', status: 401 }

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { error: 'Invalid session', status: 401 }

  return { user: data.user }
}

// Reads one row of api/integrations config (App ID/secret, page/phone id,
// access token, verify token) that admins set from the Settings UI.
export async function getIntegrationConfig(admin, key) {
  const { data, error } = await admin.from('integrations').select('*').eq('key', key).single()
  if (error) return { error: error.message }
  return { data }
}

export async function logAudit(admin, key, action, detail, status = 'success') {
  const { error } = await admin.from('integration_audit_log').insert({
    integration_key: key,
    action,
    detail,
    status,
  })
  if (error) console.error('logAudit error', error)
}

export async function markIntegrationStatus(admin, key, { status, lastError = null }) {
  const { error } = await admin
    .from('integrations')
    .update({ status, last_error: lastError, last_synced_at: new Date().toISOString() })
    .eq('key', key)
  if (error) console.error('markIntegrationStatus error', error)
}

// Inserts a lead, skipping if an entry with the same email already exists
// so retried webhook deliveries (Meta/Google both retry on failure) don't
// create duplicate leads.
export async function insertLead(admin, { name, email, phone, course, source, notes, priority = 'medium' }) {
  if (!name || (!email && !phone)) {
    return { error: 'Lead requires a name and at least an email or phone' }
  }

  // Meta/Google/JustDial/WhatsApp leads usually carry a phone number with
  // no email at all, so an email-only duplicate check misses the exact
  // case that matters most here — the same phone number submitting again
  // (e.g. clicking the same ad twice) was silently creating a second lead
  // row instead of being recognized as the existing one.
  if (email) {
    const { data: existing, error: lookupError } = await admin
      .from('leads')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (lookupError) return { error: lookupError.message }
    if (existing) return { data: existing, duplicate: true }
  }
  if (phone) {
    const { data: existing, error: lookupError } = await admin
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()
    if (lookupError) return { error: lookupError.message }
    if (existing) return { data: existing, duplicate: true }
  }

  // Not a duplicate lead, but this phone/email might already belong to an
  // enrolled student inquiring about a different course — that's a real,
  // legitimate new lead (don't block it), but staff should see the
  // context immediately rather than treating them as a first-time
  // contact. Matched by email first (more reliable), phone as fallback.
  let existingStudentNote = ''
  const studentMatch = email
    ? (await admin.from('students').select('name,course').eq('email', email).maybeSingle()).data
    : phone
      ? (await admin.from('students').select('name,course').eq('phone', phone).maybeSingle()).data
      : null
  if (studentMatch) {
    existingStudentNote = `⚠ Existing student — already enrolled in ${studentMatch.course}. This inquiry is for a different course.\n\n`
  }

  // Webhook leads have no "creating user" to fall back on, so round-robin
  // assignment is the only way they don't all pile up Unassigned.
  const { data: assignedTo } = await admin.rpc('assign_next_sales_rep')

  const lead = {
    name,
    email: email || null,
    phone: phone || null,
    course: course || 'General Inquiry',
    source,
    status: 'new',
    priority,
    date: todayISODate(),
    notes: existingStudentNote + (notes || ''),
    avatar: avatarFromName(name),
    assigned_to: assignedTo || null,
  }

  const { data, error } = await admin.from('leads').insert(lead).select().single()
  if (error) return { error: error.message }
  return { data }
}
