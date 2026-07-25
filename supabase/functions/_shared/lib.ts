import { createClient } from 'npm:@supabase/supabase-js@2'
import { timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
// Edge Function's environment by the Supabase platform — no manual secrets
// setup needed for these two.
export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server is not configured (missing SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function avatarFromName(name?: string) {
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
export function timingSafeEqualStr(a?: string | null, b?: string | null) {
  const bufA = Buffer.from(String(a ?? ''))
  const bufB = Buffer.from(String(b ?? ''))
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// deno-lint-ignore no-explicit-any
export async function getIntegrationConfig(admin: any, key: string) {
  const { data, error } = await admin.from('integrations').select('*').eq('key', key).single()
  if (error) return { error: error.message }
  return { data }
}

// deno-lint-ignore no-explicit-any
export async function logAudit(admin: any, key: string, action: string, detail: string, status = 'success') {
  const { error } = await admin.from('integration_audit_log').insert({
    integration_key: key,
    action,
    detail,
    status,
  })
  if (error) console.error('logAudit error', error)
}

export async function markIntegrationStatus(
  // deno-lint-ignore no-explicit-any
  admin: any,
  key: string,
  { status, lastError = null }: { status: string; lastError?: string | null }
) {
  const { error } = await admin
    .from('integrations')
    .update({ status, last_error: lastError, last_synced_at: new Date().toISOString() })
    .eq('key', key)
  if (error) console.error('markIntegrationStatus error', error)
}

// Inserts a lead, skipping if an entry with the same email already exists
// so retried webhook deliveries (Meta/Google both retry on failure) don't
// create duplicate leads.
export async function insertLead(
  // deno-lint-ignore no-explicit-any
  admin: any,
  { name, email, phone, course, source, notes, priority = 'medium' }: {
    name?: string
    email?: string | null
    phone?: string | null
    course?: string | null
    source: string
    notes?: string
    priority?: string
  }
) {
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

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
