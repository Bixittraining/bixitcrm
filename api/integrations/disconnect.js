import { getAdminClient, logAudit } from '../webhooks/_lib.js'
import { isValidIntegrationKey, maskIntegration, requireAdmin } from './_shared.js'

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

  const { data, error } = await admin
    .from('integrations')
    .update({
      app_id: null,
      app_secret: null,
      page_id: null,
      page_access_token: null,
      webhook_verify_token: null,
      status: 'not_connected',
      last_error: null,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    })
    .eq('key', key)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  await logAudit(admin, key, 'Disconnected', `Cleared by ${auth.user.email}`, 'warning')

  res.status(200).json({ integration: maskIntegration(data) })
}
