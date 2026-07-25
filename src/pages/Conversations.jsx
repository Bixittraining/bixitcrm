import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Send, Bot, UserCheck, ExternalLink, Loader2, MessageCircle } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const CONVERSATIONS_POLL_MS = 6000
const MESSAGES_POLL_MS = 4000

function timeLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export default function Conversations() {
  const { theme } = useTheme()
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const cardBg = isDark ? 'bg-dark-900 border-dark-700/60' : 'bg-white border-dark-200/60'
  const inputBg = isDark ? 'bg-dark-800 border-dark-700 text-dark-100 placeholder-dark-500' : 'bg-dark-50 border-dark-200 text-dark-900 placeholder-dark-400'
  const textSecondary = isDark ? 'text-dark-400' : 'text-dark-500'
  const hoverBg = isDark ? 'hover:bg-dark-800' : 'hover:bg-dark-50'

  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [selectedPhone, setSelectedPhone] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [togglingMode, setTogglingMode] = useState(false)
  const messagesEndRef = useRef(null)

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase.from('whatsapp_conversations').select('*').order('last_message_at', { ascending: false })
    if (!error) setConversations(data || [])
    setConversationsLoading(false)
  }, [])

  useEffect(() => {
    loadConversations()
    const id = setInterval(loadConversations, CONVERSATIONS_POLL_MS)
    return () => clearInterval(id)
  }, [loadConversations])

  const loadMessages = useCallback(async (phone) => {
    const { data, error } = await supabase.from('whatsapp_messages').select('*').eq('phone', phone).order('created_at', { ascending: true })
    if (!error) setMessages(data || [])
  }, [])

  useEffect(() => {
    if (!selectedPhone) return
    setMessagesLoading(true)
    loadMessages(selectedPhone).finally(() => setMessagesLoading(false))
    const id = setInterval(() => loadMessages(selectedPhone), MESSAGES_POLL_MS)
    return () => clearInterval(id)
  }, [selectedPhone, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openConversation = useCallback(async (phone) => {
    setSelectedPhone(phone)
    setSendError('')
    const convo = conversations.find((c) => c.phone === phone)
    if (convo?.unread_count > 0) {
      await supabase.from('whatsapp_conversations').update({ unread_count: 0 }).eq('phone', phone)
      setConversations((prev) => prev.map((c) => (c.phone === phone ? { ...c, unread_count: 0 } : c)))
    }
  }, [conversations])

  // Deep link from a lead's WhatsApp button: open (or create) that phone's thread
  useEffect(() => {
    const state = location.state
    if (!state?.openPhone) return
    // WhatsApp's wa_id (what the webhook stores messages under) is digits
    // only, no "+" — normalize the lead's formatted phone the same way so
    // this doesn't create a second, mismatched conversation row.
    const phone = state.openPhone.replace(/\D/g, '')
    ;(async () => {
      const { data: existing } = await supabase.from('whatsapp_conversations').select('phone').eq('phone', phone).maybeSingle()
      if (!existing) {
        await supabase.from('whatsapp_conversations').insert({
          phone,
          lead_id: state.leadId ?? null,
          contact_name: state.leadName || null,
          mode: 'human',
        })
        await loadConversations()
      }
      openConversation(phone)
    })()
    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const handleSend = async () => {
    if (!draft.trim() || !selectedPhone || sending) return
    setSending(true)
    setSendError('')
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ phone: selectedPhone, body: draft.trim() }),
    })
    const body = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) {
      setSendError(body.error || 'Failed to send message')
      return
    }
    setDraft('')
    loadMessages(selectedPhone)
    loadConversations()
  }

  const handleToggleMode = async () => {
    const convo = conversations.find((c) => c.phone === selectedPhone)
    if (!convo) return
    setTogglingMode(true)
    const nextMode = convo.mode === 'human' ? 'bot' : 'human'
    await supabase.from('whatsapp_conversations').update({ mode: nextMode }).eq('phone', selectedPhone)
    setConversations((prev) => prev.map((c) => (c.phone === selectedPhone ? { ...c, mode: nextMode } : c)))
    setTogglingMode(false)
  }

  const filtered = conversations
    .filter((c) => filter === 'all' || c.mode === filter)
    .filter((c) => !search || c.phone.includes(search) || (c.contact_name || '').toLowerCase().includes(search.toLowerCase()))

  const selectedConvo = conversations.find((c) => c.phone === selectedPhone)

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-dark-900'}`}>Conversations</h1>
        <p className={textSecondary}>All WhatsApp conversations, synced live from your connected WhatsApp Business number</p>
      </div>

      <div className={`${cardBg} border rounded-2xl overflow-hidden flex flex-col lg:flex-row`} style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
        {/* Conversation list */}
        <div className={`w-full lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
          <div className={`p-3 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'} space-y-2`}>
            <div className="relative">
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSecondary}`} />
              <input
                type="text"
                placeholder="Search phone or message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`w-full px-3 py-1.5 rounded-lg text-sm border ${inputBg} focus:outline-none`}
            >
              <option value="all">All</option>
              <option value="bot">Bot Active</option>
              <option value="human">Human Active</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className={`flex items-center justify-center gap-2 text-sm py-8 ${textSecondary}`}>
                <Loader2 size={16} className="animate-spin" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <p className={`text-center text-sm py-8 px-4 ${textSecondary}`}>No conversations yet — they'll appear here as soon as someone messages your WhatsApp number.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.phone}
                  onClick={() => openConversation(c.phone)}
                  className={`w-full text-left p-3.5 border-b transition-colors ${isDark ? 'border-dark-800/60' : 'border-dark-100/60'} ${
                    selectedPhone === c.phone ? (isDark ? 'bg-dark-800' : 'bg-primary-50') : hoverBg
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-dark-900'}`}>{c.contact_name || c.phone}</span>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">{c.unread_count}</span>
                    )}
                  </div>
                  <p className={`text-xs truncate mb-1.5 ${textSecondary}`}>{c.last_message || 'No messages yet'}</p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      c.mode === 'human' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary-500/10 text-primary-500'
                    }`}>
                      {c.mode === 'human' ? <UserCheck size={10} /> : <Bot size={10} />} {c.mode === 'human' ? 'Human Active' : 'Bot Active'}
                    </span>
                    <span className={`text-[10px] ${textSecondary}`}>{timeLabel(c.last_message_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConvo ? (
            <div className={`flex-1 flex flex-col items-center justify-center gap-2 ${textSecondary}`}>
              <MessageCircle size={28} />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              <div className={`flex items-center justify-between gap-3 p-4 border-b ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-dark-900'}`}>WhatsApp - {selectedConvo.contact_name || selectedConvo.phone}</p>
                  <p className={`text-xs ${textSecondary}`}>{selectedConvo.phone}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedConvo.lead_id != null && (
                    <button
                      onClick={() => navigate('/leads', { state: { openLeadId: selectedConvo.lead_id } })}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${isDark ? 'border-dark-700 text-dark-300 hover:bg-dark-800' : 'border-dark-200 text-dark-600 hover:bg-dark-50'}`}
                    >
                      <ExternalLink size={13} /> View Lead
                    </button>
                  )}
                  <button
                    onClick={handleToggleMode}
                    disabled={togglingMode}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-60 ${
                      selectedConvo.mode === 'human'
                        ? 'border-primary-500/30 text-primary-500 hover:bg-primary-500/10'
                        : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                    }`}
                  >
                    {togglingMode ? <Loader2 size={13} className="animate-spin" /> : selectedConvo.mode === 'human' ? <Bot size={13} /> : <UserCheck size={13} />}
                    {selectedConvo.mode === 'human' ? 'Hand to Bot' : 'Take Over'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className={`flex items-center justify-center gap-2 text-sm ${textSecondary}`}>
                    <Loader2 size={16} className="animate-spin" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <p className={`text-center text-sm ${textSecondary}`}>No messages in this conversation yet.</p>
                ) : (
                  messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        m.direction === 'outbound'
                          ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-br-md'
                          : isDark ? 'bg-dark-800 text-dark-100 rounded-bl-md' : 'bg-dark-100 text-dark-800 rounded-bl-md'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${m.direction === 'outbound' ? 'text-white/70' : textSecondary}`}>
                          {m.sender === 'bot' ? 'Bot · ' : m.sender === 'human' ? 'You · ' : ''}{timeLabel(m.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {sendError && <p className="px-4 text-sm text-rose-500">{sendError}</p>}
              <p className={`px-4 text-xs ${textSecondary}`}>
                WhatsApp only allows free-form replies within 24 hours of the contact's last message — outside that window, only pre-approved template messages can be delivered (not yet supported here).
              </p>

              <div className={`p-3 border-t flex items-center gap-2 ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm border ${inputBg} focus:outline-none focus:ring-2 focus:ring-primary-500/50`}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white disabled:opacity-60"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
