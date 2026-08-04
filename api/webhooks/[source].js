import crypto from 'node:crypto'
import { getAdminClient, getIntegrationConfig, insertLead, logAudit, markIntegrationStatus, readRawBody, timingSafeEqualStr } from './_lib.js'

// Merged from 4 separate files (meta-ads.js, google-ads.js, justdial.js,
// whatsapp.js) into one dynamic route — Vercel's Hobby plan caps a
// deployment at 12 serverless functions, and each file under /api counts
// as one regardless of whether it's ever called. The URL paths are
// unchanged (/api/webhooks/meta-ads still resolves here with
// source='meta-ads'), so nothing needed to change in the Meta/Google/
// JustDial dashboards where these URLs are already registered.
export const config = { api: { bodyParser: false } }

const GRAPH_API_VERSION = 'v21.0'

async function parseBody(req) {
  const rawBody = await readRawBody(req)
  let body = {}
  try {
    body = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {}
  } catch {
    body = null
  }
  return { rawBody, body }
}

function digitsOnly(value) {
  return (value || '').replace(/\D/g, '')
}

async function upsertWhatsappConversation(admin, { phone, leadId, contactName, lastMessage }) {
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

async function handleMetaAds(req, res, admin) {
  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'meta_ads')
  if (configError) { res.status(500).json({ error: configError }); return }

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
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  if (!integration.app_secret || !integration.page_access_token) {
    res.status(500).json({ error: 'Meta Ads integration is not configured yet' })
    return
  }

  const { rawBody, body } = await parseBody(req)
  const signatureHeader = req.headers['x-hub-signature-256']
  if (!signatureHeader) { res.status(401).json({ error: 'Missing signature' }); return }
  const expectedSignature = `sha256=${crypto.createHmac('sha256', integration.app_secret).update(rawBody).digest('hex')}`
  if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
    await logAudit(admin, 'meta_ads', 'Webhook signature check', 'Rejected a POST with an invalid X-Hub-Signature-256', 'failed')
    res.status(401).json({ error: 'Invalid signature' })
    return
  }
  if (body === null) { res.status(400).json({ error: 'Invalid JSON' }); return }

  const results = []
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue
      const { leadgen_id: leadgenId, form_id: formId, ad_id: adId } = change.value || {}
      if (!leadgenId) continue

      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=field_data,ad_name,platform&access_token=${integration.page_access_token}`
        )
        const leadData = await graphRes.json()
        if (leadData.error) {
          results.push({ leadgenId, error: leadData.error.message })
          await logAudit(admin, 'meta_ads', 'Lead fetch failed', `leadgen_id ${leadgenId}: ${leadData.error.message}`, 'failed')
          continue
        }

        let formName = null
        if (formId) {
          const formRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${formId}?fields=name&access_token=${integration.page_access_token}`)
          const formData = await formRes.json()
          formName = formData.name || null
        }

        const fields = {}
        for (const f of leadData.field_data || []) fields[f.name] = f.values?.[0]
        const name = fields.full_name || [fields.first_name, fields.last_name].filter(Boolean).join(' ')

        const platform = String(leadData.platform || '').toLowerCase()
        const source = platform.includes('instagram') ? 'Instagram' : platform.includes('facebook') ? 'Facebook' : 'Meta Ads'

        const outcome = await insertLead(admin, {
          name,
          email: fields.email,
          phone: fields.phone_number,
          course: formName || 'General Inquiry',
          source,
          notes: `Imported from Meta Lead Ad${leadData.ad_name ? ` "${leadData.ad_name}"` : ''} (form: ${formName || formId || 'n/a'}, ad: ${adId || 'n/a'})`,
        })
        results.push({ leadgenId, ...outcome })
        await logAudit(
          admin, 'meta_ads',
          outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
          `${name || 'Unnamed lead'} from form "${formName || formId}"`,
          outcome.error ? 'failed' : 'success'
        )
      } catch (err) {
        results.push({ leadgenId, error: err.message })
        await logAudit(admin, 'meta_ads', 'Webhook processing error', err.message, 'failed')
      }
    }
  }

  await markIntegrationStatus(admin, 'meta_ads', { status: 'connected' })
  res.status(200).json({ received: true, results })
}

