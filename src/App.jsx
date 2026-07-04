import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { UserProvider } from './context/UserContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import FollowUps from './pages/FollowUps'
import Students from './pages/Students'
import Packages from './pages/Packages'
import Billing from './pages/Billing'
import Pipeline from './pages/Pipeline'
import Reports from './pages/Reports'
import Communications from './pages/Communications'
import Settings from './pages/Settings'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (!isLoggedIn) {
    return (
      <ThemeProvider>
        <Login onLogin={() => setIsLoggedIn(true)} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <UserProvider>
      <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout onLogout={() => setIsLoggedIn(false)} />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="students" element={<Students />} />
            <Route path="packages" element={<Packages />} />
            <Route path="billing" element={<Billing />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="reports" element={<Reports />} />
            <Route path="communications" element={<Communications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </DataProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
