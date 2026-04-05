import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, TrendingDown, Minus, Radio } from 'lucide-react'

interface Signal {
  ticker_symbol: string
  company_name: string
  bullish_count: number
  bearish_count: number
  neutral_count: number
  weighted_sentiment: number
  high_credibility_count: number
  total_predictions: number
}

export function LiveSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSignals()

    const subscription = supabase
      .channel('predictions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        () => fetchSignals()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchSignals() {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: predictions } = await supabase
      .from('predictions')
      .select(
        `
        sentiment,
        tickers (symbol, company_name),
        sources (credibility_score)
      `
      )
      .gte('prediction_date', sevenDaysAgo.toISOString())

    if (predictions) {
      const tickerMap = new Map<string, any>()

      predictions.forEach((p: any) => {
        const symbol = p.tickers?.symbol
        if (!symbol) return

        if (!tickerMap.has(symbol)) {
          tickerMap.set(symbol, {
            ticker_symbol: symbol,
            company_name: p.tickers.company_name,
            bullish_count: 0,
            bearish_count: 0,
            neutral_count: 0,
            weighted_sentiment_sum: 0,
            high_credibility_count: 0,
            total_weight: 0,
            total_predictions: 0,
          })
        }

        const ticker = tickerMap.get(symbol)
        const credibility = p.sources?.credibility_score || 50
        const weight = credibility / 100

        ticker.total_predictions++

        if (credibility >= 70) {
          ticker.high_credibility_count++
        }

        if (p.sentiment === 'bullish') {
          ticker.bullish_count++
          ticker.weighted_sentiment_sum += weight
          ticker.total_weight += weight
        } else if (p.sentiment === 'bearish') {
          ticker.bearish_count++
          ticker.weighted_sentiment_sum -= weight
          ticker.total_weight += weight
        } else {
          ticker.neutral_count++
          ticker.total_weight += weight
        }
      })

      const signals: Signal[] = Array.from(tickerMap.values()).map((ticker) => ({
        ticker_symbol: ticker.ticker_symbol,
        company_name: ticker.company_name,
        bullish_count: ticker.bullish_count,
        bearish_count: ticker.bearish_count,
        neutral_count: ticker.neutral_count,
        weighted_sentiment:
          ticker.total_weight > 0 ? ticker.weighted_sentiment_sum / ticker.total_weight : 0,
        high_credibility_count: ticker.high_credibility_count,
        total_predictions: ticker.total_predictions,
      }))

      signals.sort((a, b) => Math.abs(b.weighted_sentiment) - Math.abs(a.weighted_sentiment))
      setSignals(signals)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Signals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Credibility-weighted sentiment -- last 7 days
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className="h-3 w-3 text-green-500" />
          <span>Real-time</span>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Radio className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-30" />
          <h3 className="text-sm font-semibold mb-1">No Signals Yet</h3>
          <p className="text-xs text-muted-foreground">
            Signals appear once predictions are captured and analyzed
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map((signal) => {
            const sentimentPct = Math.abs(signal.weighted_sentiment) * 100
            const isBull = signal.weighted_sentiment > 0
            const isBear = signal.weighted_sentiment < 0
            const strength =
              sentimentPct >= 70 ? 'Strong' : sentimentPct >= 40 ? 'Moderate' : 'Weak'

            return (
              <div
                key={signal.ticker_symbol}
                className="bg-card rounded-lg border p-4 card-glow"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Ticker info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20">
                      <div className="text-sm font-bold font-mono">{signal.ticker_symbol}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {signal.company_name}
                      </div>
                    </div>

                    {/* Sentiment breakdown */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="flex items-center gap-1 text-green-500">
                        <TrendingUp className="h-3 w-3" />
                        {signal.bullish_count}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Minus className="h-3 w-3" />
                        {signal.neutral_count}
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <TrendingDown className="h-3 w-3" />
                        {signal.bearish_count}
                      </span>
                    </div>

                    <div className="hidden sm:block text-[10px] text-muted-foreground">
                      {signal.high_credibility_count} high-cred source{signal.high_credibility_count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Right: Signal gauge */}
                  <div className="flex items-center gap-3">
                    {/* Sentiment bar — centered, bull goes right, bear goes left */}
                    <div className="w-32 hidden md:block">
                      <div className="h-2 bg-accent rounded-full overflow-hidden relative">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-border z-10" />
                        {isBull && (
                          <div
                            className="absolute inset-y-0 left-1/2 bg-green-500 rounded-r-full"
                            style={{ width: `${sentimentPct / 2}%` }}
                          />
                        )}
                        {isBear && (
                          <div
                            className="absolute inset-y-0 bg-red-500 rounded-l-full"
                            style={{
                              width: `${sentimentPct / 2}%`,
                              right: '50%',
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right w-16">
                      <div
                        className={`text-lg font-bold font-mono ${
                          isBull ? 'text-green-500' : isBear ? 'text-red-500' : 'text-muted-foreground'
                        }`}
                      >
                        {isBull ? '+' : ''}
                        {(signal.weighted_sentiment * 100).toFixed(0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{strength}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
