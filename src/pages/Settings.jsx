import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Shield, Palette, Globe, Database, Mail,
  Sun, Moon, Save, Camera, Building2, Phone, MapPin, Plug, Key, Eye, EyeOff,
  Copy, Check, Loader2, RefreshCw, Plus, Trash2, Pencil, X,
  ExternalLink, ChevronRight, AlertTriangle, Activity,
  Zap, Users, UserPlus, ShieldCheck, Briefcase
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const tabs = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'team', label: 'Team', icon: Users, visibleTo: 'manager' },
  { key: 'academy', label: 'Academy', icon: Building2, visibleTo: 'manager' },
  { key: 'integrations', label: 'Integrations', icon: Plug, visibleTo: 'admin' },
  { key: 'api', label: 'API', icon: Key, visibleTo: 'admin' },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'security', label: 'Security', icon: Shield },
]

// Each integration's real config lives in the `integrations` Supabase table
// (supabase/migrations/0004_integrations.sql) and is read/written through
// the api/integrations/* admin-only endpoints. `fields` describes which
// columns this integration exposes in the UI and how to label them —
// 'text' fields are plain (App ID, Page/Phone ID), 'secret' fields are
// write-only (masked once set, never sent back from the server).
//
// Webhook receivers: Meta Ads and WhatsApp are registered against their
// Supabase Edge Function URLs (supabase/functions/webhook-*, deployed
// manually via the Supabase Dashboard — confirmed live via the Graph API's
// /{app-id}/subscriptions endpoint on 2026-07-25). Google Ads and JustDial
// have never been configured by anyone yet (no app_id saved either
// integration), so they still point at their unused api/webhooks/* Vercel
// equivalents as a placeholder default. webhookPath may be an absolute URL
// (used as-is) or a path relative to this app's own origin.
const edgeFunctionsBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

const integrationsList = [
  {
    key: 'meta_ads',
    name: 'Meta Ads',
    description: 'Auto-capture leads from Facebook and Instagram Lead Ad forms.',
    brandColor: '#1877F2',
    icon: 'M',
    webhookPath: `${edgeFunctionsBase}/webhook-meta-ads`,
    webhookNote: 'Add this URL and your Webhook Verify Token under Meta App Dashboard → Webhooks → Page (leadgen subscription).',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'appSecret', label: 'App Secret', type: 'secret', hasKey: 'hasAppSecret' },
      { key: 'pageId', label: 'Connected Page ID', type: 'text' },
      { key: 'pageAccessToken', label: 'Page Access Token', type: 'secret', hasKey: 'hasPageAccessToken' },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'secret', hasKey: 'hasWebhookToken' },
    ],
  },
  {
    key: 'google_ads',
    name: 'Google Ads',
    description: 'Import leads from Google Ads Lead Form extensions via webhook.',
    brandColor: '#4285F4',
    icon: 'G',
    webhookPath: '/api/webhooks/google-ads',
    webhookNote: 'Paste this URL and Webhook Key into the lead form asset\'s webhook integration in Google Ads.',
    fields: [
      { key: 'webhookVerifyToken', label: 'Webhook Key', type: 'secret', hasKey: 'hasWebhookToken' },
    ],
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Inbound WhatsApp lead capture — matches incoming numbers to existing leads.',
    brandColor: '#25D366',
    icon: 'W',
    webhookPath: `${edgeFunctionsBase}/webhook-whatsapp`,
    webhookNote: 'Add this URL and your Webhook Verify Token under Meta App Dashboard → Webhooks → WhatsApp Business Account.',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'appSecret', label: 'App Secret', type: 'secret', hasKey: 'hasAppSecret' },
      { key: 'pageId', label: 'Phone Number ID', type: 'text' },
      { key: 'pageAccessToken', label: 'Access Token', type: 'secret', hasKey: 'hasPageAccessToken' },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'secret', hasKey: 'hasWebhookToken' },
    ],
  },
  {
    key: 'justdial',
    name: 'JustDial',
    description: 'Generic lead intake for JustDial, relayed via Zapier/Make or a custom script.',
    brandColor: '#DA1C24',
    icon: 'JD',
    webhookPath: '/api/webhooks/justdial',
    webhookNote: 'Send leads here as a POST with header X-Webhook-Secret set to the Webhook Secret below.',
    fields: [
      { key: 'webhookVerifyToken', label: 'Webhook Secret', type: 'secret', hasKey: 'hasWebhookToken' },
    ],
  },
  {
    key: 'email',
    name: 'Email (Gmail)',
    description: 'Send real emails to leads and students from the CRM via Gmail SMTP — replaces mailto: links, and every send is logged.',
    brandColor: '#EA4335',
    icon: 'E',
    // Send-only — no inbound webhook, so no callback URL to show.
    fields: [
      { key: 'pageId', label: 'From Email Address', type: 'text' },
      { key: 'pageAccessToken', label: 'App Password', type: 'secret', hasKey: 'hasPageAccessToken' },
    ],
  },
]

const mockApiKeys = [
  { id: 1, name: 'Production API Key', key: 'bix_prod_sk_a1b2c3d4e5f6g7h8i9j0', created: '2026-05-15', lastUsed: '2026-06-27 10:30 AM', status: 'active' },
  { id: 2, name: 'Development API Key', key: 'bix_dev_sk_x9y8w7v6u5t4s3r2q1p0', created: '2026-06-01', lastUsed: '2026-06-26 03:45 PM', status: 'active' },
  { id: 3, name: 'Testing API Key', key: 'bix_test_sk_m1n2o3p4q5r6s7t8u9v0', created: '2026-06-20', lastUsed: '2026-06-25 11:00 AM', status: 'inactive' },
]

