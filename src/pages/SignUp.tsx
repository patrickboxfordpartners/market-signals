import { useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { Navigate, Link, useSearchParams } from "react-router-dom"
import { UserPlus } from "lucide-react"
import logoIcon from "../assets/logo-icon.png"
import { supabase } from "../integrations/supabase/client"

export function SignUp() {
  const { session, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const checkoutSuccess = searchParams.get("checkout") === "success"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

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

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      const msg = err.message || "Could not create account"
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already in use")) {
        setError("An account with this email already exists. Sign in instead.")
      } else if (msg.toLowerCase().includes("password")) {
        setError("Password is too weak. Use at least 6 characters.")
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-xs text-center">
          <img src={logoIcon} alt="" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="text-sm font-bold tracking-tight uppercase">Street Insights</h1>
          <p className="text-xs text-muted-foreground tracking-wider uppercase mt-0.5 mb-8">
            Boxford Partners
          </p>
          <div className="bg-card rounded-lg border p-6">
            <div className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-3">
              Account Created
            </div>
            <p className="text-sm text-muted-foreground">
              Check your email to confirm your account. Once confirmed, you can sign in.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-xs text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoIcon} alt="" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="text-sm font-bold tracking-tight uppercase">Street Insights</h1>
          <p className="text-xs text-muted-foreground tracking-wider uppercase mt-0.5">
            Boxford Partners
          </p>
        </div>

        {/* Post-checkout banner */}
        {checkoutSuccess && (
          <div className="mb-4 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2 text-center">
            Payment successful — create your account to get started
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Create Account
            </span>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
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
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
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

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
