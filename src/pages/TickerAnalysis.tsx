import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatNumber, formatDate } from '../lib/utils'

interface TickerStat {
  id: string
  symbol: string
  company_name: string | null
  mention_count: number
  spike_detected: boolean
  avg_daily_mentions: number
  is_active: boolean
  last_mention_date: string | null
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
      .select(
        `
        id,
        symbol,
        company_name,
        avg_daily_mentions,
        is_active
      `
      )
      .eq('is_active', true)
      .order('symbol')

    if (data) {
      const tickerStats = await Promise.all(
        data.map(async (ticker) => {
          const { count } = await supabase
            .from('mentions')
            .select('*', { count: 'exact', head: true })
            .eq('ticker_id', ticker.id)

          const { data: recentSpike } = await supabase
            .from('mention_frequency')
            .select('spike_detected, date')
            .eq('ticker_id', ticker.id)
            .eq('spike_detected', true)
            .order('date', { ascending: false })
            .limit(1)
            .single()

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
            spike_detected: !!recentSpike,
            last_mention_date: lastMention?.mentioned_at || null,
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
        <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ticker Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Mention frequency and spike detection across {tickers.length} tracked tickers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickers Grid */}
        <div className="lg:col-span-2 space-y-3">
          {tickers.map((ticker) => (
            <div
              key={ticker.id}
              className="bg-card rounded-xl border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">${ticker.symbol}</span>
                      {ticker.spike_detected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Spike
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {ticker.company_name}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold">{formatNumber(ticker.mention_count)}</div>
                  <span className="text-xs text-muted-foreground">total mentions</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Avg: {ticker.avg_daily_mentions}/day
                </span>
                {ticker.last_mention_date && (
                  <span className="text-muted-foreground">
                    Last: {formatDate(ticker.last_mention_date)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold">Most Active</h3>
            </div>
            <div className="space-y-3">
              {tickers.slice(0, 5).map((ticker, index) => (
                <div key={ticker.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    <span className="text-sm font-medium">${ticker.symbol}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(ticker.mention_count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold">Recent Spikes</h3>
            </div>
            <div className="space-y-3">
              {tickers
                .filter((t) => t.spike_detected)
                .slice(0, 5)
                .map((ticker) => (
                  <div key={ticker.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">${ticker.symbol}</span>
                    <span className="text-xs text-red-600">Active</span>
                  </div>
                ))}
              {tickers.filter((t) => t.spike_detected).length === 0 && (
                <p className="text-sm text-muted-foreground">No spikes detected</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
