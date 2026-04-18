import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { Overview } from './pages/Overview'
import { SourceLeaderboard } from './pages/SourceLeaderboard'
import { TickerAnalysis } from './pages/TickerAnalysis'
import { TickerDetail } from './pages/TickerDetail'
import { PredictionsTracker } from './pages/PredictionsTracker'
import { LiveSignals } from './pages/LiveSignals'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import AlertPreferences from './pages/AlertPreferences'
import AlertHistory from './pages/AlertHistory'
import MLSignals from './pages/MLSignals'
import { Analytics } from '@vercel/analytics/react'
import * as Sentry from '@sentry/react'
import logoIcon from './assets/logo-icon.png'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-pulse">
          <img src={logoIcon} alt="" className="h-full w-full" />
        </div>
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
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center">
            <img src={logoIcon} alt="" className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <details className="text-left mb-4">
              <summary className="text-sm font-mono cursor-pointer text-muted-foreground">
                Error details
              </summary>
              <pre className="text-xs mt-2 p-2 bg-accent rounded overflow-auto">
                {error?.toString()}
              </pre>
            </details>
            <button
              onClick={resetError}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      showDialog
    >
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                <Route path="ml-signals" element={<MLSignals />} />
                <Route path="alerts" element={<AlertPreferences />} />
                <Route path="alerts/history" element={<AlertHistory />} />
              </Route>
            </Routes>
            <Analytics />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}

export default App
