import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

interface TickerData {
  symbol: string
  mention_count: number
  sentiment: number // -1 to +1
  spike: boolean
}

export function MarketTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([])

  useEffect(() => {
    fetchTickerData()
  }, [])

  async function fetchTickerData() {
    // Pull real tickers from the DB
    const { data: tickerRows } = await supabase
      .from('tickers')
      .select('symbol, avg_daily_mentions')
      .eq('is_active', true)
      .order('avg_daily_mentions', { ascending: false })
      .limit(20)

    if (tickerRows && tickerRows.length > 0) {
      // Get recent spikes
      const today = new Date().toISOString().split('T')[0]
      const { data: spikes } = await supabase
        .from('mention_frequency')
        .select('ticker_id, tickers(symbol)')
        .eq('spike_detected', true)
        .gte('date', today)

      const spikeSymbols = new Set(
        (spikes || []).map((s: any) => s.tickers?.symbol).filter(Boolean)
      )

      setTickers(
        tickerRows.map((t) => ({
          symbol: t.symbol,
          mention_count: t.avg_daily_mentions,
          sentiment: 0, // Neutral until we have prediction data
          spike: spikeSymbols.has(t.symbol),
        }))
      )
    } else {
      // Fallback: show placeholder tickers so the bar isn't empty
      const placeholders = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMD', 'PLTR']
      setTickers(
        placeholders.map((s) => ({
          symbol: s,
          mention_count: 0,
          sentiment: 0,
          spike: false,
        }))
      )
    }
  }

  if (tickers.length === 0) return null

  const displayTickers = [...tickers, ...tickers, ...tickers]

  return (
    <div className="relative h-10 bg-card border-b overflow-hidden">
      <div className="absolute inset-0 flex items-center">
        <div className="flex gap-6 animate-ticker whitespace-nowrap px-4">
          {displayTickers.map((ticker, index) => (
            <div
              key={`${ticker.symbol}-${index}`}
              className="flex items-center gap-2"
            >
              <span className="text-xs font-bold text-foreground tracking-wide">
                {ticker.symbol}
              </span>
              {ticker.spike && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
              <span className="text-xs font-mono text-muted-foreground">
                {ticker.mention_count > 0
                  ? `${ticker.mention_count}/d`
                  : '--'}
              </span>
              {ticker.sentiment !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-mono ${
                    ticker.sentiment > 0
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  {ticker.sentiment > 0 ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5" />
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
