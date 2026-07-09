import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  UserPlus,
  Clock,
  GraduationCap,
  BookOpen,
  Receipt,
  GitBranch,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: UserPlus },
  { to: '/follow-ups', label: 'Follow-ups', icon: Clock },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/packages', label: 'Packages', icon: BookOpen },
  { to: '/billing', label: 'Fees & Billing', icon: Receipt },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/communications', label: 'Communications', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const sidebarVariants = {
  expanded: { width: 264 },
  collapsed: { width: 76 },
}

const listVariants = {
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.06 },
  },
  hidden: {},
}

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}

export default function Sidebar({ collapsed, setCollapsed, onLogout, onNavigate }) {
  const { theme, toggleTheme } = useTheme()
  const { profile, initials, isAdmin } = useAuth()
  const isDark = theme === 'dark'
  const visibleNavItems = navItems.filter((item) => item.to !== '/settings' || isAdmin)

  return (
    <motion.aside
      layout
      variants={sidebarVariants}
      animate={collapsed ? 'collapsed' : 'expanded'}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`h-screen flex flex-col border-r backdrop-blur-sm sm:backdrop-blur-xl
        ${isDark ? 'border-dark-700/60' : 'border-primary-200/60'}`}
      style={isDark
        ? { background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }
        : { background: 'linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%)' }
      }
    >
      {/* Logo Area */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-5'} h-16 shrink-0 border-b
        ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>
        <NavLink to="/" onClick={onNavigate} className="flex items-center gap-2 overflow-hidden">
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent select-none">
            BIX
          </span>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="academy-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
              >
                <span className={`text-sm font-medium ${isDark ? 'text-dark-300' : 'text-dark-500'}`}>
                  Academy
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-600/15 text-primary-400">
                  CRM
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 px-3">
        <motion.ul
          className="flex flex-col gap-1"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <motion.li key={item.to} variants={itemVariants}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150
                    ${collapsed ? 'justify-center' : ''}
                    ${
                      isActive
                        ? `bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25`
                        : isDark
                          ? 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/70'
                          : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <motion.div
                      className={`flex items-center gap-3 w-full ${collapsed ? 'justify-center' : ''}`}
                      whileHover={{ x: collapsed ? 0 : 3 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <span className="shrink-0 relative">
                        <Icon
                          size={20}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        {isActive && (
                          <motion.span
                            layoutId="nav-indicator"
                            className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white/80"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            style={{ display: collapsed ? 'none' : undefined }}
                          />
                        )}
                      </span>
                      <AnimatePresence mode="wait">
                        {!collapsed && (
                          <motion.span
                            key={`label-${item.to}`}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </NavLink>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div
                    className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-lg
                      ${isDark ? 'bg-dark-800 text-dark-100 shadow-dark-950/50' : 'bg-dark-900 text-white shadow-dark-900/20'}`}
                  >
                    {item.label}
                  </div>
                )}
              </motion.li>
            )
          })}
        </motion.ul>
      </nav>

      {/* Bottom Section */}
      <div className={`shrink-0 border-t px-3 py-3 space-y-2
        ${isDark ? 'border-dark-700/60' : 'border-dark-200/60'}`}>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150
            ${collapsed ? 'justify-center' : ''}
            ${isDark
              ? 'text-dark-400 hover:text-accent-400 hover:bg-dark-800/70'
              : 'text-dark-500 hover:text-accent-600 hover:bg-dark-100/80'
            }`}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.span
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Sun size={20} strokeWidth={1.8} />
              </motion.span>
            ) : (
              <motion.span
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Moon size={20} strokeWidth={1.8} />
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                key="theme-label"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* User Profile */}
        <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5
          ${collapsed ? 'justify-center' : ''}
          ${isDark ? 'bg-dark-800/50' : 'bg-dark-100/60'}`}>
          {/* Avatar */}
          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md shadow-primary-600/20">
            <span className="text-xs font-bold text-white leading-none select-none">{initials}</span>
          </div>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-hidden min-w-0"
              >
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-dark-100' : 'text-dark-900'}`}>
                  {profile.name}
                </p>
                <p className={`text-xs truncate ${isDark ? 'text-dark-400' : 'text-dark-500'}`}>
                  {profile.role}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.button
                key="logout-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onLogout}
                className={`shrink-0 p-1.5 rounded-lg transition-colors duration-150
                  ${isDark
                    ? 'text-dark-500 hover:text-rose-400 hover:bg-dark-700/60'
                    : 'text-dark-400 hover:text-rose-500 hover:bg-dark-200/60'
                  }`}
                title="Logout"
              >
                <LogOut size={16} strokeWidth={1.8} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute -right-3 top-20 z-50 w-6 h-6 rounded-full flex items-center justify-center border shadow-md transition-colors duration-200
          ${isDark
            ? 'bg-dark-800 border-dark-600 text-dark-300 hover:text-primary-400 hover:border-primary-500/50 shadow-dark-950/40'
            : 'bg-white border-dark-200 text-dark-400 hover:text-primary-600 hover:border-primary-400/50 shadow-dark-200/40'
          }`}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.span
              key="expand"
              initial={{ rotate: 180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -180, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="collapse"
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 180, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.aside>
  )
}
