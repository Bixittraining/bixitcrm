import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server is not configured (missing SUPABASE_SERVICE_ROLE_KEY)' })
    return
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' })
    return
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData?.user) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()

  // Removing someone's login is more consequential than adding one — admin
  // only, unlike create-team-member which also allows managers.
  if (callerProfileError || callerProfile?.role !== 'admin') {
    res.status(403).json({ error: 'Only administrators can remove team members' })
    return
  }

  const { userId } = req.body || {}
  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return
  }
  if (userId === callerData.user.id) {
    res.status(400).json({ error: "You can't remove your own account" })
    return
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    res.status(400).json({ error: deleteError.message })
    return
  }

  // The auth user is gone — clean up the profile row too in case no FK
  // cascade is set up to do it automatically.
  await admin.from('profiles').delete().eq('id', userId)

  res.status(200).json({ success: true })
}
