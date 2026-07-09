import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
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

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const { session, profile, isAdmin, loading, signOut } = useAuth()

  if (loading) return <FullScreenSpinner />
  if (!session) return <Login />
  if (!profile) return <FullScreenSpinner />

  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout onLogout={signOut} />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="students" element={<Students />} />
            <Route path="packages" element={<Packages />} />
            <Route path="billing" element={<Billing />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="reports" element={<Reports />} />
            <Route path="communications" element={<Communications />} />
            <Route path="settings" element={isAdmin ? <Settings /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
