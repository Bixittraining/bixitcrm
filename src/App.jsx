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
import Batches from './pages/Batches'
import BatchDetail from './pages/BatchDetail'
import Packages from './pages/Packages'
import Billing from './pages/Billing'
import Pipeline from './pages/Pipeline'
import Reports from './pages/Reports'
import Conversations from './pages/Conversations'
import TeamActivity from './pages/TeamActivity'
import TeamMemberDetail from './pages/TeamMemberDetail'
import TeamPerformance from './pages/TeamPerformance'
import Settings from './pages/Settings'

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const { session, profile, loading, signOut } = useAuth()

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
            <Route path="batches" element={<Batches />} />
            <Route path="batches/:batchId" element={<BatchDetail />} />
            <Route path="packages" element={<Packages />} />
            <Route path="billing" element={<Billing />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="reports" element={<Reports />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="team-activity" element={<TeamActivity />} />
            <Route path="team-activity/:memberId" element={<TeamMemberDetail />} />
            <Route path="team-performance" element={<TeamPerformance />} />
            <Route path="settings" element={<Settings />} />
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
