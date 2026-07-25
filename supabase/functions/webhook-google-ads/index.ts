import {
  getAdminClient,
  getIntegrationConfig,
  insertLead,
  json,
  logAudit,
  markIntegrationStatus,
  timingSafeEqualStr,
} from '../_shared/lib.ts'

// Google's Lead Form webhook payload shape:
// https://developers.google.com/google-ads/webhook/docs/implementation
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405)

  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    return json({ message: (err as Error).message }, 500)
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'google_ads')
  if (configError) return json({ message: configError }, 500)
  if (!integration.webhook_verify_token) {
    return json({ message: 'Google Ads integration is not configured yet' }, 500)
  }

  // deno-lint-ignore no-explicit-any
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // fall through with empty body
  }
  const { google_key: googleKey, lead_id: leadId, user_column_data: userColumnData, is_test: isTest, lead_source: leadSource } = body

  if (!googleKey || !timingSafeEqualStr(googleKey, integration.webhook_verify_token)) {
    await logAudit(admin, 'google_ads', 'Webhook key check', `Rejected a POST with an invalid google_key (lead_id: ${leadId || 'n/a'})`, 'failed')
    return json({ message: 'Invalid google_key' }, 401)
  }

  if (isTest) {
    // Google sends a test submission when the advertiser clicks "Test lead"
    // in the UI — ack it without writing a lead.
    await logAudit(admin, 'google_ads', 'Test lead received', `lead_id: ${leadId || 'n/a'}`, 'success')
    await markIntegrationStatus(admin, 'google_ads', { status: 'connected' })
    return json({})
  }

  // deno-lint-ignore no-explicit-any
  const fields: Record<string, any> = {}
  for (const col of userColumnData || []) {
    if (col.column_name) fields[col.column_name.toUpperCase()] = col.string_value
  }
  const name = fields.FULL_NAME || [fields.FIRST_NAME, fields.LAST_NAME].filter(Boolean).join(' ')
  const email = fields.EMAIL
  const phone = fields.PHONE_NUMBER

  const outcome = await insertLead(admin, {
    name,
    email,
    phone,
    course: 'General Inquiry',
    source: leadSource === 'SEARCH' ? 'Google Ads (Search)' : 'Google Ads',
    notes: `Imported from Google Ads lead form (lead_id: ${leadId || 'n/a'})`,
  })

  if (outcome.error) {
    await logAudit(admin, 'google_ads', 'Lead import failed', `lead_id ${leadId || 'n/a'}: ${outcome.error}`, 'failed')
    await markIntegrationStatus(admin, 'google_ads', { status: 'error', lastError: outcome.error })
    return json({ message: outcome.error }, 400)
  }

  await logAudit(
    admin,
    'google_ads',
    outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
    `${name || 'Unnamed lead'} (lead_id: ${leadId || 'n/a'})`,
    'success'
  )
  await markIntegrationStatus(admin, 'google_ads', { status: 'connected' })

  return json({})
})
