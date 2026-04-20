import { useState } from "react"
import { Link } from "react-router-dom"
import { KeyRound } from "lucide-react"
import logoIcon from "../assets/logo-icon.png"
import { supabase } from "../integrations/supabase/client"

export function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Could not send reset email")
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

        {success ? (
          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="text-xs font-medium text-emerald-500 uppercase tracking-wider mb-3">
              Email Sent
            </div>
            <p className="text-sm text-muted-foreground">
              Check your email for a password reset link.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-xs text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="bg-card rounded-lg border p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Reset Password
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

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Remember your password?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
