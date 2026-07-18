import { getAdminClient, logAudit } from '../webhooks/_lib.js'
import { isValidIntegrationKey, maskIntegration, requireAdmin } from './_shared.js'

// Secret fields (appSecret / pageAccessToken / webhookVerifyToken) are only
// overwritten when a non-empty value is submitted — this lets the UI show
// "•••••• (set — enter a new value to change)" without ever round-tripping
// the real secret back to the browser.
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

  const { key, appId, pageId, appSecret, pageAccessToken, webhookVerifyToken } = req.body || {}
  if (!isValidIntegrationKey(key)) {
    res.status(400).json({ error: 'Unknown integration key' })
    return
  }

  const updates = {
    app_id: appId ?? '',
    page_id: pageId ?? '',
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  }
  if (appSecret) updates.app_secret = appSecret
  if (pageAccessToken) updates.page_access_token = pageAccessToken
  if (webhookVerifyToken) updates.webhook_verify_token = webhookVerifyToken

  const { data, error } = await admin.from('integrations').update(updates).eq('key', key).select().single()
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  await logAudit(admin, key, 'Configuration saved', `Updated by ${auth.user.email}`, 'success')

  res.status(200).json({ integration: maskIntegration(data) })
}
