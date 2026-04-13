import { useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { Navigate } from "react-router-dom"
import { Lock } from "lucide-react"
import logoIcon from "../assets/logo-icon.png"

export function Login() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-pulse">
          <img src={logoIcon} alt="" className="h-full w-full" />
        </div>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoIcon} alt="" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="text-sm font-bold tracking-tight uppercase">Street Insights</h1>
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">
            Boxford Partners
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sign In
            </span>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-background border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-background border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}
