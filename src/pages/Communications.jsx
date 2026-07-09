import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Mail, Phone, Send, Search, Plus, Bell, Users, Clock, CheckCircle, X, Smartphone } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { modalOverlayVariants, modalCardVariants } from '../lib/modalVariants'
import { communications as initialComms } from '../data/mockData'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const typeConfig = {
  email: { icon: Mail, color: 'primary', label: 'Email' },
  sms: { icon: Smartphone, color: 'emerald', label: 'SMS' },
  notification: { icon: Bell, color: 'accent', label: 'Notification' },
  call: { icon: Phone, color: 'sky', label: 'Call' },
}

const templates = [
  { id: 1, name: 'Welcome Message', type: 'sms', subject: 'Welcome to BIX Academy!', content: 'Welcome to BIX Academy! We are excited to have you.' },
  { id: 2, name: 'Course Brochure', type: 'email', subject: 'Course Brochure - BIX Academy', content: 'Please find attached the detailed brochure for our programs.' },
  { id: 3, name: 'Fee Reminder', type: 'email', subject: 'Fee Payment Reminder', content: 'This is a gentle reminder about your pending fee installment.' },
  { id: 4, name: 'Class Schedule', type: 'notification', subject: 'Class Schedule Updated', content: 'Your upcoming class schedule has been updated.' },
  { id: 5, name: 'Holiday Notice', type: 'notification', subject: 'Holiday Notice', content: 'The academy will remain closed on the following dates.' },
]

