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

  if (email) {
    const { data: existing, error: lookupError } = await admin
      .from('leads')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (lookupError) return { error: lookupError.message }
    if (existing) return { data: existing, duplicate: true }
  }

  const lead = {
    name,
    email: email || null,
    phone: phone || null,
    course: course || 'General Inquiry',
    source,
    status: 'new',
    priority,
    date: todayISODate(),
    notes: notes || '',
    avatar: avatarFromName(name),
  }

  const { data, error } = await admin.from('leads').insert(lead).select().single()
  if (error) return { error: error.message }
  return { data }
}
