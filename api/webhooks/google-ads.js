import { getAdminClient, getIntegrationConfig, insertLead, logAudit, markIntegrationStatus, timingSafeEqualStr } from './_lib.js'

// Google's Lead Form webhook payload shape:
// https://developers.google.com/google-ads/webhook/docs/implementation
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    res.status(500).json({ message: err.message })
    return
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'google_ads')
  if (configError) {
    res.status(500).json({ message: configError })
    return
  }
  if (!integration.webhook_verify_token) {
    res.status(500).json({ message: 'Google Ads integration is not configured yet' })
    return
  }

  const body = req.body || {}
  const { google_key: googleKey, lead_id: leadId, user_column_data: userColumnData, is_test: isTest, lead_source: leadSource } = body

  if (!googleKey || !timingSafeEqualStr(googleKey, integration.webhook_verify_token)) {
    await logAudit(admin, 'google_ads', 'Webhook key check', `Rejected a POST with an invalid google_key (lead_id: ${leadId || 'n/a'})`, 'failed')
    res.status(401).json({ message: 'Invalid google_key' })
    return
  }

  if (isTest) {
    // Google sends a test submission when the advertiser clicks "Test lead"
    // in the UI — ack it without writing a lead.
    await logAudit(admin, 'google_ads', 'Test lead received', `lead_id: ${leadId || 'n/a'}`, 'success')
    await markIntegrationStatus(admin, 'google_ads', { status: 'connected' })
    res.status(200).json({})
    return
  }

  const fields = {}
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
    res.status(400).json({ message: outcome.error })
    return
  }

  await logAudit(
    admin,
    'google_ads',
    outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
    `${name || 'Unnamed lead'} (lead_id: ${leadId || 'n/a'})`,
    'success'
  )
  await markIntegrationStatus(admin, 'google_ads', { status: 'connected' })

  res.status(200).json({})
}