export default function Communications() {
  const { theme } = useTheme()
  const [comms, setComms] = useState(initialComms)
  const [activeTab, setActiveTab] = useState('all')
  const [showCompose, setShowCompose] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  // Compose form state
  const [composeType, setComposeType] = useState('email')
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeMessage, setComposeMessage] = useState('')

  const isDark = theme === 'dark'
  const cardBg = isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'
  const hoverBg = isDark ? 'hover:bg-dark-800' : 'hover:bg-dark-50'
  const inputBg = isDark ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500' : 'bg-dark-50 border-dark-200 text-dark-900 placeholder-dark-400'
  const textSecondary = isDark ? 'text-dark-400' : 'text-dark-500'

  const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const openCompose = (template = null) => {
    if (template) {
      setComposeType(template.type)
      setComposeSubject(template.subject)
      setComposeMessage(template.content)
      setComposeTo('')
    } else {
      setComposeType('email')
      setComposeSubject('')
      setComposeMessage('')
      setComposeTo('')
    }
    setShowCompose(true)
  }

  const handleSend = () => {
    if (!composeMessage.trim()) return
    const newComm = {
      id: Date.now(),
      type: composeType,
      subject: composeSubject || '(No Subject)',
      to: composeTo || 'All Students',
      message: composeMessage,
      status: 'sent',
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
    setComms(prev => [newComm, ...prev])
    setShowCompose(false)
    showToastMsg('Message sent successfully')
  }

  const filtered = (activeTab === 'all' ? comms : comms.filter(c => c.type === activeTab))
    .filter(c => !searchQuery || c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || c.to?.toLowerCase().includes(searchQuery.toLowerCase()))

  const tabs = [
    { key: 'all', label: 'All', count: comms.length },
    { key: 'email', label: 'Email', count: comms.filter(c => c.type === 'email').length },
    { key: 'sms', label: 'SMS', count: comms.filter(c => c.type === 'sms').length },
    { key: 'notification', label: 'Notifications', count: comms.filter(c => c.type === 'notification').length },
  ]

  const stats = [
    { label: 'Total Sent', value: comms.filter(c => c.status === 'sent').length, icon: Send, color: 'primary' },
    { label: 'Scheduled', value: comms.filter(c => c.status === 'scheduled').length, icon: Clock, color: 'accent' },
    { label: 'Templates', value: templates.length, icon: MessageSquare, color: 'emerald' },
    { label: 'Recipients', value: '248+', icon: Users, color: 'sky' },
  ]

  const colorMap = {
    primary: { bg: isDark ? 'bg-primary-500/10' : 'bg-primary-50', text: 'text-primary-500', badge: 'bg-primary-500' },
    emerald: { bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50', text: 'text-emerald-500', badge: 'bg-emerald-500' },
    accent: { bg: isDark ? 'bg-accent-500/10' : 'bg-accent-50', text: 'text-accent-500', badge: 'bg-accent-500' },
    sky: { bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50', text: 'text-sky-500', badge: 'bg-sky-500' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Communications</h1>
          <p className={textSecondary}>Manage messages, notifications, and templates</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openCompose()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 cursor-pointer"
          >
            <Plus size={18} /> Compose
          </motion.button>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const colors = colorMap[stat.color]
          return (
            <motion.div key={stat.label} variants={itemVariants} className={`${cardBg} border rounded-2xl p-5`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                  <stat.icon size={20} className={colors.text} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>{stat.value}</p>
                  <p className={`text-sm ${textSecondary}`}>{stat.label}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : `${isDark ? 'text-dark-400 hover:text-dark-200 hover:bg-dark-800' : 'text-dark-500 hover:text-dark-700 hover:bg-dark-100'}`
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-white/70' : ''}`}>({tab.count})</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`pl-9 pr-4 py-2 rounded-lg text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-64`}
            />
          </div>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-dark-200/60">
          {filtered.length === 0 ? (
            <p className={`text-center py-12 text-sm ${textSecondary}`}>No messages found</p>
          ) : filtered.map(comm => {
            const config = typeConfig[comm.type] || typeConfig.email
            const colors = colorMap[config.color]
            return (
              <motion.div
                key={comm.id}
                variants={itemVariants}
                whileHover={{ x: 4 }}
                className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${hoverBg}`}
              >
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <config.icon size={18} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>{comm.subject}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{config.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      comm.status === 'sent'
                        ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                        : isDark ? 'bg-accent-500/10 text-accent-400' : 'bg-accent-50 text-accent-600'
                    }`}>
                      {comm.status === 'sent' ? 'Sent' : 'Scheduled'}
                    </span>
                  </div>
                  <p className={`text-sm ${textSecondary} mb-1`}>To: {comm.to}</p>
                  <p className={`text-sm ${textSecondary} truncate`}>{comm.message}</p>
                </div>
                <div className={`text-xs ${textSecondary} whitespace-nowrap`}>{comm.date}</div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Message Templates */}
      <div>
        <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-dark-900'}`}>Message Templates</h2>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => {
            const config = typeConfig[template.type] || typeConfig.email
            const colors = colorMap[config.color]
            return (
              <motion.div
                key={template.id}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                className={`${cardBg} border rounded-2xl p-5`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <config.icon size={16} className={colors.text} />
                  </div>
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>{template.name}</h3>
                </div>
                <p className={`text-sm ${textSecondary} mb-4`}>{template.content}</p>
                <button
                  onClick={() => openCompose(template)}
                  className={`text-sm font-medium cursor-pointer hover:underline ${colors.text}`}
                >
                  Use Template
                </button>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCompose(false)}
          >
            <motion.div
              variants={modalCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-lg ${cardBg} border rounded-2xl shadow-2xl overflow-hidden`}
            >
              <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Compose Message</h2>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowCompose(false)} className={`p-1.5 rounded-lg cursor-pointer ${hoverBg}`}>
                  <X size={18} className={textSecondary} />
                </motion.button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Type</label>
                  <div className="flex gap-2">
                    {['email', 'sms', 'notification'].map(type => (
                      <button
                        key={type}
                        onClick={() => setComposeType(type)}
                        className={`px-4 py-2 rounded-lg text-sm border cursor-pointer transition-colors capitalize ${
                          composeType === type
                            ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                            : `${inputBg} hover:border-primary-500`
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>To</label>
                  <input
                    type="text"
                    placeholder="All Students / recipient name..."
                    value={composeTo}
                    onChange={e => setComposeTo(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Subject</label>
                  <input
                    type="text"
                    placeholder="Message subject..."
                    value={composeSubject}
                    onChange={e => setComposeSubject(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Message</label>
                  <textarea
                    rows={4}
                    placeholder="Type your message..."
                    value={composeMessage}
                    onChange={e => setComposeMessage(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none`}
                  />
                </div>
              </div>
              <div className={`flex justify-end gap-3 p-5 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <button
                  onClick={() => setShowCompose(false)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border cursor-pointer ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25 cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Send size={16} /> Send Message</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
          >
            <CheckCircle size={18} />
            <span className="text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
