import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTheme } from '../../context/ThemeContext'

export default function Layout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-dark-950' : 'bg-dark-50'}`}>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`fixed z-50 lg:static lg:z-auto transition-transform duration-300 h-full ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} onLogout={onLogout} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} onLogout={onLogout} />
        <main className={`flex-1 overflow-y-auto p-4 lg:p-6 ${isDark ? 'bg-dark-950' : 'bg-dark-50'}`}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
