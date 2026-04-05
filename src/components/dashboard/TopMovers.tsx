import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

interface Mover {
  ticker_symbol: string
  sentiment_change: number
  current_sentiment: number
  mention_count: number
}

export function TopMovers() {
  const [movers, setMovers] = useState<Mover[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopMovers()
  }, [])

  async function fetchTopMovers() {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { data: predictions } = await supabase
      .from('predictions')
      .select(
        `
        sentiment,
        prediction_date,
        tickers (symbol),
        sources (credibility_score)
      `
      )
      .gte('prediction_date', twoDaysAgo.toISOString())

    if (predictions) {
      const tickerMap = new Map<string, any>()

      predictions.forEach((p: any) => {
        const symbol = p.tickers?.symbol
        if (!symbol) return

        const predictionDate = new Date(p.prediction_date)
        const isRecent = predictionDate > oneDayAgo

        if (!tickerMap.has(symbol)) {
          tickerMap.set(symbol, {
            ticker_symbol: symbol,
            recent_bullish: 0,
            recent_bearish: 0,
            old_bullish: 0,
            old_bearish: 0,
            recent_count: 0,
            old_count: 0,
          })
        }

        const ticker = tickerMap.get(symbol)
        const credibility = p.sources?.credibility_score || 50
        const weight = credibility / 100

        if (isRecent) {
          ticker.recent_count++
          if (p.sentiment === 'bullish') ticker.recent_bullish += weight
          if (p.sentiment === 'bearish') ticker.recent_bearish += weight
        } else {
          ticker.old_count++
          if (p.sentiment === 'bullish') ticker.old_bullish += weight
          if (p.sentiment === 'bearish') ticker.old_bearish += weight
        }
      })

      const movers: Mover[] = Array.from(tickerMap.values())
        .filter((t) => t.recent_count > 0 && t.old_count > 0)
        .map((t) => {
          const oldSentiment = t.old_count > 0 ? (t.old_bullish - t.old_bearish) / t.old_count : 0
          const currentSentiment =
            t.recent_count > 0 ? (t.recent_bullish - t.recent_bearish) / t.recent_count : 0

          return {
            ticker_symbol: t.ticker_symbol,
            sentiment_change: currentSentiment - oldSentiment,
            current_sentiment: currentSentiment,
            mention_count: t.recent_count,
          }
        })
        .sort((a, b) => Math.abs(b.sentiment_change) - Math.abs(a.sentiment_change))
        .slice(0, 5)

      setMovers(movers)
    }
    setLoading(false)
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Flame className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-sm font-semibold">Top Movers</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">24h</span>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : movers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-xs">Needs 48h of prediction data</p>
          </div>
        ) : (
          <div className="space-y-2">
            {movers.map((mover) => (
              <div
                key={mover.ticker_symbol}
                className="flex items-center justify-between p-2.5 rounded-md bg-accent/30 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono">{mover.ticker_symbol}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {mover.mention_count} mentions
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {mover.sentiment_change > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={`text-xs font-mono font-bold ${
                      mover.sentiment_change > 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {mover.sentiment_change > 0 ? '+' : ''}
                    {(mover.sentiment_change * 100).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
