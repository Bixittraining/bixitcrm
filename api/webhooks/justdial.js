import { getAdminClient, getIntegrationConfig, insertLead, logAudit, markIntegrationStatus, timingSafeEqualStr } from './_lib.js'

// JustDial has no published webhook spec, so this accepts a generic JSON
// lead payload (e.g. relayed via Zapier/Make/Pabbly, or a custom script
// polling JustDial's business dashboard) and normalizes common field-name
// variants. Requests are authenticated with a shared secret rather than a
// per-integration URL slug, since a secret can't leak through server logs
// or the referrer header the way a URL-embedded token can.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    res.status(500).json({ error: err.message })
    return
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'justdial')
  if (configError) {
    res.status(500).json({ error: configError })
    return
  }
  if (!integration.webhook_verify_token) {
    res.status(500).json({ error: 'JustDial integration is not configured yet' })
    return
  }

  const providedSecret = req.headers['x-webhook-secret']
  if (!providedSecret || !timingSafeEqualStr(providedSecret, integration.webhook_verify_token)) {
    await logAudit(admin, 'justdial', 'Webhook secret check', 'Rejected a POST with an invalid X-Webhook-Secret header', 'failed')
    res.status(401).json({ error: 'Invalid or missing X-Webhook-Secret header' })
    return
  }

  const body = req.body || {}
  const name = body.name || body.full_name || body.customer_name || body.contact_name
  const email = body.email || body.email_id
  const phone = body.phone || body.mobile || body.contact_no || body.phone_number
  const course = body.course || body.category || body.enquiry_for
  const notes = body.message || body.notes || body.enquiry_details || ''

  const outcome = await insertLead(admin, {
    name,
    email,
    phone,
    course,
    source: 'JustDial',
    notes: notes ? `JustDial enquiry: ${notes}` : 'Imported from JustDial',
  })

  if (outcome.error) {
    await logAudit(admin, 'justdial', 'Lead import failed', outcome.error, 'failed')
    await markIntegrationStatus(admin, 'justdial', { status: 'error', lastError: outcome.error })
    res.status(400).json({ error: outcome.error })
    return
  }

  await logAudit(
    admin,
    'justdial',
    outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
    name || 'Unnamed lead',
    'success'
  )
  await markIntegrationStatus(admin, 'justdial', { status: 'connected' })

  res.status(200).json({ success: true, duplicate: !!outcome.duplicate })
}
