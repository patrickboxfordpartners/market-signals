import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { TrendingUp, Users, FileText, CheckCircle, Activity, Radio } from 'lucide-react'
import { formatNumber, formatDateTime } from '../lib/utils'
import { SystemStatus } from '../components/dashboard/SystemStatus'
import { TopMovers } from '../components/dashboard/TopMovers'
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline'

interface Stats {
  totalMentions: number
  totalSources: number
  activePredictions: number
  validatedPredictions: number
}

interface RecentMention {
  id: string
  content: string
  ticker_symbol: string
  source_name: string
  platform: string
  mentioned_at: string
}

export function Overview() {
  const [stats, setStats] = useState<Stats>({
    totalMentions: 0,
    totalSources: 0,
    activePredictions: 0,
    validatedPredictions: 0,
  })
  const [recentMentions, setRecentMentions] = useState<RecentMention[]>([])
  const [loading, setLoading] = useState(true)
  const [lastScanTime, setLastScanTime] = useState<string | undefined>()

  useEffect(() => {
    fetchStats()
    fetchRecentMentions()

    const subscription = supabase
      .channel('mentions-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mentions' },
        () => {
          fetchStats()
          fetchRecentMentions()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchStats() {
    const [mentions, sources, predictions, validated] = await Promise.all([
      supabase.from('mentions').select('*', { count: 'exact', head: true }),
      supabase.from('sources').select('*', { count: 'exact', head: true }),
      supabase.from('predictions').select('*', { count: 'exact', head: true }),
      supabase.from('validations').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      totalMentions: mentions.count || 0,
      totalSources: sources.count || 0,
      activePredictions: predictions.count || 0,
      validatedPredictions: validated.count || 0,
    })
    setLoading(false)
  }

  async function fetchRecentMentions() {
    const { data } = await supabase
      .from('mentions')
      .select(
        `
        id,
        content,
        platform,
        mentioned_at,
        tickers (symbol),
        sources (name)
      `
      )
      .order('mentioned_at', { ascending: false })
      .limit(10)

    if (data) {
      setRecentMentions(
        data.map((m: any) => ({
          id: m.id,
          content: m.content,
          ticker_symbol: m.tickers?.symbol || 'Unknown',
          source_name: m.sources?.name || 'Unknown',
          platform: m.platform,
          mentioned_at: m.mentioned_at,
        }))
      )

      if (data.length > 0) {
        setLastScanTime(data[0].mentioned_at)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System health and recent activity
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
          <Radio className="h-3.5 w-3.5 text-green-500 animate-pulse" />
          <span className="font-medium text-green-700 dark:text-green-400">Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mentions"
          value={stats.totalMentions}
          icon={<FileText className="h-4 w-4" />}
          label="total captured"
        />
        <StatCard
          title="Sources"
          value={stats.totalSources}
          icon={<Users className="h-4 w-4" />}
          label="tracked"
        />
        <StatCard
          title="Predictions"
          value={stats.activePredictions}
          icon={<TrendingUp className="h-4 w-4" />}
          label="active"
        />
        <StatCard
          title="Validated"
          value={stats.validatedPredictions}
          icon={<CheckCircle className="h-4 w-4" />}
          label="outcomes"
        />
      </div>

      {/* System Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SystemStatus lastScanTime={lastScanTime} />
        <TopMovers />
        <ActivityTimeline />
      </div>

      {/* Recent Mentions */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-accent/30 flex items-center justify-between">
          <h2 className="text-base font-bold">Recent Mentions</h2>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-md">Live feed</span>
        </div>
        <div className="divide-y divide-border">
          {recentMentions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No mentions yet.</p>
              <p className="text-xs mt-1">The scanner runs every 15 minutes once API keys are configured.</p>
            </div>
          ) : (
            recentMentions.map((mention) => (
              <div key={mention.id} className="px-5 py-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-sm font-mono font-bold text-primary">
                        ${mention.ticker_symbol}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {mention.source_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent text-muted-foreground uppercase tracking-wider font-semibold">
                        {mention.platform}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
                      {mention.content}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap mt-0.5">
                    {formatDateTime(mention.mentioned_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  label,
}: {
  title: string
  value: number
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow card-glow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className="text-muted-foreground opacity-60">{icon}</div>
      </div>
      <div className="text-3xl font-bold font-mono tracking-tight mb-1">
        {formatNumber(value)}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
