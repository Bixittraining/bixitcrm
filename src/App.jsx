import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'

// Login/Layout load eagerly (needed immediately); everything behind auth is
// code-split per route so a first visit only downloads Dashboard's code,
// not Reports' jsPDF/xlsx/recharts bundle or every other page at once.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Leads = lazy(() => import('./pages/Leads'))
const FollowUps = lazy(() => import('./pages/FollowUps'))
const Students = lazy(() => import('./pages/Students'))
const Batches = lazy(() => import('./pages/Batches'))
const BatchDetail = lazy(() => import('./pages/BatchDetail'))
const Packages = lazy(() => import('./pages/Packages'))
const Billing = lazy(() => import('./pages/Billing'))
const Pipeline = lazy(() => import('./pages/Pipeline'))
const Reports = lazy(() => import('./pages/Reports'))
const Conversations = lazy(() => import('./pages/Conversations'))
const TeamActivity = lazy(() => import('./pages/TeamActivity'))
const TeamMemberDetail = lazy(() => import('./pages/TeamMemberDetail'))
const TeamPerformance = lazy(() => import('./pages/TeamPerformance'))
const Settings = lazy(() => import('./pages/Settings'))

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
        <Suspense fallback={<FullScreenSpinner />}>
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
        </Suspense>
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
