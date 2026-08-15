import { createHmac } from 'node:crypto'
import {
  getAdminClient,
  getCourseSyllabus,
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

const GRAPH_API_VERSION = 'v21.0'
const SYLLABUS_KEYWORDS = ['syllabus', 'curriculum', 'course details', 'course content']

function digitsOnly(value?: string | null) {
  return (value || '').replace(/\D/g, '')
}

// The one real "bot" reply this webhook sends today: a lead types
// "syllabus"/"curriculum"/etc, and — if their course has real modules
// defined (Packages > a course's Modules section, the same course_modules
// used by the Student Progress feature) — gets them back immediately,
// without waiting on a human. Silent no-op if there's no matching lead,
// no course, or the course has no modules yet: this is an enhancement on
// top of the human conversation, never a replacement for one.
// deno-lint-ignore no-explicit-any
async function maybeSendSyllabus(admin: any, integration: any, { phone, lead, text }: { phone: string; lead: { id: number; course?: string | null } | null; text: string }) {
  const lower = text.toLowerCase()
  if (!SYLLABUS_KEYWORDS.some((kw) => lower.includes(kw))) return
  if (!lead) return
  if (!integration.page_id || !integration.page_access_token) return

  const syllabus = await getCourseSyllabus(admin, lead.course)
  if (!syllabus) return

  const list = syllabus.moduleNames.map((name, i) => `${i + 1}. ${name}`).join('\n')
  const body = `Here's the syllabus for *${syllabus.packageName}*:\n\n${list}\n\nWant more details on any module? Just ask, or our counsellor will call you shortly!`

  const graphRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${integration.page_id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${integration.page_access_token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }),
  })
  const graphBody = await graphRes.json()
  if (!graphRes.ok || graphBody.error) {
    await logAudit(admin, 'whatsapp', 'Syllabus auto-reply failed', `To ${phone}: ${graphBody.error?.message || 'Failed to send'}`, 'failed')
    return
  }

  const wamid = graphBody.messages?.[0]?.id
  await admin.from('whatsapp_messages').insert({ phone, lead_id: lead.id, direction: 'outbound', sender: 'bot', body, wamid })
  await admin.from('whatsapp_conversations').update({ last_message: body, last_message_at: new Date().toISOString() }).eq('phone', phone)
  await logAudit(admin, 'whatsapp', 'Syllabus auto-reply sent', `To ${phone} for course "${syllabus.packageName}"`, 'success')
}

// New conversations default to 'bot' mode. There is no actual bot engine
// wired up (see supabase/migrations/0007_whatsapp_conversations.sql) — this
// just tracks whether a human on the team has taken over yet, for the
// Conversations inbox UI (src/pages/Conversations.jsx).
// deno-lint-ignore no-explicit-any
async function upsertConversation(admin: any, { phone, leadId, contactName, lastMessage }: { phone: string; leadId?: number | null; contactName?: string | null; lastMessage: string }) {
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
        const senderName = contact?.profile?.name || null
        const text = message.text?.body || `[${message.type} message]`

        const { data: matchingLeads } = await admin
          .from('leads')
          .select('id, course')
          .ilike('phone', `%${digitsOnly(message.from).slice(-10)}%`)
        const lead = matchingLeads?.[0]

        const { data: existingConversation } = await admin.from('whatsapp_conversations').select('mode').eq('phone', message.from).maybeSingle()

        await upsertConversation(admin, { phone: message.from, leadId: lead?.id, contactName: senderName, lastMessage: text })
        await admin.from('whatsapp_messages').insert({
          phone: message.from,
          lead_id: lead?.id ?? null,
          direction: 'inbound',
          sender: 'contact',
          body: text,
          wamid: message.id,
        })

        // A human already taking this conversation over (mode: 'human')
        // means the bot must not talk over them — only auto-reply while
        // no team member has stepped in yet.
        if (existingConversation?.mode !== 'human') {
          await maybeSendSyllabus(admin, integration, { phone: message.from, lead: lead ?? null, text })
        }

        await logAudit(
          admin,
          'whatsapp',
          'Message received',
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
  return json({ received: true })
})
