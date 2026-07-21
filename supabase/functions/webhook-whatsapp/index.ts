import { createHmac } from 'node:crypto'
import {
  getAdminClient,
  getIntegrationConfig,
  json,
  logAudit,
  markIntegrationStatus,
  timingSafeEqualStr,
} from '../_shared/lib.ts'

// WhatsApp Cloud API webhooks reuse Meta's Graph API webhooks platform:
// same GET verification handshake and X-Hub-Signature-256 signing as
// Meta Ads leadgen. Payload docs:
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

// bixitcrm has no message inbox yet, so inbound WhatsApp messages are
// logged to the integration's activity log and, when the sender's number
// matches an existing lead, appended to that lead's notes — rather than
// stored as their own "conversation" record.
function digitsOnly(value?: string | null) {
  return (value || '').replace(/\D/g, '')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'whatsapp')
  if (configError) return json({ error: configError }, 500)

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

  if (!integration.app_secret) {
    return json({ error: 'WhatsApp integration is not configured yet' }, 500)
  }

  const rawBody = new Uint8Array(await req.arrayBuffer())

  const signatureHeader = req.headers.get('x-hub-signature-256')
  if (!signatureHeader) return json({ error: 'Missing signature' }, 401)

  const expectedSignature = `sha256=${createHmac('sha256', integration.app_secret).update(rawBody).digest('hex')}`
  if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
    await logAudit(admin, 'whatsapp', 'Webhook signature check', 'Rejected a POST with an invalid X-Hub-Signature-256', 'failed')
    return json({ error: 'Invalid signature' }, 401)
  }

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = JSON.parse(new TextDecoder().decode(rawBody))
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {}

      for (const message of value.messages || []) {
        const contact = (value.contacts || []).find((c: { wa_id?: string }) => c.wa_id === message.from)
        const senderName = contact?.profile?.name || message.from
        const text = message.text?.body || `[${message.type} message]`

        const { data: matchingLeads } = await admin
          .from('leads')
          .select('id, notes')
          .ilike('phone', `%${digitsOnly(message.from).slice(-10)}%`)
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
  return json({ received: true })
})