export default function Settings() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme()
  const { session, profile, initials, isAdmin, canManageTeam, updateProfile, uploadAvatar, addTeamMember, updateTeamMemberProfile, deleteTeamMember } = useAuth()
  const { refetchAcademySettings } = useData()
  const [activeTab, setActiveTab] = useState('profile')

  // 'admin' tabs (Integrations/API) are admin-only; 'manager' tabs
  // (Team/Academy) are visible to admins and managers alike.
  const canSeeTab = (tab) => {
    if (!tab.visibleTo) return true
    if (tab.visibleTo === 'admin') return isAdmin
    return canManageTeam
  }

  // Defense in depth: users can only ever land on tabs they can see, even
  // if activeTab were somehow set to a restricted one.
  useEffect(() => {
    const tab = tabs.find(t => t.key === activeTab)
    if (tab && !canSeeTab(tab)) setActiveTab('profile')
  }, [activeTab, isAdmin, canManageTeam])

  const [draftProfile, setDraftProfile] = useState({ name: profile.name, email: profile.email, phone: profile.phone || '' })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef(null)

  const handleProfileChange = (field) => (e) => {
    setDraftProfile((prev) => ({ ...prev, [field]: e.target.value }))
    setProfileSaved(false)
  }

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError('')
    setAvatarUploading(true)
    const { error } = await uploadAvatar(file)
    setAvatarUploading(false)
    if (error) {
      setAvatarError(error.message || 'Failed to upload image')
      setTimeout(() => setAvatarError(''), 4000)
    }
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileError('')
    const { error } = await updateProfile({ name: draftProfile.name, phone: draftProfile.phone })
    setProfileSaving(false)
    if (error) {
      setProfileError(error.message || 'Failed to save profile')
      return
    }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  // Team management state (admin only)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamForm, setTeamForm] = useState({ name: '', email: '', phone: '', password: '', role: 'sales' })
  const [teamSubmitting, setTeamSubmitting] = useState(false)
  const [teamError, setTeamError] = useState('')
  const [teamSuccess, setTeamSuccess] = useState('')

  const loadTeamMembers = async () => {
    setTeamLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    if (!error) setTeamMembers(data || [])
    setTeamLoading(false)
  }

  useEffect(() => {
    if (canManageTeam) loadTeamMembers()
  }, [canManageTeam])

  const [editingMember, setEditingMember] = useState(null)
  const [memberEditForm, setMemberEditForm] = useState({ name: '', phone: '', role: 'sales' })
  const [memberEditSaving, setMemberEditSaving] = useState(false)
  const [memberEditError, setMemberEditError] = useState('')

  const openEditMember = (member) => {
    setEditingMember(member)
    setMemberEditForm({ name: member.name || '', phone: member.phone || '', role: member.role || 'sales' })
    setMemberEditError('')
  }

  const handleSaveMemberEdit = async (e) => {
    e.preventDefault()
    setMemberEditError('')
    if (!memberEditForm.name.trim()) { setMemberEditError('Name is required'); return }
    setMemberEditSaving(true)
    const { error } = await updateTeamMemberProfile(editingMember.id, {
      name: memberEditForm.name.trim(), phone: memberEditForm.phone.trim() || null, role: memberEditForm.role,
    })
    setMemberEditSaving(false)
    if (error) { setMemberEditError(error.message); return }
    setEditingMember(null)
    loadTeamMembers()
  }

  const [deletingMember, setDeletingMember] = useState(null)
  const [memberDeleteSaving, setMemberDeleteSaving] = useState(false)
  const [memberDeleteError, setMemberDeleteError] = useState('')

  const handleConfirmDeleteMember = async () => {
    setMemberDeleteSaving(true)
    setMemberDeleteError('')
    const { error } = await deleteTeamMember(deletingMember.id)
    setMemberDeleteSaving(false)
    if (error) { setMemberDeleteError(error.message); return }
    setDeletingMember(null)
    loadTeamMembers()
  }

  // Academy tab — real, persisted business info (academy_settings table)
  const [academyForm, setAcademyForm] = useState({ name: '', contactEmail: '', phone: '', website: '', gstNumber: '', address: '', attendanceThresholdPercent: 75 })
  const [academyLoading, setAcademyLoading] = useState(true)
  const [academySaving, setAcademySaving] = useState(false)
  const [academySaved, setAcademySaved] = useState(false)
  const [academyError, setAcademyError] = useState('')

  const loadAcademySettings = async () => {
    setAcademyLoading(true)
    const { data, error } = await supabase.from('academy_settings').select('*').eq('id', true).single()
    if (!error && data) {
      setAcademyForm({
        name: data.name || '',
        contactEmail: data.contact_email || '',
        phone: data.phone || '',
        website: data.website || '',
        gstNumber: data.gst_number || '',
        address: data.address || '',
        attendanceThresholdPercent: data.attendance_threshold_percent ?? 75,
      })
    }
    setAcademyLoading(false)
  }

  useEffect(() => { loadAcademySettings() }, [])

  const handleAcademyChange = (field) => (e) => {
    setAcademyForm((prev) => ({ ...prev, [field]: e.target.value }))
    setAcademySaved(false)
  }

  const handleSaveAcademy = async () => {
    setAcademySaving(true)
    setAcademyError('')
    const { error } = await supabase.from('academy_settings').update({
      name: academyForm.name,
      contact_email: academyForm.contactEmail,
      phone: academyForm.phone,
      website: academyForm.website,
      gst_number: academyForm.gstNumber,
      address: academyForm.address,
      attendance_threshold_percent: Number(academyForm.attendanceThresholdPercent) || 75,
      updated_at: new Date().toISOString(),
    }).eq('id', true)
    setAcademySaving(false)
    if (error) {
      setAcademyError(error.message)
      return
    }
    refetchAcademySettings()
    setAcademySaved(true)
    setTimeout(() => setAcademySaved(false), 2500)
  }

  const handleTeamFormChange = (field) => (e) => {
    setTeamForm((prev) => ({ ...prev, [field]: e.target.value }))
    setTeamError('')
  }

  const handleAddTeamMember = async (e) => {
    e.preventDefault()
    setTeamError('')
    setTeamSuccess('')
    if (!teamForm.name || !teamForm.email || !teamForm.password) {
      setTeamError('Name, email and password are required')
      return
    }
    setTeamSubmitting(true)
    const { error } = await addTeamMember(teamForm)
    setTeamSubmitting(false)
    if (error) {
      setTeamError(error.message)
      return
    }
    setTeamSuccess(`${teamForm.name} added successfully`)
    setTeamForm({ name: '', email: '', phone: '', password: '', role: 'sales' })
    loadTeamMembers()
  }

  // Security tab — change password (real, via Supabase Auth)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securitySaving, setSecuritySaving] = useState(false)
  const [securityError, setSecurityError] = useState('')
  const [securitySuccess, setSecuritySuccess] = useState('')

  const handleChangePassword = async () => {
    setSecurityError('')
    setSecuritySuccess('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError('All three fields are required')
      return
    }
    if (newPassword.length < 8) {
      setSecurityError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('New password and confirmation do not match')
      return
    }
    setSecuritySaving(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword })
    if (signInError) {
      setSecuritySaving(false)
      setSecurityError('Current password is incorrect')
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setSecuritySaving(false)
    if (updateError) {
      setSecurityError(updateError.message)
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSecuritySuccess('Password updated successfully')
    setTimeout(() => setSecuritySuccess(''), 4000)
  }

  const [copiedField, setCopiedField] = useState(null)
  const [visibleFields, setVisibleFields] = useState({})

  const isDark = theme === 'dark'
  const cardBg = isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'
  const inputBg = isDark ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500' : 'bg-dark-50 border-dark-200 text-dark-900 placeholder-dark-400'
  const textSecondary = isDark ? 'text-dark-400' : 'text-dark-500'
  const labelText = isDark ? 'text-dark-300' : 'text-dark-600'

  // Real integrations state — config comes from api/integrations/list,
  // which reads the `integrations` table via the service role key.
  const emptyDraft = { appId: '', pageId: '', appSecret: '', pageAccessToken: '', webhookVerifyToken: '' }
  const [integrationsConfig, setIntegrationsConfig] = useState({})
  const [integrationsLoading, setIntegrationsLoading] = useState(true)
  const [expandedIntegration, setExpandedIntegration] = useState(null)
  const [integrationDrafts, setIntegrationDrafts] = useState({})
  const [integrationSaving, setIntegrationSaving] = useState(null)
  const [integrationTesting, setIntegrationTesting] = useState(null)
  const [integrationTestResult, setIntegrationTestResult] = useState({})
  const [integrationDisconnecting, setIntegrationDisconnecting] = useState(null)
  const [auditLogOpenKey, setAuditLogOpenKey] = useState(null)
  const [auditLogs, setAuditLogs] = useState({})
  const [auditLogLoading, setAuditLogLoading] = useState(false)

  const [integrationsError, setIntegrationsError] = useState('')

  const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` })

  // The /api/* serverless functions only run under `vercel dev` or once
  // deployed to Vercel — under plain `vite`/`npm run dev` they 404 or, worse,
  // Vite serves the source file itself as text/javascript (still a 200).
  // Detect that here instead of letting res.json() silently hand back {}.
  const parseApiResponse = async (res) => {
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error("Got a non-JSON response from the API. If you're running `npm run dev`, the /api routes need `vercel dev` (or a deployed Vercel URL) to actually execute — plain Vite doesn't run them.")
    }
    return res.json()
  }

  const loadIntegrations = async () => {
    if (!session?.access_token) return
    setIntegrationsLoading(true)
    setIntegrationsError('')
    try {
      const res = await fetch('/api/integrations/list', { headers: authHeaders() })
      const body = await parseApiResponse(res)
      if (!res.ok) throw new Error(body.error || 'Failed to load integrations')
      const map = {}
      const drafts = {}
      body.integrations.forEach((row) => {
        map[row.key] = row
        drafts[row.key] = { ...emptyDraft, appId: row.appId || '', pageId: row.pageId || '' }
      })
      setIntegrationsConfig(map)
      setIntegrationDrafts(drafts)
    } catch (err) {
      setIntegrationsError(err.message)
    } finally {
      setIntegrationsLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin && activeTab === 'integrations') loadIntegrations()
  }, [isAdmin, activeTab])

  const updateDraft = (key, field, value) => {
    setIntegrationDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] || emptyDraft), [field]: value } }))
  }

  const handleToggleExpand = (key) => {
    setExpandedIntegration((prev) => (prev === key ? null : key))
    setIntegrationTestResult((prev) => ({ ...prev, [key]: null }))
  }

  const handleSaveIntegration = async (key) => {
    setIntegrationSaving(key)
    try {
      const draft = integrationDrafts[key] || emptyDraft
      const res = await fetch('/api/integrations/save', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key, ...draft }),
      })
      const body = await parseApiResponse(res)
      if (!res.ok) throw new Error(body.error || 'Failed to save')
      setIntegrationsConfig((prev) => ({ ...prev, [key]: body.integration }))
      setIntegrationDrafts((prev) => ({ ...prev, [key]: { ...emptyDraft, appId: body.integration.appId || '', pageId: body.integration.pageId || '' } }))
      setIntegrationTestResult((prev) => ({ ...prev, [key]: { ok: true, message: 'Configuration saved' } }))
    } catch (err) {
      setIntegrationTestResult((prev) => ({ ...prev, [key]: { ok: false, message: err.message } }))
    } finally {
      setIntegrationSaving(null)
    }
  }

  const handleTestIntegration = async (key) => {
    setIntegrationTesting(key)
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key }),
      })
      const body = await parseApiResponse(res)
      setIntegrationTestResult((prev) => ({ ...prev, [key]: { ok: !!body.ok, message: body.message || body.error || 'Test failed' } }))
      loadIntegrations()
    } catch (err) {
      setIntegrationTestResult((prev) => ({ ...prev, [key]: { ok: false, message: err.message } }))
    } finally {
      setIntegrationTesting(null)
    }
  }

  const handleDisconnectIntegration = async (key) => {
    if (!window.confirm('Disconnect this integration? Its App Secret / access tokens / webhook key will be cleared.')) return
    setIntegrationDisconnecting(key)
    try {
      const res = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key }),
      })
      const body = await parseApiResponse(res)
      if (!res.ok) throw new Error(body.error || 'Failed to disconnect')
      setIntegrationsConfig((prev) => ({ ...prev, [key]: body.integration }))
      setIntegrationDrafts((prev) => ({ ...prev, [key]: { ...emptyDraft } }))
    } catch (err) {
      setIntegrationTestResult((prev) => ({ ...prev, [key]: { ok: false, message: err.message } }))
    } finally {
      setIntegrationDisconnecting(null)
    }
  }

  const handleToggleAuditLog = async (key) => {
    const opening = auditLogOpenKey !== key
    setAuditLogOpenKey(opening ? key : null)
    if (opening && !auditLogs[key]) {
      setAuditLogLoading(true)
      try {
        const res = await fetch(`/api/integrations/audit-log?key=${key}`, { headers: authHeaders() })
        const body = await parseApiResponse(res)
        if (res.ok) setAuditLogs((prev) => ({ ...prev, [key]: body.logs }))
      } catch {
        setAuditLogs((prev) => ({ ...prev, [key]: [] }))
      } finally {
        setAuditLogLoading(false)
      }
    }
  }

  const copyToClipboard = (text, fieldId) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const toggleFieldVisibility = (fieldId) => {
    setVisibleFields(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))
  }

  const getStatusBadge = (status) => {
    const styles = {
      success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      warning: 'bg-accent-500/10 text-accent-500 border-accent-500/20',
    }
    return styles[status] || styles.warning
  }

  const CopyField = ({ label, value, fieldId, mono = true }) => (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>{label}</label>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={value}
          className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} ${mono ? 'font-mono' : ''} pr-12 cursor-default`}
        />
        <button
          onClick={() => copyToClipboard(value, fieldId)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-dark-200 text-dark-500'}`}
        >
          <AnimatePresence mode="wait">
            {copiedField === fieldId ? (
              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check size={14} className="text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Copy size={14} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  )

  // Write-only secret input: shows a masked placeholder once a value is
  // saved server-side, and only sends a new value up when the admin
  // actually types one (blank = "leave the existing secret alone").
  const DraftSecretField = ({ label, value, onChange, fieldId, placeholder }) => (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>{label}</label>
      <div className="relative">
        <input
          type={visibleFields[fieldId] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-mono pr-10`}
        />
        <button
          type="button"
          onClick={() => toggleFieldVisibility(fieldId)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-dark-200 text-dark-500'}`}
        >
          {visibleFields[fieldId] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )


  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Settings</h1>
        <p className={textSecondary}>Manage your account and application preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`${cardBg} border rounded-2xl p-3 lg:w-56 flex-shrink-0`}>
          <nav className="flex lg:flex-col gap-1">
            {tabs.filter(canSeeTab).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : `${isDark ? 'text-dark-400 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-500 hover:text-dark-700 hover:bg-dark-100'}`
                }`}
              >
                <tab.icon size={18} />
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex-1 space-y-6" key={activeTab}>
          {activeTab === 'profile' && (
            <>
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Personal Information</h2>
                <div className="flex items-start gap-6 mb-6">
                  <div>
                    <div className="relative group w-20 h-20">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.name} className="w-20 h-20 rounded-2xl object-cover" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold">
                          {initials}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className={`absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center transition-opacity ${
                          avatarUploading ? 'opacity-100 cursor-wait' : 'opacity-0 group-hover:opacity-100 cursor-pointer'
                        }`}
                      >
                        {avatarUploading ? (
                          <Loader2 size={20} className="text-white animate-spin" />
                        ) : (
                          <Camera size={20} className="text-white" />
                        )}
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </div>
                    {avatarError && <p className="mt-1.5 text-xs text-rose-500 max-w-[120px]">{avatarError}</p>}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{draftProfile.name}</h3>
                    <p className={`text-sm ${textSecondary}`}>{profile.role}</p>
                    <p className={`text-sm ${textSecondary}`}>{profile.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Full Name</label>
                    <input type="text" value={draftProfile.name} onChange={handleProfileChange('name')} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Email</label>
                    <input type="email" value={draftProfile.email} disabled title="Contact an administrator to change your email" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} opacity-60 cursor-not-allowed`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Phone</label>
                    <input type="tel" inputMode="numeric" maxLength={10} value={draftProfile.phone} onChange={(e) => handleProfileChange('phone')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 10) } })} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Role</label>
                    <input type="text" value={profile.role} disabled title="Only an administrator can change roles" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} opacity-60 cursor-not-allowed`} />
                  </div>
                </div>
              </motion.div>
              <motion.div variants={itemVariants} className="flex items-center justify-end gap-3">
                {profileError && <span className="text-sm text-rose-500">{profileError}</span>}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium shadow-lg transition-colors disabled:opacity-60 ${
                    profileSaved
                      ? 'bg-emerald-500 shadow-emerald-500/25 text-white'
                      : 'bg-gradient-to-r from-primary-600 to-primary-500 shadow-primary-500/25 text-white'
                  }`}
                >
                  {profileSaving ? <Loader2 size={16} className="animate-spin" /> : profileSaved ? <Check size={16} /> : <Save size={16} />}
                  {profileSaving ? 'Saving...' : profileSaved ? 'Saved' : 'Save Changes'}
                </motion.button>
              </motion.div>
            </>
          )}

          {activeTab === 'team' && (
            <>
              <motion.div variants={itemVariants}>
                <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>Team</h2>
                <p className={`text-sm mb-6 ${textSecondary}`}>Add sales team members and manage who can access the CRM</p>
              </motion.div>

              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 mb-4`}>
                <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>
                  <UserPlus size={18} /> Add Team Member
                </h3>
                <form onSubmit={handleAddTeamMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Full Name</label>
                    <input type="text" value={teamForm.name} onChange={handleTeamFormChange('name')} placeholder="e.g. Priya Kumar" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Email</label>
                    <input type="email" value={teamForm.email} onChange={handleTeamFormChange('email')} placeholder="priya@bixacademy.com" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Phone</label>
                    <input type="tel" inputMode="numeric" maxLength={10} value={teamForm.phone} onChange={(e) => handleTeamFormChange('phone')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 10) } })} placeholder="98765 43210" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Temporary Password</label>
                    <input type="text" value={teamForm.password} onChange={handleTeamFormChange('password')} placeholder="Min. 8 characters" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-mono`} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Role</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setTeamForm((prev) => ({ ...prev, role: 'sales' }))}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          teamForm.role === 'sales'
                            ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                            : isDark ? 'border-dark-700 text-dark-400 hover:bg-dark-800' : 'border-dark-200 text-dark-500 hover:bg-dark-50'
                        }`}
                      >
                        <Users size={14} /> Sales Executive
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamForm((prev) => ({ ...prev, role: 'manager' }))}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          teamForm.role === 'manager'
                            ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                            : isDark ? 'border-dark-700 text-dark-400 hover:bg-dark-800' : 'border-dark-200 text-dark-500 hover:bg-dark-50'
                        }`}
                      >
                        <Briefcase size={14} /> Manager
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setTeamForm((prev) => ({ ...prev, role: 'admin' }))}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            teamForm.role === 'admin'
                              ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                              : isDark ? 'border-dark-700 text-dark-400 hover:bg-dark-800' : 'border-dark-200 text-dark-500 hover:bg-dark-50'
                          }`}
                        >
                          <ShieldCheck size={14} /> Administrator
                        </button>
                      )}
                    </div>
                  </div>

                  {teamError && (
                    <div className="md:col-span-2 flex items-center gap-2 text-sm text-rose-500">
                      <AlertTriangle size={14} /> {teamError}
                    </div>
                  )}
                  {teamSuccess && (
                    <div className="md:col-span-2 flex items-center gap-2 text-sm text-emerald-500">
                      <Check size={14} /> {teamSuccess}
                    </div>
                  )}

                  <div className="md:col-span-2 flex justify-end">
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={teamSubmitting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 disabled:opacity-60"
                    >
                      {teamSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                      {teamSubmitting ? 'Adding...' : 'Add Team Member'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>

              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Current Team ({teamMembers.length})</h3>
                {teamLoading ? (
                  <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                    <Loader2 size={16} className="animate-spin" /> Loading team members...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div key={member.id} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            {member.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{member.name}</p>
                            <p className={`text-xs truncate ${textSecondary}`}>{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            member.role === 'admin'
                              ? 'bg-primary-500/10 text-primary-500'
                              : member.role === 'manager'
                              ? 'bg-accent-500/10 text-accent-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {member.role === 'admin' ? 'Administrator' : member.role === 'manager' ? 'Manager' : 'Sales Executive'}
                          </span>
                          {isAdmin && (
                            <>
                              <button type="button" onClick={() => openEditMember(member)}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-700' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-200'}`}>
                                <Pencil size={15} />
                              </button>
                              {member.id !== profile?.id && (
                                <button type="button" onClick={() => { setDeletingMember(member); setMemberDeleteError('') }}
                                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}

          <AnimatePresence>
            {editingMember && (
              <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingMember(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
                  className={`relative w-full max-w-md rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Edit Team Member</h2>
                    <button type="button" onClick={() => setEditingMember(null)} className={`p-1.5 rounded-lg ${isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-dark-500 hover:bg-dark-100'}`}><X size={18} /></button>
                  </div>
                  <form onSubmit={handleSaveMemberEdit} className="space-y-4">
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>Full Name</label>
                      <input type="text" required value={memberEditForm.name} onChange={(e) => setMemberEditForm((p) => ({ ...p, name: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>Phone</label>
                      <input type="tel" inputMode="numeric" maxLength={10} value={memberEditForm.phone} onChange={(e) => setMemberEditForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none ${isDark ? 'bg-dark-800 border-dark-700 text-dark-100' : 'bg-white border-dark-200 text-dark-900'}`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${textSecondary}`}>Role</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[{ key: 'sales', label: 'Sales Executive' }, { key: 'manager', label: 'Manager' }, { key: 'admin', label: 'Administrator' }].map((r) => (
                          <button key={r.key} type="button" onClick={() => setMemberEditForm((p) => ({ ...p, role: r.key }))}
                            className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                              memberEditForm.role === r.key
                                ? isDark ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-primary-500 bg-primary-50 text-primary-600'
                                : isDark ? 'border-dark-700 text-dark-400' : 'border-dark-200 text-dark-500'
                            }`}>{r.label}</button>
                        ))}
                      </div>
                    </div>
                    {memberEditError && <p className="text-xs text-rose-500">{memberEditError}</p>}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setEditingMember(null)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                      <button type="submit" disabled={memberEditSaving}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-60 transition-all">
                        {memberEditSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {deletingMember && (
              <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingMember(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                <motion.div variants={modalCardVariants} initial="hidden" animate="visible" exit="exit"
                  className={`relative w-full max-w-sm rounded-2xl p-6 z-10 ${isDark ? 'bg-dark-900 border border-dark-700/60 shadow-2xl' : 'bg-white border border-dark-200/60 shadow-2xl'}`}>
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
                      <AlertTriangle className="w-6 h-6 text-rose-500" />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Remove Team Member</h3>
                    <p className={`text-sm mb-2 ${textSecondary}`}>
                      Remove <strong>{deletingMember.name}</strong>'s account? They will no longer be able to log in, and this can't be undone.
                    </p>
                    {memberDeleteError && <p className="text-xs text-rose-500 mb-2">{memberDeleteError}</p>}
                    <div className="flex items-center gap-3 w-full mt-4">
                      <button type="button" onClick={() => setDeletingMember(null)}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>Cancel</button>
                      <button type="button" onClick={handleConfirmDeleteMember} disabled={memberDeleteSaving}
                        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-60 transition-all">
                        {memberDeleteSaving ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'academy' && (
            <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
              <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Academy Information</h2>
              {academyLoading ? (
                <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                  <Loader2 size={16} className="animate-spin" /> Loading...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Academy Name</label>
                      <input type="text" value={academyForm.name} onChange={handleAcademyChange('name')} disabled={!canManageTeam} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Contact Email</label>
                      <div className="relative">
                        <Mail size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
                        <input type="email" value={academyForm.contactEmail} onChange={handleAcademyChange('contactEmail')} disabled={!canManageTeam} className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60`} />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Phone Number</label>
                      <div className="relative">
                        <Phone size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
                        <input type="tel" inputMode="numeric" maxLength={10} value={academyForm.phone} onChange={(e) => handleAcademyChange('phone')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 10) } })} disabled={!canManageTeam} className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60`} />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Website</label>
                      <div className="relative">
                        <Globe size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
                        <input type="url" value={academyForm.website} onChange={handleAcademyChange('website')} disabled={!canManageTeam} className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60`} />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>GST Number</label>
                      <input type="text" value={academyForm.gstNumber} onChange={handleAcademyChange('gstNumber')} disabled={!canManageTeam} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Attendance Alert Threshold (%)</label>
                      <input type="number" min="1" max="100" value={academyForm.attendanceThresholdPercent} onChange={handleAcademyChange('attendanceThresholdPercent')} disabled={!canManageTeam} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-60`} />
                      <p className={`text-xs mt-1 ${textSecondary}`}>Students below this attendance % are flagged "Needs Attention".</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Address</label>
                      <div className="relative">
                        <MapPin size={16} className={`absolute left-3 top-3 ${textSecondary}`} />
                        <textarea rows={2} value={academyForm.address} onChange={handleAcademyChange('address')} disabled={!canManageTeam} className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none disabled:opacity-60`} />
                      </div>
                    </div>
                  </div>
                  {!canManageTeam && <p className={`text-sm mt-4 ${textSecondary}`}>Only administrators and managers can edit academy information.</p>}
                  {academyError && <p className="text-sm mt-4 text-rose-500">{academyError}</p>}
                  {canManageTeam && (
                    <div className="flex justify-end mt-6">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveAcademy}
                        disabled={academySaving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium shadow-lg transition-colors disabled:opacity-60 ${
                          academySaved
                            ? 'bg-emerald-500 shadow-emerald-500/25 text-white'
                            : 'bg-gradient-to-r from-primary-600 to-primary-500 shadow-primary-500/25 text-white'
                        }`}
                      >
                        {academySaving ? <Loader2 size={16} className="animate-spin" /> : academySaved ? <Check size={16} /> : <Save size={16} />}
                        {academySaving ? 'Saving...' : academySaved ? 'Saved' : 'Save Changes'}
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'integrations' && (
            <>
              <motion.div variants={itemVariants}>
                <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>Integrations</h2>
                <p className={`text-sm mb-6 ${textSecondary}`}>Webhook URLs, API keys, and connection status for every lead-capture platform. Only administrators can view this page.</p>
              </motion.div>

              {!isAdmin ? (
                <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 text-sm ${textSecondary}`}>
                  Only administrators can view or configure integrations.
                </motion.div>
              ) : integrationsLoading ? (
                <motion.div variants={itemVariants} className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                  <Loader2 size={16} className="animate-spin" /> Loading integrations...
                </motion.div>
              ) : integrationsError ? (
                <motion.div variants={itemVariants} className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-500">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p>{integrationsError}</p>
                    <button onClick={loadIntegrations} className="mt-2 font-medium underline underline-offset-2">Retry</button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {integrationsList.map((integration) => {
                    const cfg = integrationsConfig[integration.key] || {}
                    const draft = integrationDrafts[integration.key] || emptyDraft
                    const isExpanded = expandedIntegration === integration.key
                    const webhookUrl = integration.webhookPath
                      ? (/^https?:\/\//.test(integration.webhookPath) ? integration.webhookPath : `${window.location.origin}${integration.webhookPath}`)
                      : null
                    const testResult = integrationTestResult[integration.key]
                    const statusMeta = {
                      connected: { label: 'Connected', dot: 'bg-emerald-500', text: 'text-emerald-500' },
                      error: { label: 'Error', dot: 'bg-rose-500', text: 'text-rose-500' },
                      not_connected: { label: 'Not Connected', dot: isDark ? 'bg-dark-600' : 'bg-dark-300', text: textSecondary },
                    }[cfg.status || 'not_connected']

                    return (
                      <motion.div key={integration.key} variants={itemVariants} className={`${cardBg} border rounded-2xl overflow-hidden`}>
                        <button
                          onClick={() => handleToggleExpand(integration.key)}
                          className="w-full flex items-center gap-4 p-5 text-left"
                        >
                          <ChevronRight size={16} className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''} ${textSecondary}`} />
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg"
                            style={{ backgroundColor: integration.brandColor }}
                          >
                            {integration.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{integration.name}</h3>
                            <p className={`text-sm truncate ${textSecondary}`}>{integration.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {cfg.lastSyncedAt && (
                              <p className={`text-xs mb-1 ${textSecondary}`}>Last synced {new Date(cfg.lastSyncedAt).toLocaleString()}</p>
                            )}
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusMeta.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} /> {statusMeta.label}
                            </span>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className={`p-5 pt-0 space-y-5 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                                {cfg.status === 'error' && cfg.lastError && (
                                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-500 mt-5">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {cfg.lastError}
                                  </div>
                                )}

                                {webhookUrl && (
                                  <div className={cfg.status === 'error' ? '' : 'pt-5'}>
                                    <CopyField label="Webhook callback URL" value={webhookUrl} fieldId={`webhook-url-${integration.key}`} />
                                    <p className={`text-xs mt-1.5 ${textSecondary}`}>{integration.webhookNote}</p>
                                  </div>
                                )}

                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!webhookUrl && cfg.status !== 'error' ? 'pt-5' : ''}`}>
                                  {integration.fields.map((field) => field.type === 'secret' ? (
                                    <DraftSecretField
                                      key={field.key}
                                      label={field.label}
                                      value={draft[field.key]}
                                      onChange={(v) => updateDraft(integration.key, field.key, v)}
                                      fieldId={`${integration.key}-${field.key}`}
                                      placeholder={cfg[field.hasKey] ? '•••••••• (set — enter a new value to change)' : 'Not set'}
                                    />
                                  ) : (
                                    <div key={field.key}>
                                      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>{field.label}</label>
                                      <input
                                        type="text"
                                        value={draft[field.key]}
                                        onChange={(e) => updateDraft(integration.key, field.key, e.target.value)}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-mono`}
                                      />
                                    </div>
                                  ))}
                                </div>

                                {testResult && (
                                  <div className={`flex items-center gap-2 text-sm ${testResult.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {testResult.ok ? <Check size={14} /> : <AlertTriangle size={14} />} {testResult.message}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center gap-3">
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSaveIntegration(integration.key)}
                                    disabled={integrationSaving === integration.key}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-primary-500/25 disabled:opacity-60"
                                  >
                                    {integrationSaving === integration.key ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {integrationSaving === integration.key ? 'Saving...' : 'Save Configuration'}
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleTestIntegration(integration.key)}
                                    disabled={integrationTesting === integration.key}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-60 ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                                  >
                                    {integrationTesting === integration.key ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                    {integrationTesting === integration.key ? 'Testing...' : 'Test Connection'}
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleDisconnectIntegration(integration.key)}
                                    disabled={integrationDisconnecting === integration.key}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:opacity-60"
                                  >
                                    {integrationDisconnecting === integration.key ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                    Disconnect
                                  </motion.button>
                                  <button
                                    onClick={() => handleToggleAuditLog(integration.key)}
                                    className={`ml-auto text-sm font-medium ${isDark ? 'text-dark-300 hover:text-white' : 'text-dark-600 hover:text-dark-900'}`}
                                  >
                                    {auditLogOpenKey === integration.key ? 'Hide audit log' : 'View audit log'}
                                  </button>
                                </div>

                                <AnimatePresence>
                                  {auditLogOpenKey === integration.key && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-x-auto">
                                      {auditLogLoading && !auditLogs[integration.key] ? (
                                        <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                                          <Loader2 size={14} className="animate-spin" /> Loading...
                                        </div>
                                      ) : (auditLogs[integration.key] || []).length === 0 ? (
                                        <p className={`text-sm ${textSecondary}`}>No activity yet.</p>
                                      ) : (
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className={`border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                                              <th className={`text-left py-2 pr-4 font-medium ${labelText}`}>Timestamp</th>
                                              <th className={`text-left py-2 pr-4 font-medium ${labelText}`}>Action</th>
                                              <th className={`text-left py-2 pr-4 font-medium ${labelText}`}>Details</th>
                                              <th className={`text-left py-2 font-medium ${labelText}`}>Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {auditLogs[integration.key].map((log) => (
                                              <tr key={log.id} className={`border-b ${isDark ? 'border-dark-800/60' : 'border-dark-100/60'}`}>
                                                <td className={`py-2 pr-4 font-mono text-xs whitespace-nowrap ${textSecondary}`}>{new Date(log.created_at).toLocaleString()}</td>
                                                <td className={`py-2 pr-4 whitespace-nowrap font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{log.action}</td>
                                                <td className={`py-2 pr-4 ${textSecondary} max-w-xs truncate`}>{log.detail}</td>
                                                <td className="py-2">
                                                  <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(log.status)}`}>
                                                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'api' && (
            <>
              <motion.div variants={itemVariants}>
                <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>API Management</h2>
                <p className={`text-sm mb-6 ${textSecondary}`}>
                  There is no public API for third-party access yet — the entries below are illustrative only. Real integrations (Meta Ads, Google Ads, WhatsApp, JustDial) are configured under the Integrations tab instead.
                </p>
              </motion.div>

              {/* API Keys */}
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 mb-4 opacity-60`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>API Keys</h3>
                  <motion.button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-primary-500/25 cursor-not-allowed"
                  >
                    <Plus size={14} /> Generate New API Key
                  </motion.button>
                </div>

                <div className="space-y-3">
                  {mockApiKeys.map(apiKey => (
                    <div key={apiKey.id} className={`flex items-center gap-4 p-4 rounded-xl border ${isDark ? 'border-dark-700/60 bg-dark-800/50' : 'border-dark-200/60 bg-dark-50/50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>{apiKey.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            apiKey.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-dark-500/10 text-dark-500'
                          }`}>
                            {apiKey.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className={`text-xs font-mono ${textSecondary}`}>
                            {visibleFields[`apiKey-${apiKey.id}`] ? apiKey.key : apiKey.key.slice(0, 12) + '...' + apiKey.key.slice(-4)}
                          </code>
                          <button
                            onClick={() => toggleFieldVisibility(`apiKey-${apiKey.id}`)}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-500' : 'hover:bg-dark-200 text-dark-400'}`}
                          >
                            {visibleFields[`apiKey-${apiKey.id}`] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key, `apiKey-${apiKey.id}`)}
                            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-500' : 'hover:bg-dark-200 text-dark-400'}`}
                          >
                            {copiedField === `apiKey-${apiKey.id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <p className={`text-xs mt-1 ${textSecondary}`}>
                          Created: {apiKey.created} | Last used: {apiKey.lastUsed}
                        </p>
                      </div>
                      <button className={`p-2 rounded-lg transition-colors text-rose-500 hover:bg-rose-500/10`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Usage Statistics */}
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 mb-4 opacity-60`}>
                <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Usage Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-xl border ${isDark ? 'border-dark-700/60 bg-dark-800/50' : 'border-dark-200/60 bg-dark-50/50'}`}>
                    <p className={`text-sm ${textSecondary}`}>Requests Today</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>1,247</p>
                    <p className="text-xs text-emerald-500 mt-1">+12% from yesterday</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'border-dark-700/60 bg-dark-800/50' : 'border-dark-200/60 bg-dark-50/50'}`}>
                    <p className={`text-sm ${textSecondary}`}>Requests This Month</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>28,493</p>
                    <p className="text-xs text-emerald-500 mt-1">+8% from last month</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'border-dark-700/60 bg-dark-800/50' : 'border-dark-200/60 bg-dark-50/50'}`}>
                    <p className={`text-sm ${textSecondary}`}>Error Rate</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>0.3%</p>
                    <p className="text-xs text-emerald-500 mt-1">Below threshold</p>
                  </div>
                </div>
              </motion.div>

              {/* Rate Limiting & Docs */}
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Rate Limiting & Documentation</h3>
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${isDark ? 'border-dark-700/60 bg-dark-800/50' : 'border-dark-200/60 bg-dark-50/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Current Plan: Professional</p>
                      <span className={`text-sm ${textSecondary}`}>1,247 / 10,000 requests today</span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`}>
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: '12.47%' }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                      <Activity size={18} className="text-primary-500" />
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Rate Limit</p>
                        <p className={`text-xs ${textSecondary}`}>100 requests / minute</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                      <Database size={18} className="text-primary-500" />
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Daily Limit</p>
                        <p className={`text-xs ${textSecondary}`}>10,000 requests / day</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                    >
                      <ExternalLink size={14} /> API Documentation
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                    >
                      <ExternalLink size={14} /> SDK Reference
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {activeTab === 'notifications' && (
            <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
              <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-dark-900'}`}>Notification Preferences</h2>
              <p className={`text-sm mb-6 ${textSecondary}`}>
                The bell icon in the header already shows live alerts (due follow-ups, new leads, overdue fees, low attendance) computed from your real data.
                Per-category email/push delivery preferences below aren&apos;t wired to a delivery provider yet, so they&apos;re shown for reference only.
              </p>
              <div className="space-y-4 opacity-60">
                {[
                  { title: 'New Lead Alerts', description: 'Get notified when a new lead is registered', enabled: true },
                  { title: 'Follow-up Reminders', description: 'Receive reminders for scheduled follow-ups', enabled: true },
                  { title: 'Payment Notifications', description: 'Alerts when a student makes a payment', enabled: true },
                  { title: 'Fee Due Reminders', description: 'Notifications for upcoming fee due dates', enabled: true },
                  { title: 'Enrollment Updates', description: 'Get notified about new enrollments', enabled: false },
                  { title: 'Email Digest', description: 'Daily summary of all activities', enabled: false },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 ${i > 0 ? `border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}` : ''}`}>
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>{item.title}</p>
                      <p className={`text-sm ${textSecondary}`}>{item.description}</p>
                    </div>
                    <button disabled className={`relative w-11 h-6 rounded-full cursor-not-allowed ${item.enabled ? 'bg-primary-500' : isDark ? 'bg-dark-700' : 'bg-dark-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${item.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
              <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Appearance</h2>
              <div className="space-y-6">
                <div>
                  <p className={`font-medium text-sm mb-3 ${isDark ? 'text-white' : 'text-dark-900'}`}>Theme</p>
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => theme === 'dark' && toggleTheme()}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all ${!isDark ? 'border-primary-500 shadow-lg shadow-primary-500/10' : `${isDark ? 'border-dark-700' : 'border-dark-200'}`}`}
                    >
                      <div className="w-full h-20 rounded-xl bg-white border border-dark-200 mb-3 flex items-center justify-center">
                        <Sun size={24} className="text-accent-500" />
                      </div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Light Mode</p>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => theme === 'light' && toggleTheme()}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all ${isDark ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-dark-200'}`}
                    >
                      <div className="w-full h-20 rounded-xl bg-dark-900 border border-dark-700 mb-3 flex items-center justify-center">
                        <Moon size={24} className="text-primary-400" />
                      </div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Dark Mode</p>
                    </motion.button>
                  </div>
                </div>
                <div>
                  <p className={`font-medium text-sm mb-3 ${isDark ? 'text-white' : 'text-dark-900'}`}>Accent Color</p>
                  <div className="flex gap-3">
                    {[
                      { name: 'Indigo', color: 'bg-primary-500' },
                      { name: 'Emerald', color: 'bg-emerald-500' },
                      { name: 'Rose', color: 'bg-rose-500' },
                      { name: 'Amber', color: 'bg-accent-500' },
                      { name: 'Sky', color: 'bg-sky-500' },
                    ].map(c => (
                      <motion.button
                        key={c.name}
                        type="button"
                        whileHover={{ scale: accentColor === c.name ? 1 : 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAccentColor(c.name)}
                        className={`w-10 h-10 rounded-xl ${c.color} transition-all ${
                          accentColor === c.name
                            ? `ring-2 ring-offset-2 ring-primary-500 ${isDark ? 'ring-offset-dark-900' : 'ring-offset-white'}`
                            : ''
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
              <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Security</h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Current Password</label>
                  <input type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>New Password</label>
                  <input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Confirm Password</label>
                  <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                {securityError && <p className="text-sm text-rose-500">{securityError}</p>}
                {securitySuccess && <p className="text-sm text-emerald-500">{securitySuccess}</p>}
                <div className="pt-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Two-Factor Authentication</p>
                      <p className={`text-sm ${textSecondary}`}>Coming soon</p>
                    </div>
                    <button disabled className={`px-4 py-2 rounded-xl text-sm font-medium border opacity-50 cursor-not-allowed ${isDark ? 'border-dark-700 text-dark-300' : 'border-dark-200 text-dark-600'}`}>
                      Enable
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleChangePassword}
                  disabled={securitySaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 disabled:opacity-60"
                >
                  {securitySaving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  {securitySaving ? 'Updating...' : 'Update Password'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
