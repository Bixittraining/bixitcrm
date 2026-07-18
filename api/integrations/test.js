import { getAdminClient, getIntegrationConfig, logAudit, markIntegrationStatus } from '../webhooks/_lib.js'
import { isValidIntegrationKey, requireAdmin } from './_shared.js'

const GRAPH_API_VERSION = 'v21.0'

// Meta Ads and WhatsApp both sit on the Graph API, so a live GET against
// the configured id/token proves the credentials actually work. Google Ads
// and JustDial have no such endpoint (Google's lead-form webhook key isn't
// independently verifiable, and JustDial has no public API at all) — for
// those we can only confirm the config looks complete.
async function testGraphApiCredential(id, accessToken) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${id}?access_token=${accessToken}`)
  const body = await res.json()
  if (body.error) return { ok: false, message: body.error.message }
  return { ok: true, message: `Connected as "${body.name || body.display_phone_number || id}"` }
}

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

  const auth = await requireAdmin(req, admin)
  if (auth.error) {
    res.status(auth.status).json({ error: auth.error })
    return
  }

  const { key } = req.body || {}
  if (!isValidIntegrationKey(key)) {
    res.status(400).json({ error: 'Unknown integration key' })
    return
  }

  const { data: integration, error: configError } = await getIntegrationConfig(admin, key)
  if (configError) {
    res.status(500).json({ error: configError })
    return
  }

  let result
  if (key === 'meta_ads' || key === 'whatsapp') {
    if (!integration.page_id || !integration.page_access_token) {
      result = { ok: false, message: `Set the ${key === 'whatsapp' ? 'phone number ID and access token' : 'page ID and page access token'} first` }
    } else {
      try {
        result = await testGraphApiCredential(integration.page_id, integration.page_access_token)
      } catch (err) {
        result = { ok: false, message: err.message }
      }
    }
  } else if (key === 'google_ads') {
    result = integration.webhook_verify_token
      ? { ok: true, message: 'Webhook key is set. Google only confirms delivery once a real (or test) lead is submitted from the form.' }
      : { ok: false, message: 'Set the webhook key first' }
  } else {
    result = integration.webhook_verify_token
      ? { ok: true, message: 'Webhook secret is set and ready to receive requests.' }
      : { ok: false, message: 'Set the webhook secret first' }
  }

  await markIntegrationStatus(admin, key, { status: result.ok ? 'connected' : 'error', lastError: result.ok ? null : result.message })
  await logAudit(admin, key, 'Connection test', result.message, result.ok ? 'success' : 'failed')

  res.status(200).json(result)
}
