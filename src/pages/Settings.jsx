import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Database, Mail,
  Sun, Moon, Save, Camera, Building2, Phone, MapPin, Plug, Key, Eye, EyeOff,
  Copy, Check, X, Loader2, RefreshCw, Plus, Trash2, Download, Filter,
  ArrowRight, ExternalLink, ChevronLeft, AlertTriangle, Activity, Clock,
  Zap, ToggleLeft, ToggleRight, ArrowLeftRight, Search, Users, UserPlus, ShieldCheck
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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
  { key: 'team', label: 'Team', icon: Users },
  { key: 'academy', label: 'Academy', icon: Building2 },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'webhooks', label: 'Webhooks', icon: Globe },
  { key: 'api', label: 'API', icon: Key },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'security', label: 'Security', icon: Shield },
]

const integrationsList = [
  {
    id: 'metaAds',
    name: 'Meta Ads',
    description: 'Import leads automatically from Meta Ads campaigns',
    brandColor: '#1877F2',
    icon: 'M',
    webhookSlug: 'meta-ads',
  },
  {
    id: 'justDial',
    name: 'JustDial',
    description: 'Sync leads from JustDial business listings',
    brandColor: '#2196F3',
    icon: 'JD',
    webhookSlug: 'justdial',
  },
  {
    id: 'googleAds',
    name: 'Google Ads',
    description: 'Import leads from Google Ads campaigns and forms',
    brandColor: '#4285F4',
    icon: 'G',
    webhookSlug: 'google-ads',
  },
]

const configSubTabs = [
  { key: 'api-config', label: 'API Configuration' },
  { key: 'webhook-setup', label: 'Webhook Setup' },
  { key: 'field-mapping', label: 'Field Mapping' },
  { key: 'sync-settings', label: 'Sync Settings' },
  { key: 'activity-log', label: 'Activity Log' },
]

const defaultFieldMappings = [
  { source: 'Name', crm: 'Lead Name' },
  { source: 'Email', crm: 'Lead Email' },
  { source: 'Phone', crm: 'Lead Phone' },
  { source: 'Campaign', crm: 'Source' },
  { source: 'Ad Set', crm: 'Notes' },
]

const crmFieldOptions = ['Lead Name', 'Lead Email', 'Lead Phone', 'Source', 'Notes', 'Company', 'Address', 'City', 'State', 'Custom Field 1', 'Custom Field 2']

const mockActivityLogs = [
  { id: 1, timestamp: '2026-06-27 10:30:15', action: 'Lead Imported', details: 'Imported lead "Rahul Sharma" from Meta campaign "Summer Batch"', status: 'success' },
  { id: 2, timestamp: '2026-06-27 10:28:42', action: 'Webhook Received', details: 'Received form submission webhook from Meta Ads', status: 'success' },
  { id: 3, timestamp: '2026-06-27 10:15:03', action: 'Sync Error', details: 'Failed to sync lead - duplicate email detected (priya@email.com)', status: 'failed' },
  { id: 4, timestamp: '2026-06-27 09:45:22', action: 'Lead Imported', details: 'Imported lead "Amit Patel" from Google Ads form "Free Demo"', status: 'success' },
  { id: 5, timestamp: '2026-06-27 09:30:11', action: 'Campaign Status Change', details: 'Campaign "Java Full Stack" status changed to Active', status: 'warning' },
  { id: 6, timestamp: '2026-06-27 09:15:00', action: 'Bulk Sync', details: 'Synced 12 leads from Google Ads campaign "Data Science Batch 4"', status: 'success' },
  { id: 7, timestamp: '2026-06-26 18:00:45', action: 'Lead Updated', details: 'Updated phone number for lead "Sneha Reddy" from JustDial', status: 'success' },
  { id: 8, timestamp: '2026-06-26 17:30:22', action: 'Sync Error', details: 'API rate limit exceeded for Meta Ads - retrying in 5 minutes', status: 'failed' },
  { id: 9, timestamp: '2026-06-26 16:45:10', action: 'Webhook Received', details: 'Received new lead webhook from JustDial', status: 'success' },
  { id: 10, timestamp: '2026-06-26 15:20:33', action: 'Connection Test', details: 'Google Ads API connection test successful', status: 'warning' },
]

