import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { TrendingUp, Users, FileText, CheckCircle, Activity } from 'lucide-react'
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

    // Real-time subscription for new mentions
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

      // Set last scan time from most recent mention
      if (data.length > 0) {
        setLastScanTime(data[0].mentioned_at)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1">
          System health and recent activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Mentions"
          value={formatNumber(stats.totalMentions)}
          icon={<FileText className="h-5 w-5" />}
          description="Captured from all sources"
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Sources Tracked"
          value={formatNumber(stats.totalSources)}
          icon={<Users className="h-5 w-5" />}
          description="Unique analysts & publications"
          gradient="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Active Predictions"
          value={formatNumber(stats.activePredictions)}
          icon={<TrendingUp className="h-5 w-5" />}
          description="Awaiting validation"
          gradient="from-green-500 to-green-600"
        />
        <StatCard
          title="Validated"
          value={formatNumber(stats.validatedPredictions)}
          icon={<CheckCircle className="h-5 w-5" />}
          description="Historical track record"
          gradient="from-orange-500 to-orange-600"
        />
      </div>

      {/* System Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SystemStatus lastScanTime={lastScanTime} />
        <TopMovers />
        <ActivityTimeline />
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-muted/30 to-muted/10">
          <h2 className="text-lg font-semibold">Recent Mentions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live feed of captured mentions
          </p>
        </div>
        <div className="divide-y">
          {recentMentions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <FileText className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-sm">No mentions yet. The scanner will capture data every 15 minutes.</p>
            </div>
          ) : (
            recentMentions.map((mention) => (
              <div key={mention.id} className="p-4 hover:bg-accent/30 transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        ${mention.ticker_symbol}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {mention.source_name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {mention.platform}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">
                      {mention.content}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
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
  description,
  gradient,
}: {
  title: string
  value: string
  icon: React.ReactNode
  description: string
  gradient: string
}) {
  return (
    <div className="relative overflow-hidden bg-card rounded-xl border hover:shadow-lg transition-all duration-300 group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${gradient}`}>
            <div className="text-white">{icon}</div>
          </div>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
