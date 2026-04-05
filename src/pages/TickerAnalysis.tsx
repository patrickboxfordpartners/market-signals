import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatNumber, formatDate } from '../lib/utils'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface TickerStat {
  id: string
  symbol: string
  company_name: string | null
  mention_count: number
  spike_detected: boolean
  avg_daily_mentions: number
  is_active: boolean
  last_mention_date: string | null
  sparkline: { date: string; count: number }[]
}

export function TickerAnalysis() {
  const [tickers, setTickers] = useState<TickerStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickers()
  }, [])

  async function fetchTickers() {
    const { data } = await supabase
      .from('tickers')
      .select('id, symbol, company_name, avg_daily_mentions, is_active')
      .eq('is_active', true)
      .order('symbol')

    if (data) {
      // Fetch sparkline data for all tickers (last 14 days)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      const { data: frequencyData } = await supabase
        .from('mention_frequency')
        .select('ticker_id, date, mention_count, spike_detected')
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })

      const frequencyMap = new Map<string, { date: string; count: number }[]>()
      const spikeMap = new Map<string, boolean>()

      if (frequencyData) {
        for (const row of frequencyData) {
          if (!frequencyMap.has(row.ticker_id)) {
            frequencyMap.set(row.ticker_id, [])
          }
          frequencyMap.get(row.ticker_id)!.push({
            date: row.date,
            count: row.mention_count,
          })
          if (row.spike_detected) {
            spikeMap.set(row.ticker_id, true)
          }
        }
      }

      const tickerStats = await Promise.all(
        data.map(async (ticker) => {
          const { count } = await supabase
            .from('mentions')
            .select('*', { count: 'exact', head: true })
            .eq('ticker_id', ticker.id)

          const { data: lastMention } = await supabase
            .from('mentions')
            .select('mentioned_at')
            .eq('ticker_id', ticker.id)
            .order('mentioned_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...ticker,
            mention_count: count || 0,
            spike_detected: spikeMap.has(ticker.id),
            last_mention_date: lastMention?.mentioned_at || null,
            sparkline: frequencyMap.get(ticker.id) || [],
          }
        })
      )

      setTickers(tickerStats.sort((a, b) => b.mention_count - a.mention_count))
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Mention frequency and spike detection -- {tickers.length} tracked
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main list */}
        <div className="lg:col-span-2 space-y-2">
          {tickers.map((ticker) => (
            <Link
              key={ticker.id}
              to={`/tickers/${ticker.symbol}`}
              className="block bg-card rounded-lg border p-4 card-glow"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-24">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono">{ticker.symbol}</span>
                      {ticker.spike_detected && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          SPIKE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {ticker.company_name}
                    </span>
                  </div>

                  {/* Sparkline */}
                  <div className="w-24 h-8 hidden sm:block">
                    {ticker.sparkline.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={ticker.sparkline}>
                          <defs>
                            <linearGradient id={`spark-${ticker.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="hsl(38 92% 50%)"
                            strokeWidth={1.5}
                            fill={`url(#spark-${ticker.id})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="h-px w-full bg-border" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-lg font-bold font-mono">{formatNumber(ticker.mention_count)}</div>
                    <span className="text-[10px] text-muted-foreground">total</span>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-mono text-muted-foreground">{ticker.avg_daily_mentions}/d</div>
                    <span className="text-[10px] text-muted-foreground">avg</span>
                  </div>
                  {ticker.last_mention_date && (
                    <div className="hidden md:block">
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {formatDate(ticker.last_mention_date)}
                      </div>
                      <span className="text-[10px] text-muted-foreground">last seen</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {tickers.length === 0 && (
            <div className="bg-card rounded-lg border p-12 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-30" />
              <h3 className="text-sm font-semibold mb-1">No Tickers</h3>
              <p className="text-xs text-muted-foreground">
                Add tickers to the database to start tracking
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-sm font-semibold">Most Active</h3>
            </div>
            <div className="p-3 space-y-1">
              {tickers.slice(0, 5).map((ticker, index) => (
                <div key={ticker.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono w-4">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold font-mono">{ticker.symbol}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatNumber(ticker.mention_count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <h3 className="text-sm font-semibold">Active Spikes</h3>
            </div>
            <div className="p-3">
              {tickers.filter((t) => t.spike_detected).length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No spikes detected</p>
              ) : (
                <div className="space-y-1">
                  {tickers
                    .filter((t) => t.spike_detected)
                    .slice(0, 5)
                    .map((ticker) => (
                      <div key={ticker.id} className="flex items-center justify-between p-2 rounded-md bg-red-500/5 border border-red-500/10">
                        <span className="text-xs font-bold font-mono">{ticker.symbol}</span>
                        <span className="text-[10px] font-medium text-red-500">ACTIVE</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
