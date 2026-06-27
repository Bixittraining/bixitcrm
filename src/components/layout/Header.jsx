import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  Search,
  Bell,
  MessageSquare,
  Sun,
  Moon,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

function Header({ onMenuToggle }) {
  const { theme, toggleTheme } = useTheme()
  const [searchFocused, setSearchFocused] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isDark = theme === 'dark'

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-300 ${
        isDark
          ? 'bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/60'
          : 'bg-white/80 backdrop-blur-xl border-b border-dark-200/60'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* ---- Left side: menu toggle + breadcrumb ---- */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuToggle}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-dark-400 hover:text-white hover:bg-dark-800'
                : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'
            }`}
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </motion.button>

          <div className="hidden sm:flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                isDark ? 'text-dark-500' : 'text-dark-400'
              }`}
            >
              BIX Academy
            </span>
            <span
              className={`text-sm ${
                isDark ? 'text-dark-600' : 'text-dark-300'
              }`}
            >
              /
            </span>
            <span
              className={`text-sm font-semibold ${
                isDark ? 'text-white' : 'text-dark-900'
              }`}
            >
              Dashboard
            </span>
          </div>
        </div>

        {/* ---- Center: search bar ---- */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <motion.div
            animate={{
              boxShadow: searchFocused
                ? '0 0 0 3px rgba(99, 102, 241, 0.3)'
                : '0 0 0 0px rgba(99, 102, 241, 0)',
            }}
            transition={{ duration: 0.2 }}
            className={`relative rounded-xl overflow-hidden ${
              isDark ? 'bg-dark-800/80' : 'bg-dark-100/80'
            }`}
          >
            <Search
              size={18}
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                searchFocused
                  ? 'text-primary-500'
                  : isDark
                    ? 'text-dark-500'
                    : 'text-dark-400'
              }`}
            />
            <input
              type="text"
              placeholder="Search students, leads, courses..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={`w-full pl-10 pr-4 py-2.5 text-sm bg-transparent outline-none placeholder:transition-colors ${
                isDark
                  ? 'text-white placeholder:text-dark-500'
                  : 'text-dark-900 placeholder:text-dark-400'
              }`}
            />
          </motion.div>
        </div>

        {/* ---- Right side: actions ---- */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile search trigger */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-dark-400 hover:text-white hover:bg-dark-800'
                : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'
            }`}
            aria-label="Search"
          >
            <Search size={20} />
          </motion.button>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-dark-400 hover:text-white hover:bg-dark-800'
                : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'
            }`}
            aria-label="Notifications"
          >
            <Bell size={20} />
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-transparent"
              style={{
                ringColor: isDark
                  ? 'rgba(17, 24, 39, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
              }}
            >
              5
            </motion.span>
          </motion.button>

          {/* Messages */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-dark-400 hover:text-white hover:bg-dark-800'
                : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'
            }`}
            aria-label="Messages"
          >
            <MessageSquare size={20} />
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 4,
              }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-blue-500 rounded-full ring-2 ring-transparent"
              style={{
                ringColor: isDark
                  ? 'rgba(17, 24, 39, 0.8)'
                  : 'rgba(255, 255, 255, 0.8)',
              }}
            >
              3
            </motion.span>
          </motion.button>

          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-dark-400 hover:text-yellow-400 hover:bg-dark-800'
                : 'text-dark-500 hover:text-primary-600 hover:bg-dark-100'
            }`}
            aria-label="Toggle theme"
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </motion.div>
          </motion.button>

          {/* Divider */}
          <div
            className={`hidden sm:block w-px h-8 mx-1 ${
              isDark ? 'bg-dark-700' : 'bg-dark-200'
            }`}
          />

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-colors ${
                isDark
                  ? 'hover:bg-dark-800'
                  : 'hover:bg-dark-100'
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white text-sm font-bold shadow-lg shadow-primary-500/25">
                YS
              </div>
              <span
                className={`hidden sm:block text-sm font-medium ${
                  isDark ? 'text-dark-300' : 'text-dark-700'
                }`}
              >
                Yogesh
              </span>
              <motion.div
                animate={{ rotate: userDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown
                  size={14}
                  className={`hidden sm:block ${
                    isDark ? 'text-dark-500' : 'text-dark-400'
                  }`}
                />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl border overflow-hidden ${
                    isDark
                      ? 'bg-dark-800 border-dark-700 shadow-black/40'
                      : 'bg-white border-dark-200 shadow-dark-200/40'
                  }`}
                >
                  {/* User info */}
                  <div
                    className={`px-4 py-3 border-b ${
                      isDark ? 'border-dark-700' : 'border-dark-100'
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        isDark ? 'text-white' : 'text-dark-900'
                      }`}
                    >
                      Yogesh S
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDark ? 'text-dark-400' : 'text-dark-500'
                      }`}
                    >
                      Administrator
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    {[
                      { icon: User, label: 'My Profile' },
                      { icon: Settings, label: 'Settings' },
                    ].map(({ icon: Icon, label }) => (
                      <motion.button
                        key={label}
                        whileHover={{ x: 2 }}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                          isDark
                            ? 'text-dark-300 hover:text-white hover:bg-dark-700'
                            : 'text-dark-600 hover:text-dark-900 hover:bg-dark-50'
                        }`}
                      >
                        <Icon size={16} />
                        {label}
                      </motion.button>
                    ))}
                  </div>

                  <div
                    className={`border-t p-1.5 ${
                      isDark ? 'border-dark-700' : 'border-dark-100'
                    }`}
                  >
                    <motion.button
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
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
