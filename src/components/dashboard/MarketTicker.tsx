import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  marketState?: string
}

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://worker-production-c529.up.railway.app'
const REFRESH_INTERVAL = 60_000

export function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    fetchQuotes()
    intervalRef.current = setInterval(fetchQuotes, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [])

  async function fetchQuotes() {
    try {
      const res = await fetch(`${WORKER_URL}/api/quotes`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data: Quote[] = await res.json()
      if (data.length > 0) setQuotes(data)
    } catch {
      // Silently fail — keep showing last known quotes
    }
  }

  if (quotes.length === 0) {
    return (
      <div className="h-10 bg-card border-b flex items-center px-4">
        <span className="text-xs text-muted-foreground font-mono">Loading quotes...</span>
      </div>
    )
  }

  // Triple the array for seamless scroll loop
  const displayQuotes = [...quotes, ...quotes, ...quotes]

  return (
    <div className="relative h-10 bg-card border-b overflow-hidden">
      <div className="absolute inset-0 flex items-center">
        <div className="flex gap-8 animate-ticker whitespace-nowrap px-4">
          {displayQuotes.map((q, i) => {
            const isUp = q.change > 0
            const isDown = q.change < 0
            const colorClass = isUp
              ? 'text-green-500'
              : isDown
                ? 'text-red-500'
                : 'text-muted-foreground'

            return (
              <div key={`${q.symbol}-${i}`} className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground tracking-wide">
                  {q.symbol}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {q.price.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-mono ${colorClass}`}>
                  {isUp ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : isDown ? (
                    <TrendingDown className="h-2.5 w-2.5" />
                  ) : (
                    <Minus className="h-2.5 w-2.5" />
                  )}
                  {isUp ? '+' : ''}{q.changePercent.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
