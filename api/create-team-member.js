import { createClient } from '@supabase/supabase-js'

const ROLES = ['admin', 'sales']

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

  if (callerProfileError || callerProfile?.role !== 'admin') {
    res.status(403).json({ error: 'Only administrators can add team members' })
    return
  }

  const { name, email, phone, password, role } = req.body || {}

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'name, email, password and role are required' })
    return
  }
  if (!ROLES.includes(role)) {
    res.status(400).json({ error: 'role must be "admin" or "sales"' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' })
    return
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    res.status(400).json({ error: createError.message })
    return
  }

  const { error: insertError } = await admin.from('profiles').insert({
    id: created.user.id,
    name,
    email,
    phone: phone || null,
    role,
  })

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id)
    res.status(400).json({ error: insertError.message })
    return
  }

  res.status(200).json({ success: true })
}
