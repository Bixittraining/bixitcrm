import { getAdminClient, getIntegrationConfig, logAudit, requireAuth } from '../webhooks/_lib.js'

const GRAPH_API_VERSION = 'v21.0'

// Sends a free-form text reply via the WhatsApp Cloud API. Note: Meta only
// allows free-form replies within 24 hours of the contact's last message —
// outside that window only pre-approved template messages are deliverable.
// This endpoint does not yet support templates (see Settings > Integrations
// for where the credentials it uses are configured).
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

  const auth = await requireAuth(req, admin)
  if (auth.error) {
    res.status(auth.status).json({ error: auth.error })
    return
  }

  const { phone, body } = req.body || {}
  if (!phone || !body || !body.trim()) {
    res.status(400).json({ error: 'phone and body are required' })
    return
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'whatsapp')
  if (configError) {
    res.status(500).json({ error: configError })
    return
  }
  if (!integration.page_id || !integration.page_access_token) {
    res.status(500).json({ error: 'WhatsApp integration is not configured yet (missing phone number ID or access token)' })
    return
  }

  const graphRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${integration.page_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${integration.page_access_token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body },
    }),
  })
  const graphBody = await graphRes.json()

  if (!graphRes.ok || graphBody.error) {
    const message = graphBody.error?.message || 'Failed to send message'
    await logAudit(admin, 'whatsapp', 'Outbound message failed', `To ${phone}: ${message}`, 'failed')
    res.status(502).json({ error: message })
    return
  }

  const wamid = graphBody.messages?.[0]?.id

  const { data: conversation } = await admin.from('whatsapp_conversations').select('lead_id').eq('phone', phone).maybeSingle()

  await admin.from('whatsapp_messages').insert({
    phone,
    lead_id: conversation?.lead_id ?? null,
    direction: 'outbound',
    sender: 'human',
    body,
    wamid,
  })

  await admin.from('whatsapp_conversations').upsert({
    phone,
    lead_id: conversation?.lead_id ?? null,
    mode: 'human',
    last_message: body,
    last_message_at: new Date().toISOString(),
    unread_count: 0,
    updated_at: new Date().toISOString(),
  })

  await logAudit(admin, 'whatsapp', 'Outbound message sent', `To ${phone} by ${auth.user.email}`, 'success')

  res.status(200).json({ success: true, wamid })
}
