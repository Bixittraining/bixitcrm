import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, Search, Bell, MessageSquare, Sun, Moon, ChevronDown,
  User, Settings, LogOut, Check, X, Phone, Mail, Users,
  GraduationCap, AlertCircle, CalendarClock, IndianRupee,
  Send, Smartphone,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function useClickOutside(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (ref.current && !ref.current.contains(e.target)) handler()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

const msgTypeIcon = { email: Mail, sms: Smartphone, notification: Bell, call: Phone }
const msgTypeColor = {
  email: 'bg-primary-500/15 text-primary-500',
  sms: 'bg-emerald-500/15 text-emerald-500',
  notification: 'bg-accent-500/15 text-accent-500',
  call: 'bg-sky-500/15 text-sky-500',
}

function Header({ onMenuToggle, onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const { profile, initials, isAdmin } = useAuth()
  const { leads, followUps, students, invoices, communications } = useData()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [readNotifs, setReadNotifs] = useState(new Set())
  const [readMsgs, setReadMsgs] = useState(new Set())

  const notifRef = useRef(null)
  const msgRef = useRef(null)
  const dropdownRef = useRef(null)

  useClickOutside(notifRef, () => setShowNotifications(false))
  useClickOutside(msgRef, () => setShowMessages(false))
  useClickOutside(dropdownRef, () => setUserDropdownOpen(false))

  const today = new Date().toISOString().split('T')[0]

  // Build live notifications from context data
  const notifications = [
    ...followUps
      .filter(f => f.status === 'pending' && f.date <= today)
      .slice(0, 3)
      .map(f => ({
        id: `fu-${f.id}`,
        icon: CalendarClock,
        color: 'bg-accent-500/15 text-accent-500',
        title: `Follow-up due: ${f.lead}`,
        desc: `${f.type} scheduled${f.date === today ? ' today' : ` on ${f.date}`}`,
        time: f.date,
        link: '/follow-ups',
      })),
    ...leads
      .filter(l => l.status === 'new')
      .slice(0, 2)
      .map(l => ({
        id: `lead-${l.id}`,
        icon: Users,
        color: 'bg-primary-500/15 text-primary-500',
        title: `New lead: ${l.name}`,
        desc: `Interested in ${l.course} · via ${l.source}`,
        time: l.date,
        link: '/leads',
      })),
    ...invoices
      .filter(inv => inv.status === 'overdue')
      .slice(0, 2)
      .map(inv => ({
        id: `inv-${inv.id}`,
        icon: IndianRupee,
        color: 'bg-rose-500/15 text-rose-500',
        title: `Overdue fee: ${inv.student}`,
        desc: `Balance ₹${inv.balance?.toLocaleString('en-IN')} · ${inv.course}`,
        time: inv.dueDate,
        link: '/billing',
      })),
    ...students
      .filter(s => s.attendance < 75)
      .slice(0, 2)
      .map(s => ({
        id: `att-${s.id}`,
        icon: AlertCircle,
        color: 'bg-rose-500/15 text-rose-500',
        title: `Low attendance: ${s.name}`,
        desc: `${s.attendance}% attendance in ${s.course}`,
        time: '',
        link: '/students',
      })),
  ]

  const unreadNotifCount = notifications.filter(n => !readNotifs.has(n.id)).length

  // Messages from communications context
  const recentMessages = [...(communications || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)

  const unreadMsgCount = recentMessages.filter(m => !readMsgs.has(m.id)).length

  function markAllNotifsRead() {
    setReadNotifs(new Set(notifications.map(n => n.id)))
  }
  function markAllMsgsRead() {
    setReadMsgs(new Set(recentMessages.map(m => m.id)))
  }

  // Global search results
  const searchResults = searchQuery.length >= 2 ? [
    ...leads.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.course.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(l => ({ label: l.name, sub: `Lead · ${l.course}`, link: '/leads', icon: Users })),
    ...students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.course.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(s => ({ label: s.name, sub: `Student · ${s.course}`, link: '/students', icon: GraduationCap })),
  ] : []

  const panelCls = `fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 rounded-2xl shadow-2xl border overflow-hidden z-50 ${
    isDark ? 'bg-dark-900 border-dark-700/60 shadow-black/40' : 'bg-white border-dark-200/60 shadow-dark-300/20'
  }`
  const itemHover = isDark ? 'hover:bg-dark-800' : 'hover:bg-dark-50'
  const textSecondary = isDark ? 'text-dark-400' : 'text-dark-500'

  return (
    <header className={`sticky top-0 z-40 w-full transition-colors duration-300 backdrop-blur-sm sm:backdrop-blur-xl ${
      isDark ? 'bg-dark-900/90 border-b border-dark-700/60' : 'bg-white/90 border-b border-dark-200/60'
    }`}>
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">

        {/* Left: menu + breadcrumb */}
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onMenuToggle}
            className={`lg:hidden p-2 rounded-lg transition-colors ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
            <Menu size={22} />
          </motion.button>
          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-sm font-medium ${isDark ? 'text-dark-500' : 'text-dark-400'}`}>BIX Academy</span>
            <span className={`text-sm ${isDark ? 'text-dark-600' : 'text-dark-300'}`}>/</span>
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Dashboard</span>
          </div>
        </div>

        {/* Center: search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block relative">
          <motion.div
            animate={{ boxShadow: searchFocused ? '0 0 0 3px rgba(99,102,241,0.3)' : '0 0 0 0px rgba(99,102,241,0)' }}
            transition={{ duration: 0.2 }}
            className={`relative rounded-xl overflow-visible ${isDark ? 'bg-dark-800/80' : 'bg-dark-100/80'}`}
          >
            <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchFocused ? 'text-primary-500' : isDark ? 'text-dark-500' : 'text-dark-400'}`} />
            <input
              type="text"
              placeholder="Search students, leads, courses..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={`w-full pl-10 pr-4 py-2.5 text-sm bg-transparent outline-none ${isDark ? 'text-white placeholder:text-dark-500' : 'text-dark-900 placeholder:text-dark-400'}`}
            />
          </motion.div>
          {/* Search results dropdown */}
          <AnimatePresence>
            {searchFocused && searchResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl overflow-hidden z-50 ${isDark ? 'bg-dark-900 border-dark-700' : 'bg-white border-dark-200'}`}>
                {searchResults.map((r, i) => (
                  <button key={i} onMouseDown={(e) => { e.preventDefault(); navigate(r.link); setSearchQuery(''); setSearchFocused(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer ${itemHover}`}>
                    <r.icon size={15} className={isDark ? 'text-dark-400' : 'text-dark-500'} />
                    <div className="text-left">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-dark-900'}`}>{r.label}</p>
                      <p className={`text-xs ${textSecondary}`}>{r.sub}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowNotifications(p => !p); setShowMessages(false); setUserDropdownOpen(false) }}
              className={`relative p-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
              <Bell size={20} />
              {unreadNotifCount > 0 && (
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadNotifCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }} className={panelCls}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Notifications</span>
                    <button onClick={markAllNotifsRead} className={`text-xs font-medium text-primary-500 hover:text-primary-400 cursor-pointer`}>
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className={`text-center text-sm py-8 ${textSecondary}`}>No notifications</p>
                    ) : notifications.map(n => {
                      const isRead = readNotifs.has(n.id)
                      return (
                        <button key={n.id} onClick={() => { navigate(n.link); setShowNotifications(false); setReadNotifs(p => new Set([...p, n.id])) }}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${itemHover} ${!isRead ? isDark ? 'bg-dark-800/40' : 'bg-primary-50/40' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${n.color}`}>
                            <n.icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-dark-100' : 'text-dark-800'}`}>{n.title}</p>
                            <p className={`text-xs truncate mt-0.5 ${textSecondary}`}>{n.desc}</p>
                            {n.time && <p className={`text-[10px] mt-1 ${isDark ? 'text-dark-600' : 'text-dark-400'}`}>{n.time}</p>}
                          </div>
                          {!isRead && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />}
                        </button>
                      )
                    })}
                  </div>
                  <div className={`border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                    <button onClick={() => { navigate('/follow-ups'); setShowNotifications(false) }}
                      className={`w-full text-center text-xs font-medium py-3 text-primary-500 hover:text-primary-400 transition-colors cursor-pointer`}>
                      View all notifications →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Messages */}
          <div className="relative" ref={msgRef}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowMessages(p => !p); setShowNotifications(false); setUserDropdownOpen(false) }}
              className={`relative p-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-dark-400 hover:text-white hover:bg-dark-800' : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'}`}>
              <MessageSquare size={20} />
              {unreadMsgCount > 0 && (
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-blue-500 rounded-full">
                  {unreadMsgCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {showMessages && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }} className={panelCls}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>Messages</span>
                    <button onClick={markAllMsgsRead} className="text-xs font-medium text-primary-500 hover:text-primary-400 cursor-pointer">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentMessages.length === 0 ? (
                      <p className={`text-center text-sm py-8 ${textSecondary}`}>No messages</p>
                    ) : recentMessages.map(msg => {
                      const isRead = readMsgs.has(msg.id)
                      const Icon = msgTypeIcon[msg.type] || Mail
                      const colorCls = msgTypeColor[msg.type] || msgTypeColor.email
                      return (
                        <button key={msg.id} onClick={() => { navigate('/communications'); setShowMessages(false); setReadMsgs(p => new Set([...p, msg.id])) }}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${itemHover} ${!isRead ? isDark ? 'bg-dark-800/40' : 'bg-blue-50/40' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colorCls}`}>
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-dark-100' : 'text-dark-800'}`}>{msg.subject}</p>
                            <p className={`text-xs truncate mt-0.5 ${textSecondary}`}>To: {msg.to}</p>
                            <p className={`text-xs truncate ${textSecondary}`}>{msg.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[10px] ${isDark ? 'text-dark-600' : 'text-dark-400'}`}>{msg.date}</span>
                            {!isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className={`border-t ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                    <button onClick={() => { navigate('/communications'); setShowMessages(false) }}
                      className="w-full text-center text-xs font-medium py-3 text-primary-500 hover:text-primary-400 transition-colors cursor-pointer">
                      View all messages →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme toggle */}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-dark-400 hover:text-yellow-400 hover:bg-dark-800' : 'text-dark-500 hover:text-primary-600 hover:bg-dark-100'}`}
            aria-label="Toggle theme">
            <motion.div key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.3 }}>
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </motion.div>
          </motion.button>

          <div className={`hidden sm:block w-px h-8 mx-1 ${isDark ? 'bg-dark-700' : 'bg-dark-200'}`} />

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setUserDropdownOpen(p => !p); setShowNotifications(false); setShowMessages(false) }}
              className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-colors cursor-pointer ${isDark ? 'hover:bg-dark-800' : 'hover:bg-dark-100'}`}>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white text-sm font-bold shadow-lg shadow-primary-500/25">
                {initials}
              </div>
              <span className={`hidden sm:block text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-700'}`}>{profile.name}</span>
              <motion.div animate={{ rotate: userDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} className={`hidden sm:block ${isDark ? 'text-dark-500' : 'text-dark-400'}`} />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className={`fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-56 rounded-xl shadow-xl border overflow-hidden z-50 ${isDark ? 'bg-dark-800 border-dark-700 shadow-black/40' : 'bg-white border-dark-200 shadow-dark-200/40'}`}>
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-dark-700' : 'border-dark-100'}`}>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-dark-900'}`}>{profile.name}</p>
                    <p className={`text-xs mt-0.5 ${textSecondary}`}>{profile.role}</p>
                  </div>
                  <div className="p-1.5">
                    {(isAdmin
                      ? [
                          { icon: User, label: 'My Profile', action: () => { navigate('/settings'); setUserDropdownOpen(false) } },
                          { icon: Settings, label: 'Settings', action: () => { navigate('/settings'); setUserDropdownOpen(false) } },
                        ]
                      : []
                    ).map(({ icon: Icon, label, action }) => (
                      <motion.button key={label} whileHover={{ x: 2 }} onClick={action}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${isDark ? 'text-dark-300 hover:text-white hover:bg-dark-700' : 'text-dark-600 hover:text-dark-900 hover:bg-dark-50'}`}>
                        <Icon size={16} />{label}
                      </motion.button>
                    ))}
                  </div>
                  <div className={`border-t p-1.5 ${isDark ? 'border-dark-700' : 'border-dark-100'}`}>
                    <motion.button whileHover={{ x: 2 }} onClick={() => { setUserDropdownOpen(false); onLogout?.() }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer">
                      <LogOut size={16} />Sign Out
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