async function handleWhatsapp(req, res, admin) {
  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'whatsapp')
  if (configError) { res.status(500).json({ error: configError }); return }

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
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  if (!integration.app_secret) { res.status(500).json({ error: 'WhatsApp integration is not configured yet' }); return }

  const { rawBody, body } = await parseBody(req)
  const signatureHeader = req.headers['x-hub-signature-256']
  if (!signatureHeader) { res.status(401).json({ error: 'Missing signature' }); return }
  const expectedSignature = `sha256=${crypto.createHmac('sha256', integration.app_secret).update(rawBody).digest('hex')}`
  if (!timingSafeEqualStr(signatureHeader, expectedSignature)) {
    await logAudit(admin, 'whatsapp', 'Webhook signature check', 'Rejected a POST with an invalid X-Hub-Signature-256', 'failed')
    res.status(401).json({ error: 'Invalid signature' })
    return
  }
  if (body === null) { res.status(400).json({ error: 'Invalid JSON' }); return }

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

        await upsertWhatsappConversation(admin, { phone: message.from, leadId: lead?.id, contactName: senderName, lastMessage: text })
        await admin.from('whatsapp_messages').insert({
          phone: message.from,
          lead_id: lead?.id ?? null,
          direction: 'inbound',
          sender: 'contact',
          body: text,
          wamid: message.id,
        })

        await logAudit(
          admin, 'whatsapp',
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

async function handleGoogleAds(req, res, admin) {
  if (req.method !== 'POST') { res.status(405).json({ message: 'Method not allowed' }); return }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'google_ads')
  if (configError) { res.status(500).json({ message: configError }); return }
  if (!integration.webhook_verify_token) { res.status(500).json({ message: 'Google Ads integration is not configured yet' }); return }

  const { body } = await parseBody(req)
  if (body === null) { res.status(400).json({ message: 'Invalid JSON' }); return }
  const { google_key: googleKey, lead_id: leadId, user_column_data: userColumnData, is_test: isTest, lead_source: leadSource } = body

  if (!googleKey || !timingSafeEqualStr(googleKey, integration.webhook_verify_token)) {
    await logAudit(admin, 'google_ads', 'Webhook key check', `Rejected a POST with an invalid google_key (lead_id: ${leadId || 'n/a'})`, 'failed')
    res.status(401).json({ message: 'Invalid google_key' })
    return
  }

  if (isTest) {
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
    name, email, phone,
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
    admin, 'google_ads',
    outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported',
    `${name || 'Unnamed lead'} (lead_id: ${leadId || 'n/a'})`,
    'success'
  )
  await markIntegrationStatus(admin, 'google_ads', { status: 'connected' })
  res.status(200).json({})
}

async function handleJustdial(req, res, admin) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, 'justdial')
  if (configError) { res.status(500).json({ error: configError }); return }
  if (!integration.webhook_verify_token) { res.status(500).json({ error: 'JustDial integration is not configured yet' }); return }

  const providedSecret = req.headers['x-webhook-secret']
  if (!providedSecret || !timingSafeEqualStr(providedSecret, integration.webhook_verify_token)) {
    await logAudit(admin, 'justdial', 'Webhook secret check', 'Rejected a POST with an invalid X-Webhook-Secret header', 'failed')
    res.status(401).json({ error: 'Invalid or missing X-Webhook-Secret header' })
    return
  }

  const { body } = await parseBody(req)
  if (body === null) { res.status(400).json({ error: 'Invalid JSON' }); return }
  const name = body.name || body.full_name || body.customer_name || body.contact_name
  const email = body.email || body.email_id
  const phone = body.phone || body.mobile || body.contact_no || body.phone_number
  const course = body.course || body.category || body.enquiry_for
  const notes = body.message || body.notes || body.enquiry_details || ''

  const outcome = await insertLead(admin, {
    name, email, phone, course,
    source: 'JustDial',
    notes: notes ? `JustDial enquiry: ${notes}` : 'Imported from JustDial',
  })

  if (outcome.error) {
    await logAudit(admin, 'justdial', 'Lead import failed', outcome.error, 'failed')
    await markIntegrationStatus(admin, 'justdial', { status: 'error', lastError: outcome.error })
    res.status(400).json({ error: outcome.error })
    return
  }

  await logAudit(admin, 'justdial', outcome.duplicate ? 'Duplicate lead skipped' : 'Lead imported', name || 'Unnamed lead', 'success')
  await markIntegrationStatus(admin, 'justdial', { status: 'connected' })
  res.status(200).json({ success: true, duplicate: !!outcome.duplicate })
}

export default async function handler(req, res) {
  let admin
  try {
    admin = getAdminClient()
  } catch (err) {
    res.status(500).json({ error: err.message })
    return
  }

  switch (req.query.source) {
    case 'meta-ads': return handleMetaAds(req, res, admin)
    case 'whatsapp': return handleWhatsapp(req, res, admin)
    case 'google-ads': return handleGoogleAds(req, res, admin)
    case 'justdial': return handleJustdial(req, res, admin)
    default:
      res.status(404).json({ error: 'Unknown webhook source' })
  }
}
