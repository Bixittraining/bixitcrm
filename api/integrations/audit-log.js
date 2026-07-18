import { getAdminClient } from '../webhooks/_lib.js'
import { isValidIntegrationKey, requireAdmin } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  const { key } = req.query || {}
  if (!isValidIntegrationKey(key)) {
    res.status(400).json({ error: 'Unknown integration key' })
    return
  }

  const { data, error } = await admin
    .from('integration_audit_log')
    .select('*')
    .eq('integration_key', key)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ logs: data })
}
