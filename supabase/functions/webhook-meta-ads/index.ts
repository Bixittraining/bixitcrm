import { createHmac } from 'node:crypto'
import {
  getAdminClient,
  getIntegrationConfig,
  insertLead,
  json,
  logAudit,
  markIntegrationStatus,
  timingSafeEqualStr,
} from '../_shared/lib.ts'

const GRAPH_API_VERSION = 'v21.0'

Deno.serve(async (req) => {
  const url = new URL(req.url)

  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'meta_ads')
  if (configError) return json({ error: configError }, 500)

  // Meta calls this once, with GET, to verify you control the endpoint
  // before it will start sending POST notifications.
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && integration.webhook_verify_token && timingSafeEqualStr(token, integration.webhook_verify_token)) {
      return new Response(challenge, { status: 200 })
    }
    return json({ error: 'Verification failed' }, 403)
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!integration.app_secret || !integration.page_access_token) {
    return json({ error: 'Meta Ads integration is not configured yet' }, 500)
  }

  const rawBody = new Uint8Array(await req.arrayBuffer())

  const signatureHeader = req.headers.get('x-hub-signature-256')
  if (!signatureHeader) return json({ error: 'Missing signature' }, 401)

  const expectedSignature = `sha256=${createHmac('sha256', integration.app_secret).update(rawBody).digest('hex')}`
  if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
    await logAudit(admin, 'meta_ads', 'Webhook signature check', 'Rejected a POST with an invalid X-Hub-Signature-256', 'failed')
    return json({ error: 'Invalid signature' }, 401)
  }

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody))
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const results = []
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue
      const { leadgen_id: leadgenId, form_id: formId, ad_id: adId } = change.value || {}
      if (!leadgenId) continue

      try {
        // form_name is not a field on the leadgen object itself (only
        // ad_name/campaign_name are) — the form's name has to come from a
        // separate lookup on form_id.
        const graphRes = await fetch(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=field_data,ad_name&access_token=${integration.page_access_token}`
        )
        const leadData = await graphRes.json()
        if (leadData.error) {
          results.push({ leadgenId, error: leadData.error.message })
          await logAudit(admin, 'meta_ads', 'Lead fetch failed', `leadgen_id ${leadgenId}: ${leadData.error.message}`, 'failed')
          continue
        }

        let formName: string | null = null
        if (formId) {
          const formRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${formId}?fields=name&access_token=${integration.page_access_token}`)
          const formData = await formRes.json()
          formName = formData.name || null
        }

        // deno-lint-ignore no-explicit-any
        const fields: Record<string, any> = {}
        for (const f of leadData.field_data || []) fields[f.name] = f.values?.[0]
        const name = fields.full_name || [fields.first_name, fields.last_name].filter(Boolean).join(' ')

        const outcome = await insertLead(admin, {
          name,
          email: fields.email,
          phone: fields.phone_number,
          course: formName || 'General Inquiry',
          source: 'Meta Ads',
          notes: `Imported from Meta Lead Ad${leadData.ad_name ? ` "${leadData.ad_name}"` : ''} (form: ${formName || formId || 'n/a'}, ad: ${adId || 'n/a'})`,
        })
        results.push({ leadgenId, ...outcome })
        await logAudit(
          admin,
          'meta_ads',
          outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
          `${name || 'Unnamed lead'} from form "${formName || formId}"`,
          outcome.error ? 'failed' : 'success'
        )
      } catch (err) {
        results.push({ leadgenId, error: (err as Error).message })
        await logAudit(admin, 'meta_ads', 'Webhook processing error', (err as Error).message, 'failed')
      }
    }
  }

  await markIntegrationStatus(admin, 'meta_ads', { status: 'connected' })

  // Always ack 200 once we've processed what we can — Meta retries on
  // non-2xx, and per-lead failures are logged in `results` instead.
  return json({ received: true, results })
})
