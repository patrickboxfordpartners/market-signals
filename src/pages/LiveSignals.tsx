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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Signals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Credibility-weighted sentiment — last 7 days
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
          <Radio className="h-3.5 w-3.5 text-green-500 animate-pulse" />
          <span className="font-medium text-green-700 dark:text-green-400">Real-time</span>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-16 text-center">
          <Radio className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-base font-bold mb-2">No Signals Yet</h3>
          <p className="text-sm text-muted-foreground">
            Signals appear once predictions are captured and analyzed
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => {
            const sentimentPct = Math.abs(signal.weighted_sentiment) * 100
            const isBull = signal.weighted_sentiment > 0
            const isBear = signal.weighted_sentiment < 0
            const strength =
              sentimentPct >= 70 ? 'Strong' : sentimentPct >= 40 ? 'Moderate' : 'Weak'

            return (
              <div
                key={signal.ticker_symbol}
                className="bg-card rounded-lg border shadow-sm p-5 card-glow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Ticker info */}
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="w-24">
                      <div className="text-base font-bold font-mono">${signal.ticker_symbol}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {signal.company_name}
                      </div>
                    </div>

                    {/* Sentiment breakdown */}
                    <div className="flex items-center gap-4 text-sm font-mono">
                      <span className="flex items-center gap-1.5 text-green-500 font-bold">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {signal.bullish_count}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground font-bold">
                        <Minus className="h-3.5 w-3.5" />
                        {signal.neutral_count}
                      </span>
                      <span className="flex items-center gap-1.5 text-red-500 font-bold">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {signal.bearish_count}
                      </span>
                    </div>

                    <div className="hidden sm:block text-xs text-muted-foreground bg-accent px-2.5 py-1 rounded-md">
                      {signal.high_credibility_count} high-cred source{signal.high_credibility_count !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Right: Signal gauge */}
                  <div className="flex items-center gap-4">
                    {/* Sentiment bar — centered, bull goes right, bear goes left */}
                    <div className="w-36 hidden md:block">
                      <div className="h-3 bg-accent rounded-full overflow-hidden relative">
                        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-border z-10" />
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
                    <div className="text-right w-20">
                      <div
                        className={`text-2xl font-bold font-mono ${
                          isBull ? 'text-green-500' : isBear ? 'text-red-500' : 'text-muted-foreground'
                        }`}
                      >
                        {isBull ? '+' : ''}
                        {(signal.weighted_sentiment * 100).toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold">{strength}</div>
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
