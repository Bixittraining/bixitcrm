import crypto from 'node:crypto'
import { getAdminClient, getIntegrationConfig, logAudit, markIntegrationStatus, readRawBody, timingSafeEqualStr } from './_lib.js'

// WhatsApp Cloud API webhooks reuse Meta's Graph API webhooks platform:
// same GET verification handshake and X-Hub-Signature-256 signing as
// Meta Ads leadgen. Payload docs:
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
export const config = { api: { bodyParser: false } }

// bixitcrm has no message inbox yet, so inbound WhatsApp messages are
// logged to the integration's activity log and, when the sender's number
// matches an existing lead, appended to that lead's notes — rather than
// stored as their own "conversation" record.
function digitsOnly(value) {
  return (value || '').replace(/\D/g, '')
}

export default async function handler(req, res) {
  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    res.status(500).json({ error: err.message })
    return
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'whatsapp')
  if (configError) {
    res.status(500).json({ error: configError })
    return
  }

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

  if (!integration.app_secret) {
    res.status(500).json({ error: 'WhatsApp integration is not configured yet' })
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
    await logAudit(admin, 'whatsapp', 'Webhook signature check', 'Rejected a POST with an invalid X-Hub-Signature-256', 'failed')
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

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {}

      for (const message of value.messages || []) {
        const contact = (value.contacts || []).find((c) => c.wa_id === message.from)
        const senderName = contact?.profile?.name || message.from
        const text = message.text?.body || `[${message.type} message]`

        const { data: matchingLeads } = await admin.from('leads').select('id, notes').ilike('phone', `%${digitsOnly(message.from).slice(-10)}%`)
        const lead = matchingLeads?.[0]
        if (lead) {
          await admin
            .from('leads')
            .update({ notes: `${lead.notes ? `${lead.notes}\n` : ''}[WhatsApp ${new Date().toISOString()}] ${text}` })
            .eq('id', lead.id)
        }

        await logAudit(
          admin,
          'whatsapp',
          'Message received',
          `${senderName}: ${text}${lead ? '' : ' (no matching lead)'}`,
          'success'
        )
      }

      for (const status of value.statuses || []) {
        await logAudit(admin, 'whatsapp', 'Delivery status', `Message ${status.id} → ${status.status}`, 'success')
      }
    }
  }

  await markIntegrationStatus(admin, 'whatsapp', { status: 'connected' })
  res.status(200).json({ received: true })
}
