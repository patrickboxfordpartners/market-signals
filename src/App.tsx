import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { Overview } from './pages/Overview'
import { SourceLeaderboard } from './pages/SourceLeaderboard'
import { TickerAnalysis } from './pages/TickerAnalysis'
import { TickerDetail } from './pages/TickerDetail'
import { PredictionsTracker } from './pages/PredictionsTracker'
import { LiveSignals } from './pages/LiveSignals'
import { Login } from './pages/Login'
import { Activity } from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="sources" element={<SourceLeaderboard />} />
            <Route path="tickers" element={<TickerAnalysis />} />
            <Route path="tickers/:symbol" element={<TickerDetail />} />
            <Route path="predictions" element={<PredictionsTracker />} />
            <Route path="signals" element={<LiveSignals />} />
          </Route>
        </Routes>
        <Analytics />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
