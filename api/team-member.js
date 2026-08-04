import { createClient } from '@supabase/supabase-js'

// Merged from create-team-member.js + delete-team-member.js (POST=create,
// DELETE=remove) — Vercel's Hobby plan caps a deployment at 12 serverless
// functions and every file under /api counts toward that regardless of
// traffic, so unrelated small endpoints get consolidated by HTTP method
// instead of staying one file each.
const ROLES = ['admin', 'manager', 'sales']

function getAdmin(res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Server is not configured (missing SUPABASE_SERVICE_ROLE_KEY)' })
    return null
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function requireCaller(req, res, admin) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Missing authorization token' }); return null }

  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData?.user) { res.status(401).json({ error: 'Invalid session' }); return null }

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles').select('role').eq('id', callerData.user.id).single()
  if (callerProfileError) { res.status(403).json({ error: 'Could not verify permissions' }); return null }

  return { user: callerData.user, role: callerProfile?.role }
}

async function handleCreate(req, res, admin) {
  const caller = await requireCaller(req, res, admin)
  if (!caller) return
  if (!['admin', 'manager'].includes(caller.role)) {
    res.status(403).json({ error: 'Only administrators or managers can add team members' })
    return
  }

  // Only admins may create other admins — a manager could otherwise grant
  // themselves or anyone else full admin access.
  if (req.body?.role === 'admin' && caller.role !== 'admin') {
    res.status(403).json({ error: 'Only administrators can create another administrator' })
    return
  }

  const { name, email, phone, password, role } = req.body || {}
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'name, email, password and role are required' })
    return
  }
  if (!ROLES.includes(role)) { res.status(400).json({ error: 'role must be "admin" or "sales"' }); return }
  if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return }

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (createError) { res.status(400).json({ error: createError.message }); return }

  const { error: insertError } = await admin.from('profiles').insert({ id: created.user.id, name, email, phone: phone || null, role })
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id)
    res.status(400).json({ error: insertError.message })
    return
  }

  res.status(200).json({ success: true })
}

async function handleDelete(req, res, admin) {
  const caller = await requireCaller(req, res, admin)
  if (!caller) return
  // Removing someone's login is more consequential than adding one — admin
  // only, unlike create which also allows managers.
  if (caller.role !== 'admin') { res.status(403).json({ error: 'Only administrators can remove team members' }); return }

  const { userId } = req.body || {}
  if (!userId) { res.status(400).json({ error: 'userId is required' }); return }
  if (userId === caller.user.id) { res.status(400).json({ error: "You can't remove your own account" }); return }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) { res.status(400).json({ error: deleteError.message }); return }

  // The auth user is gone — clean up the profile row too in case no FK
  // cascade is set up to do it automatically.
  await admin.from('profiles').delete().eq('id', userId)

  res.status(200).json({ success: true })
}

export default async function handler(req, res) {
  const admin = getAdmin(res)
  if (!admin) return

  if (req.method === 'POST') return handleCreate(req, res, admin)
  if (req.method === 'DELETE') return handleDelete(req, res, admin)
  res.status(405).json({ error: 'Method not allowed' })
}