const mockApiKeys = [
  { id: 1, name: 'Production API Key', key: 'bix_prod_sk_a1b2c3d4e5f6g7h8i9j0', created: '2026-05-15', lastUsed: '2026-06-27 10:30 AM', status: 'active' },
  { id: 2, name: 'Development API Key', key: 'bix_dev_sk_x9y8w7v6u5t4s3r2q1p0', created: '2026-06-01', lastUsed: '2026-06-26 03:45 PM', status: 'active' },
  { id: 3, name: 'Testing API Key', key: 'bix_test_sk_m1n2o3p4q5r6s7t8u9v0', created: '2026-06-20', lastUsed: '2026-06-25 11:00 AM', status: 'inactive' },
]

const mockWebhooksList = [
  { id: 1, integration: 'Meta Ads', url: 'https://api.bixacademy.com/webhooks/meta-ads/abc123', events: ['New Lead Created', 'Form Submission'], status: 'active', lastTriggered: '2026-06-27 10:28 AM' },
  { id: 2, integration: 'JustDial', url: 'https://api.bixacademy.com/webhooks/justdial/def456', events: ['New Lead Created', 'Lead Updated'], status: 'active', lastTriggered: '2026-06-26 04:45 PM' },
  { id: 3, integration: 'Google Ads', url: 'https://api.bixacademy.com/webhooks/google-ads/ghi789', events: ['New Lead Created', 'Form Submission', 'Campaign Status Change'], status: 'active', lastTriggered: '2026-06-27 09:15 AM' },
  { id: 4, integration: 'Meta Ads', url: 'https://api.bixacademy.com/webhooks/meta-ads/jkl012', events: ['Campaign Status Change'], status: 'inactive', lastTriggered: '2026-06-20 02:00 PM' },
]

