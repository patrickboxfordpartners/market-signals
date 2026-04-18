import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Lock } from "lucide-react"
import logoIcon from "../assets/logo-icon.png"
import { supabase } from "../integrations/supabase/client"

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase sends the access_token in the URL hash after redirect.
  // onAuthStateChange will fire a PASSWORD_RECOVERY event which establishes
  // the session so updateUser works correctly.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true)
      }
    })

    // Also check if there's already an active session (in case the event
    // already fired before this component mounted).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

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
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate("/", { replace: true })
    } catch (err: any) {
      setError(err.message || "Could not update password")
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
          <p className="text-xs text-muted-foreground tracking-wider uppercase mt-0.5">
            Boxford Partners
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Set New Password
            </span>
          </div>

          {!ready && (
            <div className="text-xs text-muted-foreground bg-accent rounded-md px-3 py-2">
              Verifying reset link...
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!ready}
              className="w-full bg-background border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
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
              disabled={!ready}
              className="w-full bg-background border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !ready}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  )
}
