import crypto from 'node:crypto'
import { getAdminClient, getIntegrationConfig, insertLead, logAudit, markIntegrationStatus, readRawBody, timingSafeEqualStr } from './_lib.js'

// Disable Vercel's automatic body parsing so we can verify the HMAC
// signature against the exact raw bytes Meta signed.
export const config = { api: { bodyParser: false } }

const GRAPH_API_VERSION = 'v21.0'

export default async function handler(req, res) {
  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    res.status(500).json({ error: err.message })
    return
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'meta_ads')
  if (configError) {
    res.status(500).json({ error: configError })
    return
  }

  // Meta calls this once, with GET, to verify you control the endpoint
  // before it will start sending POST notifications.
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && integration.webhook_verify_token && timingSafeEqualStr(token, integration.webhook_verify_token)) {
      res.status(200).send(challenge)
      return
    }
    res.status(403).json({ error: 'Verification failed' })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!integration.app_secret || !integration.page_access_token) {
    res.status(500).json({ error: 'Meta Ads integration is not configured yet' })
    return
  }

  const rawBody = await readRawBody(req)

  const signatureHeader = req.headers['x-hub-signature-256']
  if (!signatureHeader) {
    res.status(401).json({ error: 'Missing signature' })
    return
  }
  const expectedSignature = `sha256=${crypto.createHmac('sha256', integration.app_secret).update(rawBody).digest('hex')}`
  if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
    await logAudit(admin, 'meta_ads', 'Webhook signature check', 'Rejected a POST with an invalid X-Hub-Signature-256', 'failed')
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  let body
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    res.status(400).json({ error: 'Invalid JSON' })
    return
  }

  const results = []
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue
      const { leadgen_id: leadgenId, form_id: formId, ad_id: adId } = change.value || {}
      if (!leadgenId) continue

      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=field_data,form_name,ad_name&access_token=${integration.page_access_token}`
        )
        const leadData = await graphRes.json()
        if (leadData.error) {
          results.push({ leadgenId, error: leadData.error.message })
          await logAudit(admin, 'meta_ads', 'Lead fetch failed', `leadgen_id ${leadgenId}: ${leadData.error.message}`, 'failed')
          continue
        }

        const fields = {}
        for (const f of leadData.field_data || []) fields[f.name] = f.values?.[0]
        const name = fields.full_name || [fields.first_name, fields.last_name].filter(Boolean).join(' ')

        const outcome = await insertLead(admin, {
          name,
          email: fields.email,
          phone: fields.phone_number,
          course: leadData.form_name || 'General Inquiry',
          source: 'Meta Ads',
          notes: `Imported from Meta Lead Ad${leadData.ad_name ? ` "${leadData.ad_name}"` : ''} (form: ${leadData.form_name || formId || 'n/a'}, ad: ${adId || 'n/a'})`,
        })
        results.push({ leadgenId, ...outcome })
        await logAudit(
          admin,
          'meta_ads',
          outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
          `${name || 'Unnamed lead'} from form "${leadData.form_name || formId}"`,
          outcome.error ? 'failed' : 'success'
        )
      } catch (err) {
        results.push({ leadgenId, error: err.message })
        await logAudit(admin, 'meta_ads', 'Webhook processing error', err.message, 'failed')
      }
    }
  }

  await markIntegrationStatus(admin, 'meta_ads', { status: 'connected' })

  // Always ack 200 once we've processed what we can — Meta retries on
  // non-2xx, and per-lead failures are logged in `results` instead.
  res.status(200).json({ received: true, results })
}
