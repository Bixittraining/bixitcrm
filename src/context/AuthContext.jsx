import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

const roleLabels = { admin: 'Administrator', manager: 'Manager', sales: 'Sales Executive' }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profileRow, setProfileRow] = useState(null)
  const [loading, setLoading] = useState(true)
  // Shown on the Login screen when a real session (not just the initial
  // page load) drops out from under the user — e.g. the refresh token
  // expired mid-use. Without this the app just silently swapped back to
  // Login with no explanation, which read as "stuck" since nothing told
  // the user why they were suddenly logged out.
  const [sessionExpired, setSessionExpired] = useState(false)
  const hadSessionRef = useRef(false)
  // The open (not yet logged-out) user_sessions row for this browser tab —
  // set on a real signIn(), or recovered on page load if the browser
  // session was restored (so logout still closes the right row after a
  // refresh, not just a fresh sign-in).
  const [currentSessionId, setCurrentSessionId] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfileRow(data ?? null)
  }, [])

  // Recovers the open session row for a browser reload, or — if the
  // browser was already authenticated from before this feature existed (or
  // any other reason no open row is found) — starts one now. Being
  // authenticated with no open session is effectively "logged in" for
  // activity-tracking purposes, so it shouldn't just sit there as a
  // permanent "Offline" in Team Activity.
  const recoverOpenSession = useCallback(async (userId) => {
    const { data } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .is('logout_at', null)
      .order('login_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) { setCurrentSessionId(data.id); return }
    const { data: created, error } = await supabase.from('user_sessions').insert({ user_id: userId }).select('id').single()
    if (error) console.error('recoverOpenSession insert error', error)
    else setCurrentSessionId(created.id)
  }, [])

  useEffect(() => {
    let active = true

    // A stalled network request (bad wifi, token refresh hanging) used to
    // leave the app on the loading spinner forever, since nothing ever
    // resolved this promise. Race it against a timeout so we always reach
    // a real screen (Login, if we can't confirm a session) instead of
    // spinning indefinitely.
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 10000))

    Promise.race([supabase.auth.getSession(), timeout]).then(async (result) => {
      if (!active) return
      const session = result.data.session
      setSession(session)
      if (session?.user) {
        hadSessionRef.current = true
        await loadProfile(session.user.id)
        await recoverOpenSession(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        hadSessionRef.current = true
        loadProfile(session.user.id)
      } else {
        setProfileRow(null)
        if (hadSessionRef.current) setSessionExpired(true)
        hadSessionRef.current = false
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile, recoverOpenSession])

  const clearSessionExpired = useCallback(() => setSessionExpired(false), [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { console.error('signIn error', error); return { data, error } }
    console.log('signIn success', data.user.email)
    // A tab close or expired refresh token never calls signOut(), so a prior
    // session can be left open indefinitely. Close out any stale open rows
    // for this user before starting a new one, so at most one "Still online"
    // row ever exists per user instead of one per login attempt.
    await supabase
      .from('user_sessions')
      .update({ logout_at: new Date().toISOString() })
      .eq('user_id', data.user.id)
      .is('logout_at', null)
    const { data: sessionRow, error: sessionErr } = await supabase
      .from('user_sessions')
      .insert({ user_id: data.user.id })
      .select('id')
      .single()
    if (sessionErr) console.error('user_sessions insert error', sessionErr)
    else setCurrentSessionId(sessionRow.id)
    return { data, error }
  }

  const signOut = async () => {
    if (currentSessionId) {
      const { error: sessionErr } = await supabase
        .from('user_sessions')
        .update({ logout_at: new Date().toISOString() })
        .eq('id', currentSessionId)
      if (sessionErr) console.error('user_sessions logout update error', sessionErr)
      setCurrentSessionId(null)
    }
    const { error } = await supabase.auth.signOut()
    if (error) console.error('signOut error', error)
    else console.log('signOut success')
    return { error }
  }

  const updateProfile = async (updates) => {
    if (!session?.user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single()
    if (error) console.error('updateProfile error', error)
    else setProfileRow(data)
    return { data, error }
  }

  const uploadAvatar = async (file) => {
    if (!session?.user) return { error: new Error('Not authenticated') }
    if (!file.type.startsWith('image/')) return { error: new Error('Please choose an image file') }
    if (file.size > 5 * 1024 * 1024) return { error: new Error('Image must be smaller than 5MB') }

    const ext = file.name.split('.').pop()
    const filePath = `${session.user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) { console.error('uploadAvatar error', uploadError); return { error: uploadError } }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return updateProfile({ avatar_url: urlData.publicUrl })
  }

  const addTeamMember = async ({ name, email, phone, password, role }) => {
    if (!session?.access_token) return { error: new Error('Not authenticated') }
    const res = await fetch('/api/team-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name, email, phone, password, role }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('addTeamMember error', body.error || res.statusText)
      return { error: new Error(body.error || 'Failed to add team member') }
    }
    console.log('addTeamMember success', email)
    return { data: body }
  }

  // Editing another team member's profile (not your own) — permitted by the
  // profiles_update_admin RLS policy for admins only.
  const updateTeamMemberProfile = async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) console.error('updateTeamMemberProfile error', error)
    return { data, error }
  }

  const deleteTeamMember = async (userId) => {
    if (!session?.access_token) return { error: new Error('Not authenticated') }
    const res = await fetch('/api/team-member', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('deleteTeamMember error', body.error || res.statusText)
      return { error: new Error(body.error || 'Failed to remove team member') }
    }
    return { data: body }
  }

  const profile = profileRow
    ? { ...profileRow, role: roleLabels[profileRow.role] || profileRow.role, roleCode: profileRow.role }
    : null

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const isAdmin = profile?.roleCode === 'admin'
  const isManager = profile?.roleCode === 'manager'
  // Team + Academy management: Admin and Manager. Integrations/API stay
  // strictly admin-only (isAdmin) since they hold secrets/webhooks.
  const canManageTeam = isAdmin || isManager

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, initials, isAdmin, isManager, canManageTeam, loading, sessionExpired, clearSessionExpired, signIn, signOut, updateProfile, uploadAvatar, addTeamMember, updateTeamMemberProfile, deleteTeamMember }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
