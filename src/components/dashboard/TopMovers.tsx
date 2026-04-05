import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Flame } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

interface Mover {
  ticker_symbol: string
  company_name: string
  sentiment_change: number
  previous_sentiment: number
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
    // Get predictions from last 48 hours to calculate 24h change
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
        tickers (symbol, company_name),
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
            company_name: p.tickers.company_name,
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
          const sentimentChange = currentSentiment - oldSentiment

          return {
            ticker_symbol: t.ticker_symbol,
            company_name: t.company_name,
            sentiment_change: sentimentChange,
            previous_sentiment: oldSentiment,
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
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
            <Flame className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Top Movers (24h)</h2>
            <p className="text-xs text-muted-foreground">Biggest sentiment shifts</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : movers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Not enough data yet</p>
            <p className="text-xs mt-1">Need 48h of predictions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {movers.map((mover, index) => (
              <div
                key={mover.ticker_symbol}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-bold">${mover.ticker_symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {mover.mention_count} mentions
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">Sentiment Δ</div>
                    <div
                      className={`flex items-center gap-1 font-bold ${
                        mover.sentiment_change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {mover.sentiment_change > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {mover.sentiment_change > 0 ? '+' : ''}
                      {(mover.sentiment_change * 100).toFixed(0)}
                    </div>
                  </div>

                  <div className="w-20">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {(mover.previous_sentiment * 100).toFixed(0)}
                      </span>
                      <span className="font-medium">
                        {(mover.current_sentiment * 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          mover.current_sentiment > 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.abs(mover.current_sentiment) * 100}%`,
                          marginLeft:
                            mover.current_sentiment < 0
                              ? `${100 - Math.abs(mover.current_sentiment) * 100}%`
                              : '0',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
