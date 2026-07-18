// Shared admin-auth check for api/integrations/* — mirrors the pattern in
// api/create-team-member.js: verify the caller's bearer token against
// Supabase Auth, then confirm their profile role is 'admin'.
export async function requireAdmin(req, admin) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return { error: 'Missing authorization token', status: 401 }

  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData?.user) return { error: 'Invalid session', status: 401 }

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()

  if (callerProfileError || callerProfile?.role !== 'admin') {
    return { error: 'Only administrators can manage integrations', status: 403 }
  }

  return { user: callerData.user }
}

const VALID_KEYS = ['meta_ads', 'google_ads', 'whatsapp', 'justdial']

export function isValidIntegrationKey(key) {
  return VALID_KEYS.includes(key)
}

// Never send secret values back to the browser — only whether one is set,
// so the UI can show "•••••• (set — enter a new value to change)".
export function maskIntegration(row) {
  return {
    key: row.key,
    appId: row.app_id || '',
    pageId: row.page_id || '',
    hasAppSecret: !!row.app_secret,
    hasPageAccessToken: !!row.page_access_token,
    hasWebhookToken: !!row.webhook_verify_token,
    status: row.status,
    lastError: row.last_error,
    lastSyncedAt: row.last_synced_at,
    updatedAt: row.updated_at,
  }
}
