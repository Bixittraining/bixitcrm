import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

const roleLabels = { admin: 'Administrator', sales: 'Sales Person' }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profileRow, setProfileRow] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfileRow(data ?? null)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return
      setSession(session)
      if (session?.user) await loadProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfileRow(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) console.error('signIn error', error)
    else console.log('signIn success', data.user.email)
    return { data, error }
  }

  const signOut = async () => {
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
    const res = await fetch('/api/create-team-member', {
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

  const profile = profileRow
    ? { ...profileRow, role: roleLabels[profileRow.role] || profileRow.role, roleCode: profileRow.role }
    : null

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const isAdmin = profile?.roleCode === 'admin'

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, initials, isAdmin, loading, signIn, signOut, updateProfile, uploadAvatar, addTeamMember }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
