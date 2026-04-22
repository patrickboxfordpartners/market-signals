import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useAuth } from '../hooks/useAuth'
import { Activity, TrendingUp, Star, Trophy } from 'lucide-react'
import { formatNumber } from '../lib/utils'
import logoIcon from '../assets/logo-icon.png'

interface LeaderboardSource {
  id: string
  name: string
  username: string | null
  platform: string
  credibility_score: number
  total_predictions: number
  correct_predictions: number
  accuracy_rate: number
  reasoning_quality: number
  verified: boolean
  follower_count: number
}

const PLATFORM_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  stocktwits: 'StockTwits',
  twitter: 'Twitter/X',
  news: 'News',
  finnhub: 'Finnhub',
  alphavantage: 'Alpha Vantage',
}

export function PublicLeaderboard() {
  const { user } = useAuth()
  const [sources, setSources] = useState<LeaderboardSource[]>([])
  const [loading, setLoading] = useState(true)
  const [follows, setFollows] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSources()
  }, [])

  useEffect(() => {
    if (user) fetchFollows()
  }, [user])

  async function fetchSources() {
    const { data } = await supabase
      .from('sources')
      .select('id, name, username, platform, credibility_score, total_predictions, correct_predictions, accuracy_rate, reasoning_quality, verified, follower_count')
      .eq('is_active', true)
      .gte('total_predictions', 3)
      .order('credibility_score', { ascending: false })
      .limit(50)
    setSources(data || [])
    setLoading(false)
  }

  async function fetchFollows() {
    const { data } = await (supabase as any)
      .from('source_follows')
      .select('source_id')
      .eq('user_id', user!.id)
    setFollows(new Set((data || []).map((r: { source_id: string }) => r.source_id)))
  }

  async function toggleFollow(sourceId: string) {
    if (!user) return
    setFollowLoading(sourceId)
    const isFollowing = follows.has(sourceId)
    const next = new Set(follows)
    isFollowing ? next.delete(sourceId) : next.add(sourceId)
    setFollows(next)
    if (isFollowing) {
      await (supabase as any).from('source_follows').delete()
        .eq('user_id', user.id).eq('source_id', sourceId)
    } else {
      await (supabase as any).from('source_follows').insert({ user_id: user.id, source_id: sourceId })
    }
    setFollowLoading(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="" className="h-8 w-auto" />
            <span className="text-sm font-bold tracking-tight">STREET INSIGHTS</span>
          </div>
          {user ? (
            <a href="/" className="text-xs text-primary hover:underline font-semibold">Dashboard</a>
          ) : (
            <a href="/login" className="text-xs text-primary hover:underline font-semibold">Sign in</a>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="text-3xl font-bold tracking-tight">Top Predictors</h1>
          </div>
          <p className="text-muted-foreground">
            Sources ranked by prediction accuracy over the last 90 days. Credibility is earned, not bought.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono">{sources.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Ranked sources</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono">
              {sources.reduce((s, x) => s + x.total_predictions, 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total predictions</div>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono">
              {sources.length > 0
                ? (sources.reduce((s, x) => s + (x.accuracy_rate || 0), 0) / sources.length * 100).toFixed(1)
                : '—'}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Average accuracy</div>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-accent/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-right">Credibility</th>
                  <th className="px-4 py-3 text-right">Accuracy</th>
                  <th className="px-4 py-3 text-right">Predictions</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Reasoning</th>
                  {user && <th className="px-4 py-3 text-right w-24">Follow</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((source, index) => (
                  <tr key={source.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{source.name}</span>
                            {source.verified && (
                              <span className="text-xs text-blue-500 font-semibold">✓</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {PLATFORM_LABELS[source.platform] || source.platform}
                            </span>
                            {source.username && (
                              <span className="text-xs text-muted-foreground font-mono">
                                @{source.username}
                              </span>
                            )}
                            {source.follower_count > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatNumber(source.follower_count)} followers
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono font-bold ${
                        source.credibility_score >= 70
                          ? 'text-green-500'
                          : source.credibility_score >= 40
                          ? 'text-yellow-500'
                          : 'text-muted-foreground'
                      }`}>
                        {source.credibility_score.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      {source.accuracy_rate != null
                        ? `${(source.accuracy_rate * 100).toFixed(1)}%`
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-muted-foreground">
                      {source.correct_predictions}/{source.total_predictions}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-muted-foreground hidden sm:table-cell">
                      {source.reasoning_quality != null
                        ? `${(source.reasoning_quality * 100).toFixed(0)}%`
                        : '—'
                      }
                    </td>
                    {user && (
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => toggleFollow(source.id)}
                          disabled={followLoading === source.id}
                          className={`flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                            follows.has(source.id)
                              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20'
                              : 'border-border hover:bg-accent'
                          }`}
                        >
                          <Star className={`h-3.5 w-3.5 ${follows.has(source.id) ? 'fill-current' : ''}`} />
                          {follows.has(source.id) ? 'Following' : 'Follow'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {sources.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No sources with enough predictions yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Rankings update every 6 hours. Minimum 3 predictions required to appear.{' '}
          <a href="/login" className="text-primary hover:underline">Sign in</a> to follow sources and get alerts.
        </p>
      </div>
    </div>
  )
}