export default function Settings() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme()
  const { profile, initials, isAdmin, updateProfile, uploadAvatar, addTeamMember } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

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
    if (isAdmin) loadTeamMembers()
  }, [isAdmin])

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

  // Integration states
  const [integrations, setIntegrations] = useState({
    metaAds: { connected: true, lastSync: '2026-06-27 10:30 AM' },
    justDial: { connected: false, lastSync: null },
    googleAds: { connected: true, lastSync: '2026-06-27 09:15 AM' },
  })
  const [configuring, setConfiguring] = useState(null)
  const [configTab, setConfigTab] = useState('api-config')
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const [visibleFields, setVisibleFields] = useState({})
  const [webhookEvents, setWebhookEvents] = useState({
    newLead: true,
    leadUpdated: true,
    formSubmission: false,
    campaignStatus: false,
  })
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    frequency: 'every15min',
    direction: 'one-way',
    duplicateHandling: 'update',
    defaultStatus: 'new',
    defaultPriority: 'medium',
  })
  const [fieldMappings, setFieldMappings] = useState(defaultFieldMappings)
  const [logFilter, setLogFilter] = useState('all')
  const [testingWebhook, setTestingWebhook] = useState(false)

  const isDark = theme === 'dark'
  const cardBg = isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'
  const inputBg = isDark ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500' : 'bg-dark-50 border-dark-200 text-dark-900 placeholder-dark-400'
  const textSecondary = isDark ? 'text-dark-400' : 'text-dark-500'
  const labelText = isDark ? 'text-dark-300' : 'text-dark-600'

  const toggleConnection = (integrationId) => {
    setIntegrations(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        connected: !prev[integrationId].connected,
        lastSync: !prev[integrationId].connected ? new Date().toLocaleString() : prev[integrationId].lastSync,
      }
    }))
  }

  const handleTestConnection = () => {
    setTestingConnection(true)
    setTestResult(null)
    setTimeout(() => {
      setTestingConnection(false)
      setTestResult('success')
      setTimeout(() => setTestResult(null), 3000)
    }, 2000)
  }

  const handleTestWebhook = () => {
    setTestingWebhook(true)
    setTimeout(() => {
      setTestingWebhook(false)
    }, 2000)
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

  const SecretField = ({ label, value, fieldId }) => (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>{label}</label>
      <div className="relative">
        <input
          type={visibleFields[fieldId] ? 'text' : 'password'}
          defaultValue={value}
          className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-mono pr-20`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button
            onClick={() => toggleFieldVisibility(fieldId)}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-dark-200 text-dark-500'}`}
          >
            {visibleFields[fieldId] ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            onClick={() => copyToClipboard(value, fieldId)}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-400' : 'hover:bg-dark-200 text-dark-500'}`}
          >
            {copiedField === fieldId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  )

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

  const renderIntegrationConfig = () => {
    const integration = integrationsList.find(i => i.id === configuring)
    if (!integration) return null

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        {/* Config Header */}
        <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setConfiguring(null); setConfigTab('api-config'); setTestResult(null); }}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-dark-800 text-dark-400' : 'hover:bg-dark-100 text-dark-500'}`}
            >
              <ChevronLeft size={20} />
            </button>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: integration.brandColor }}
            >
              {integration.icon}
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>
                {integration.name} Configuration
              </h2>
              <p className={`text-sm ${textSecondary}`}>{integration.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${integrations[integration.id].connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={`text-sm font-medium ${integrations[integration.id].connected ? 'text-emerald-500' : 'text-rose-500'}`}>
                {integrations[integration.id].connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {configSubTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setConfigTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  configTab === tab.key
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : `${isDark ? 'bg-dark-800 text-dark-400 hover:text-dark-200' : 'bg-dark-100 text-dark-500 hover:text-dark-700'}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Sub-tab Content */}
        <div key={configTab}>
            {configTab === 'api-config' && (
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h3 className={`text-base font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>API Configuration</h3>
                <div className="space-y-4">
                  <SecretField label="API Key / App ID" value="ak_1a2b3c4d5e6f7g8h9i0j" fieldId="apiKey" />
                  <SecretField label="API Secret / App Secret" value="as_x9y8w7v6u5t4s3r2q1p0" fieldId="apiSecret" />
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Account ID / Campaign ID</label>
                    <input
                      type="text"
                      defaultValue="act_123456789"
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-mono`}
                    />
                  </div>
                  <SecretField label="Access Token" value="EAABsbCS1IHDBO4gT8kZB5Wd..." fieldId="accessToken" />

                  {integrations[integration.id].lastSync && (
                    <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                      <Clock size={14} />
                      <span>Last synced: {integrations[integration.id].lastSync}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        testResult === 'success'
                          ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                          : testResult === 'error'
                          ? 'border-rose-500 text-rose-500 bg-rose-500/10'
                          : isDark
                          ? 'border-dark-700 text-dark-300 hover:bg-dark-800'
                          : 'border-dark-200 text-dark-600 hover:bg-dark-50'
                      }`}
                    >
                      {testingConnection ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : testResult === 'success' ? (
                        <Check size={16} />
                      ) : testResult === 'error' ? (
                        <X size={16} />
                      ) : (
                        <Zap size={16} />
                      )}
                      {testingConnection ? 'Testing...' : testResult === 'success' ? 'Connection Successful' : testResult === 'error' ? 'Connection Failed' : 'Test Connection'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-primary-500/25"
                    >
                      <Save size={16} /> Save Configuration
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {configTab === 'webhook-setup' && (
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h3 className={`text-base font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Webhook Setup</h3>
                <div className="space-y-5">
                  <CopyField
                    label="Webhook URL"
                    value={`https://api.bixacademy.com/webhooks/${integration.webhookSlug}/abc123`}
                    fieldId="webhookUrl"
                  />
                  <CopyField
                    label="Webhook Secret Key"
                    value="whsec_k7m2n9p4q1r8s5t0u3v6w"
                    fieldId="webhookSecret"
                  />

                  <div>
                    <label className={`block text-sm font-medium mb-3 ${labelText}`}>Webhook Events</label>
                    <div className="space-y-3">
                      {[
                        { key: 'newLead', label: 'New Lead Created' },
                        { key: 'leadUpdated', label: 'Lead Updated' },
                        { key: 'formSubmission', label: 'Form Submission' },
                        { key: 'campaignStatus', label: 'Campaign Status Change' },
                      ].map(event => (
                        <label key={event.key} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={webhookEvents[event.key]}
                            onChange={() => setWebhookEvents(prev => ({ ...prev, [event.key]: !prev[event.key] }))}
                            className="w-4 h-4 rounded border-dark-300 text-primary-500 focus:ring-primary-500"
                          />
                          <span className={`text-sm ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{event.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${labelText}`}>Webhook Status:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium text-emerald-500">Active</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                    >
                      <RefreshCw size={14} /> Regenerate Webhook URL
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleTestWebhook}
                      disabled={testingWebhook}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                    >
                      {testingWebhook ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {testingWebhook ? 'Sending...' : 'Test Webhook'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {configTab === 'field-mapping' && (
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h3 className={`text-base font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Field Mapping</h3>
                <div className="space-y-4">
                  <div className={`grid grid-cols-[1fr,auto,1fr] gap-3 items-center text-sm font-medium ${labelText}`}>
                    <span>Source Field</span>
                    <span />
                    <span>CRM Field</span>
                  </div>
                  {fieldMappings.map((mapping, index) => (
                    <div key={index} className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                      <input
                        type="text"
                        value={mapping.source}
                        readOnly
                        className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} cursor-default`}
                      />
                      <ArrowRight size={16} className={textSecondary} />
                      <select
                        value={mapping.crm}
                        onChange={(e) => {
                          const updated = [...fieldMappings]
                          updated[index] = { ...updated[index], crm: e.target.value }
                          setFieldMappings(updated)
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                      >
                        {crmFieldOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFieldMappings(prev => [...prev, { source: '', crm: 'Lead Name' }])}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                    >
                      <Plus size={14} /> Add Custom Mapping
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-primary-500/25"
                    >
                      <Save size={16} /> Save Mappings
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {configTab === 'sync-settings' && (
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h3 className={`text-base font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Sync Settings</h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Auto-Sync</p>
                      <p className={`text-sm ${textSecondary}`}>Automatically sync leads from this integration</p>
                    </div>
                    <button
                      onClick={() => setSyncSettings(prev => ({ ...prev, autoSync: !prev.autoSync }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${syncSettings.autoSync ? 'bg-primary-500' : isDark ? 'bg-dark-700' : 'bg-dark-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${syncSettings.autoSync ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Sync Frequency</label>
                    <select
                      value={syncSettings.frequency}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, frequency: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                    >
                      <option value="realtime">Real-time</option>
                      <option value="every5min">Every 5 minutes</option>
                      <option value="every15min">Every 15 minutes</option>
                      <option value="everyhour">Every hour</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Sync Direction</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSyncSettings(prev => ({ ...prev, direction: 'one-way' }))}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          syncSettings.direction === 'one-way'
                            ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                            : isDark ? 'border-dark-700 text-dark-400 hover:bg-dark-800' : 'border-dark-200 text-dark-500 hover:bg-dark-50'
                        }`}
                      >
                        <ArrowRight size={14} /> One-way (Import)
                      </button>
                      <button
                        onClick={() => setSyncSettings(prev => ({ ...prev, direction: 'two-way' }))}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          syncSettings.direction === 'two-way'
                            ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                            : isDark ? 'border-dark-700 text-dark-400 hover:bg-dark-800' : 'border-dark-200 text-dark-500 hover:bg-dark-50'
                        }`}
                      >
                        <ArrowLeftRight size={14} /> Two-way
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Duplicate Handling</label>
                    <select
                      value={syncSettings.duplicateHandling}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, duplicateHandling: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                    >
                      <option value="skip">Skip Duplicates</option>
                      <option value="update">Update Existing</option>
                      <option value="create">Create New</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Default Lead Status on Import</label>
                    <select
                      value={syncSettings.defaultStatus}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, defaultStatus: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="nurturing">Nurturing</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Default Priority Assignment</label>
                    <select
                      value={syncSettings.defaultPriority}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, defaultPriority: e.target.value }))}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-primary-500/25"
                    >
                      <Save size={16} /> Save Settings
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {configTab === 'activity-log' && (
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Activity Log</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${inputBg} focus:outline-none`}
                    >
                      <option value="all">All Status</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="warning">Warning</option>
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-2 rounded-lg text-sm ${isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-dark-500 hover:bg-dark-100'}`}
                      title="Clear Logs"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-2 rounded-lg text-sm ${isDark ? 'text-dark-400 hover:bg-dark-800' : 'text-dark-500 hover:bg-dark-100'}`}
                      title="Export Logs"
                    >
                      <Download size={16} />
                    </motion.button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Timestamp</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Action</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Details</th>
                        <th className={`text-left py-3 font-medium ${labelText}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockActivityLogs
                        .filter(log => logFilter === 'all' || log.status === logFilter)
                        .map(log => (
                          <tr key={log.id} className={`border-b ${isDark ? 'border-dark-800/60' : 'border-dark-100/60'}`}>
                            <td className={`py-3 pr-4 font-mono text-xs whitespace-nowrap ${textSecondary}`}>{log.timestamp}</td>
                            <td className={`py-3 pr-4 whitespace-nowrap font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{log.action}</td>
                            <td className={`py-3 pr-4 ${textSecondary} max-w-xs truncate`}>{log.details}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(log.status)}`}>
                                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Settings</h1>
        <p className={textSecondary}>Manage your account and application preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`${cardBg} border rounded-2xl p-3 lg:w-56 flex-shrink-0`}>
          <nav className="flex lg:flex-col gap-1">
            {tabs.map(tab => (
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
                    <input type="tel" value={draftProfile.phone} onChange={handleProfileChange('phone')} className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
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
                    <input type="tel" value={teamForm.phone} onChange={handleTeamFormChange('phone')} placeholder="+91 98765 43210" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
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
                        <Users size={14} /> Sales Person
                      </button>
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
                      <div key={member.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-dark-800/50' : 'bg-dark-50'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                            {member.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{member.name}</p>
                            <p className={`text-xs truncate ${textSecondary}`}>{member.email}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          member.role === 'admin'
                            ? 'bg-primary-500/10 text-primary-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {member.role === 'admin' ? 'Administrator' : 'Sales Person'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}

          {activeTab === 'academy' && (
            <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
              <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Academy Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Academy Name</label>
                  <input type="text" defaultValue="BIX Academy" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Contact Email</label>
                  <div className="relative">
                    <Mail size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
                    <input type="email" defaultValue="info@bixacademy.com" className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
                    <input type="tel" defaultValue="+91 80000 12345" className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Website</label>
                  <div className="relative">
                    <Globe size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
                    <input type="url" defaultValue="www.bixacademy.com" className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>GST Number</label>
                  <input type="text" defaultValue="29AABCU9603R1Z3" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Address</label>
                  <div className="relative">
                    <MapPin size={16} className={`absolute left-3 top-3 ${textSecondary}`} />
                    <textarea rows={2} defaultValue="123 Tech Park, Electronic City, Bangalore 560100" className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none`} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25">
                  <Save size={16} /> Save Changes
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'integrations' && (
            <>
              {configuring ? (
                renderIntegrationConfig()
              ) : (
                <>
                  <motion.div variants={itemVariants}>
                    <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>Integrations</h2>
                    <p className={`text-sm mb-6 ${textSecondary}`}>Connect your lead generation platforms to automatically import and sync leads</p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {integrationsList.map(integration => (
                      <motion.div
                        key={integration.id}
                        variants={itemVariants}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        className={`${cardBg} border rounded-2xl p-6 shadow-sm`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                            style={{ backgroundColor: integration.brandColor }}
                          >
                            {integration.icon}
                          </div>
                          <button
                            onClick={() => toggleConnection(integration.id)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              integrations[integration.id].connected ? 'bg-emerald-500' : isDark ? 'bg-dark-700' : 'bg-dark-300'
                            }`}
                          >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              integrations[integration.id].connected ? 'left-6' : 'left-1'
                            }`} />
                          </button>
                        </div>

                        <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>{integration.name}</h3>
                        <p className={`text-sm mb-4 ${textSecondary}`}>{integration.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${integrations[integration.id].connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className={`text-xs font-medium ${integrations[integration.id].connected ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {integrations[integration.id].connected ? 'Connected' : 'Disconnected'}
                            </span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setConfiguring(integration.id); setConfigTab('api-config'); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-500 hover:bg-primary-500/10 transition-colors"
                          >
                            Configure <ArrowRight size={14} />
                          </motion.button>
                        </div>

                        {integrations[integration.id].lastSync && (
                          <p className={`text-xs mt-3 flex items-center gap-1 ${textSecondary}`}>
                            <Clock size={12} /> Last sync: {integrations[integration.id].lastSync}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'webhooks' && (
            <>
              <motion.div variants={itemVariants}>
                <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>Webhooks</h2>
                <p className={`text-sm mb-6 ${textSecondary}`}>Manage webhook endpoints across all integrations</p>
              </motion.div>

              {/* Global Webhook Settings */}
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 mb-4`}>
                <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Global Webhook Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Enable Webhooks</p>
                      <p className={`text-sm ${textSecondary}`}>Allow external services to send data via webhooks</p>
                    </div>
                    <button className="relative w-11 h-6 rounded-full bg-primary-500 transition-colors">
                      <span className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Retry Failed Deliveries</p>
                      <p className={`text-sm ${textSecondary}`}>Automatically retry failed webhook deliveries up to 3 times</p>
                    </div>
                    <button className="relative w-11 h-6 rounded-full bg-primary-500 transition-colors">
                      <span className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Timeout (seconds)</label>
                    <input
                      type="number"
                      defaultValue={30}
                      className={`w-32 px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Active Webhooks List */}
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 mb-4`}>
                <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Active Webhooks</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Integration</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Webhook URL</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Events</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Status</th>
                        <th className={`text-left py-3 font-medium ${labelText}`}>Last Triggered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockWebhooksList.map(wh => (
                        <tr key={wh.id} className={`border-b ${isDark ? 'border-dark-800/60' : 'border-dark-100/60'}`}>
                          <td className={`py-3 pr-4 font-medium whitespace-nowrap ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{wh.integration}</td>
                          <td className={`py-3 pr-4`}>
                            <div className="flex items-center gap-2">
                              <code className={`text-xs font-mono ${textSecondary} max-w-[200px] truncate`}>{wh.url}</code>
                              <button
                                onClick={() => copyToClipboard(wh.url, `wh-${wh.id}`)}
                                className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-dark-700 text-dark-500' : 'hover:bg-dark-200 text-dark-400'}`}
                              >
                                {copiedField === `wh-${wh.id}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className={`py-3 pr-4`}>
                            <div className="flex flex-wrap gap-1">
                              {wh.events.map(ev => (
                                <span key={ev} className={`px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-dark-800 text-dark-400' : 'bg-dark-100 text-dark-500'}`}>
                                  {ev}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`flex items-center gap-1.5 text-xs font-medium ${wh.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${wh.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {wh.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className={`py-3 font-mono text-xs whitespace-nowrap ${textSecondary}`}>{wh.lastTriggered}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Webhook Delivery History */}
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6`}>
                <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Delivery History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Timestamp</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Integration</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Event</th>
                        <th className={`text-left py-3 pr-4 font-medium ${labelText}`}>Response</th>
                        <th className={`text-left py-3 font-medium ${labelText}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { time: '2026-06-27 10:30:15', integration: 'Meta Ads', event: 'New Lead Created', response: '200 OK', status: 'success' },
                        { time: '2026-06-27 10:28:42', integration: 'Meta Ads', event: 'Form Submission', response: '200 OK', status: 'success' },
                        { time: '2026-06-27 09:15:00', integration: 'Google Ads', event: 'New Lead Created', response: '200 OK', status: 'success' },
                        { time: '2026-06-26 18:00:45', integration: 'JustDial', event: 'Lead Updated', response: '200 OK', status: 'success' },
                        { time: '2026-06-26 17:30:22', integration: 'Meta Ads', event: 'New Lead Created', response: '429 Rate Limit', status: 'failed' },
                        { time: '2026-06-26 16:45:10', integration: 'JustDial', event: 'New Lead Created', response: '200 OK', status: 'success' },
                        { time: '2026-06-26 15:20:33', integration: 'Google Ads', event: 'Campaign Status Change', response: '200 OK', status: 'warning' },
                      ].map((item, i) => (
                        <tr key={i} className={`border-b ${isDark ? 'border-dark-800/60' : 'border-dark-100/60'}`}>
                          <td className={`py-3 pr-4 font-mono text-xs whitespace-nowrap ${textSecondary}`}>{item.time}</td>
                          <td className={`py-3 pr-4 whitespace-nowrap font-medium ${isDark ? 'text-dark-200' : 'text-dark-700'}`}>{item.integration}</td>
                          <td className={`py-3 pr-4 whitespace-nowrap ${textSecondary}`}>{item.event}</td>
                          <td className={`py-3 pr-4 font-mono text-xs ${textSecondary}`}>{item.response}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(item.status)}`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}

          {activeTab === 'api' && (
            <>
              <motion.div variants={itemVariants}>
                <h2 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-dark-900'}`}>API Management</h2>
                <p className={`text-sm mb-6 ${textSecondary}`}>Manage API keys, view usage statistics, and access documentation</p>
              </motion.div>

              {/* API Keys */}
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 mb-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>API Keys</h3>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-primary-500/25"
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
              <motion.div variants={itemVariants} className={`${cardBg} border rounded-2xl p-6 mb-4`}>
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
              <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-dark-900'}`}>Notification Preferences</h2>
              <div className="space-y-4">
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
                    <button className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-primary-500' : isDark ? 'bg-dark-700' : 'bg-dark-300'}`}>
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
                  <input type="password" placeholder="Enter current password" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>New Password</label>
                  <input type="password" placeholder="Enter new password" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>Confirm Password</label>
                  <input type="password" placeholder="Confirm new password" className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div className="pt-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Two-Factor Authentication</p>
                      <p className={`text-sm ${textSecondary}`}>Add an extra layer of security to your account</p>
                    </div>
                    <button className={`px-4 py-2 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                      Enable
                    </button>
                  </div>
                  <div className={`flex items-center justify-between py-3 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>Active Sessions</p>
                      <p className={`text-sm ${textSecondary}`}>Manage your active login sessions</p>
                    </div>
                    <button className="px-4 py-2 rounded-xl text-sm font-medium text-rose-500 border border-rose-500/30 hover:bg-rose-500/10">
                      View All
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25">
                  <Shield size={16} /> Update Security
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
