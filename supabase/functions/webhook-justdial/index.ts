import {
  getAdminClient,
  getIntegrationConfig,
  insertLead,
  json,
  logAudit,
  markIntegrationStatus,
  timingSafeEqualStr,
} from '../_shared/lib.ts'

// JustDial has no published webhook spec, so this accepts a generic JSON
// lead payload (e.g. relayed via Zapier/Make/Pabbly, or a custom script
// polling JustDial's business dashboard) and normalizes common field-name
// variants. Requests are authenticated with a shared secret rather than a
// per-integration URL slug, since a secret can't leak through server logs
// or the referrer header the way a URL-embedded token can.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'justdial')
  if (configError) return json({ error: configError }, 500)
  if (!integration.webhook_verify_token) {
    return json({ error: 'JustDial integration is not configured yet' }, 500)
  }

  const providedSecret = req.headers.get('x-webhook-secret')
  if (!providedSecret || !timingSafeEqualStr(providedSecret, integration.webhook_verify_token)) {
    await logAudit(admin, 'justdial', 'Webhook secret check', 'Rejected a POST with an invalid X-Webhook-Secret header', 'failed')
    return json({ error: 'Invalid or missing X-Webhook-Secret header' }, 401)
  }

  // deno-lint-ignore no-explicit-any
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // fall through with empty body
  }
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
    return json({ error: outcome.error }, 400)
  }

  await logAudit(
    admin,
    'justdial',
    outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
    name || 'Unnamed lead',
    'success'
  )
  await markIntegrationStatus(admin, 'justdial', { status: 'connected' })

  return json({ success: true, duplicate: !!outcome.duplicate })
})
