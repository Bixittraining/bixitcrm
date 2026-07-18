import { getAdminClient } from '../webhooks/_lib.js'
import { maskIntegration, requireAdmin } from './_shared.js'

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

  const { data, error } = await admin.from('integrations').select('*').order('key')
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ integrations: data.map(maskIntegration) })
}
