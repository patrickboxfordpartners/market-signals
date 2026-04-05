import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

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

    // Real-time updates
    const subscription = supabase
      .channel('predictions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        () => {
          fetchSignals()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchSignals() {
    // Get all recent predictions (last 7 days)
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
      // Group by ticker and calculate weighted sentiment
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
        const weight = credibility / 100 // Normalize to 0-1

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

      // Calculate final weighted sentiment (-1 to +1)
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

      // Sort by absolute weighted sentiment (strongest signals first)
      signals.sort((a, b) => Math.abs(b.weighted_sentiment) - Math.abs(a.weighted_sentiment))

      setSignals(signals)
    }
    setLoading(false)
  }

  function getSignalStrength(sentiment: number): string {
    const abs = Math.abs(sentiment)
    if (abs >= 0.7) return 'Strong'
    if (abs >= 0.4) return 'Moderate'
    return 'Weak'
  }

  function getSignalColor(sentiment: number): string {
    if (sentiment > 0.4) return 'text-green-600'
    if (sentiment < -0.4) return 'text-red-600'
    return 'text-gray-600'
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
        <h1 className="text-3xl font-bold">Live Signals</h1>
        <p className="text-muted-foreground mt-1">
          Credibility-weighted sentiment aggregation (last 7 days)
        </p>
      </div>

      {signals.length === 0 ? (
        <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border p-12 text-center">
          <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Signals Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Signals will appear once predictions are captured and analyzed
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div
              key={signal.ticker_symbol}
              className="bg-card rounded-xl border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left Side */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold">${signal.ticker_symbol}</span>
                    <span className="text-sm text-muted-foreground">
                      {signal.company_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Sentiment Breakdown */}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>{signal.bullish_count}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Minus className="h-3 w-3" />
                        <span>{signal.neutral_count}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="h-3 w-3" />
                        <span>{signal.bearish_count}</span>
                      </div>
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {signal.high_credibility_count} high-credibility sources
                    </span>
                  </div>
                </div>

                {/* Right Side - Weighted Signal */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {signal.weighted_sentiment > 0 ? (
                      <TrendingUp className={`h-5 w-5 ${getSignalColor(signal.weighted_sentiment)}`} />
                    ) : signal.weighted_sentiment < 0 ? (
                      <TrendingDown className={`h-5 w-5 ${getSignalColor(signal.weighted_sentiment)}`} />
                    ) : (
                      <Minus className="h-5 w-5 text-gray-600" />
                    )}
                    <div>
                      <div className={`text-xl font-bold ${getSignalColor(signal.weighted_sentiment)}`}>
                        {signal.weighted_sentiment > 0 ? '+' : ''}
                        {(signal.weighted_sentiment * 100).toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getSignalStrength(signal.weighted_sentiment)} Signal
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="mt-2 w-32">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      {signal.weighted_sentiment > 0 ? (
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${Math.abs(signal.weighted_sentiment) * 100}%` }}
                        />
                      ) : (
                        <div
                          className="h-full bg-red-500 ml-auto"
                          style={{ width: `${Math.abs(signal.weighted_sentiment) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
