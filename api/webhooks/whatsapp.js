import crypto from 'node:crypto'
import { getAdminClient, getIntegrationConfig, insertLead, logAudit, markIntegrationStatus, readRawBody, timingSafeEqualStr } from './_lib.js'

// WhatsApp Cloud API webhooks reuse Meta's Graph API webhooks platform:
// same GET verification handshake and X-Hub-Signature-256 signing as
// Meta Ads leadgen. Payload docs:
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
export const config = { api: { bodyParser: false } }

function digitsOnly(value) {
  return (value || '').replace(/\D/g, '')
}

// New conversations default to 'bot' mode. There is no actual bot engine
// wired up (see supabase/migrations/0007_whatsapp_conversations.sql) — this
// just tracks whether a human on the team has taken over yet, for the
// Conversations inbox UI.
async function upsertConversation(admin, { phone, leadId, contactName, lastMessage }) {
  const { data: existing } = await admin.from('whatsapp_conversations').select('phone, unread_count').eq('phone', phone).maybeSingle()

  if (existing) {
    await admin
      .from('whatsapp_conversations')
      .update({
        lead_id: leadId ?? undefined,
        contact_name: contactName || undefined,
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
        unread_count: (existing.unread_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('phone', phone)
  } else {
    await admin.from('whatsapp_conversations').insert({
      phone,
      lead_id: leadId ?? null,
      contact_name: contactName || null,
      mode: 'bot',
      last_message: lastMessage,
      last_message_at: new Date().toISOString(),
      unread_count: 1,
    })
  }
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
        const senderName = contact?.profile?.name || null
        const text = message.text?.body || `[${message.type} message]`

        const { data: matchingLeads } = await admin.from('leads').select('id').ilike('phone', `%${digitsOnly(message.from).slice(-10)}%`)
        let lead = matchingLeads?.[0]
        let leadCreated = false

        // A message from a number with no matching lead is itself a new
        // inbound lead — without this, every WhatsApp-originated contact
        // just sat in the Conversations inbox unlinked, invisible to
        // Leads/Reports and impossible to track as a "WhatsApp" source.
        if (!lead) {
          const outcome = await insertLead(admin, {
            name: senderName || `WhatsApp ${digitsOnly(message.from).slice(-10)}`,
            phone: message.from,
            course: 'General Inquiry',
            source: 'WhatsApp',
            notes: `First message: "${text}"`,
          })
          if (outcome.data?.id) { lead = outcome.data; leadCreated = true }
          else if (outcome.error) await logAudit(admin, 'whatsapp', 'Auto-create lead failed', `${message.from}: ${outcome.error}`, 'failed')
        }

        await upsertConversation(admin, { phone: message.from, leadId: lead?.id, contactName: senderName, lastMessage: text })
        await admin.from('whatsapp_messages').insert({
          phone: message.from,
          lead_id: lead?.id ?? null,
          direction: 'inbound',
          sender: 'contact',
          body: text,
          wamid: message.id,
        })

        await logAudit(
          admin,
          'whatsapp',
          leadCreated ? 'New lead created from WhatsApp' : 'Message received',
          `${senderName || message.from}: ${text}${lead ? '' : ' (no matching lead)'}`,
          'success'
        )
      }

      for (const status of value.statuses || []) {
        await admin.from('whatsapp_messages').update({ status: status.status }).eq('wamid', status.id)
        await logAudit(admin, 'whatsapp', 'Delivery status', `Message ${status.id} → ${status.status}`, 'success')
      }
    }
  }

  await markIntegrationStatus(admin, 'whatsapp', { status: 'connected' })
  res.status(200).json({ received: true })
}
