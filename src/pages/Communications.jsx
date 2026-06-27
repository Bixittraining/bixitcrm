import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Mail, Phone, Send, Search, Filter, Plus, Bell, Users, Clock, CheckCircle, X, Smartphone } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { communications } from '../data/mockData'

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
  { id: 1, name: 'Welcome Message', type: 'sms', content: 'Welcome to BIX Academy! We are excited to have you.' },
  { id: 2, name: 'Course Brochure', type: 'email', content: 'Please find attached the detailed brochure for our programs.' },
  { id: 3, name: 'Fee Reminder', type: 'email', content: 'This is a gentle reminder about your pending fee installment.' },
  { id: 4, name: 'Class Schedule', type: 'notification', content: 'Your upcoming class schedule has been updated.' },
  { id: 5, name: 'Holiday Notice', type: 'notification', content: 'The academy will remain closed on the following dates.' },
]

export default function Communications() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('all')
  const [showCompose, setShowCompose] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isDark = theme === 'dark'
  const cardBg = isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'
  const hoverBg = isDark ? 'hover:bg-dark-800' : 'hover:bg-dark-50'
  const inputBg = isDark ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500' : 'bg-dark-50 border-dark-200 text-dark-900 placeholder-dark-400'
  const textSecondary = isDark ? 'text-dark-400' : 'text-dark-500'

  const tabs = [
    { key: 'all', label: 'All', count: communications.length },
    { key: 'email', label: 'Email', count: communications.filter(c => c.type === 'email').length },
    { key: 'sms', label: 'SMS', count: communications.filter(c => c.type === 'sms').length },
    { key: 'notification', label: 'Notifications', count: communications.filter(c => c.type === 'notification').length },
  ]

  const filtered = activeTab === 'all' ? communications : communications.filter(c => c.type === activeTab)

  const stats = [
    { label: 'Total Sent', value: communications.filter(c => c.status === 'sent').length, icon: Send, color: 'primary' },
    { label: 'Scheduled', value: communications.filter(c => c.status === 'scheduled').length, icon: Clock, color: 'accent' },
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
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium shadow-lg shadow-primary-500/25"
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
          {filtered.map(comm => {
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {config.label}
                    </span>
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
                className={`${cardBg} border rounded-2xl p-5 cursor-pointer`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <config.icon size={16} className={colors.text} />
                  </div>
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>{template.name}</h3>
                </div>
                <p className={`text-sm ${textSecondary} mb-4`}>{template.content}</p>
                <button className={`text-sm font-medium ${colors.text} hover:underline`}>Use Template</button>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCompose(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-lg ${cardBg} border rounded-2xl shadow-2xl overflow-hidden`}
            >
              <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Compose Message</h2>
                <button onClick={() => setShowCompose(false)} className={`p-1.5 rounded-lg ${hoverBg}`}>
                  <X size={18} className={textSecondary} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Type</label>
                  <div className="flex gap-2">
                    {['Email', 'SMS', 'Notification'].map(type => (
                      <button key={type} className={`px-4 py-2 rounded-lg text-sm border ${inputBg} hover:border-primary-500 transition-colors`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>To</label>
                  <input type="text" placeholder="Select recipients..." className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Subject</label>
                  <input type="text" placeholder="Message subject..." className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-dark-300' : 'text-dark-600'}`}>Message</label>
                  <textarea rows={4} placeholder="Type your message..." className={`w-full px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none`} />
                </div>
              </div>
              <div className={`flex justify-end gap-3 p-5 border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <button onClick={() => setShowCompose(false)} className={`px-5 py-2.5 rounded-xl text-sm font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}>
                  Cancel
                </button>
                <button className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25">
                  <span className="flex items-center gap-2"><Send size={16} /> Send Message</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
