import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TickerData {
  symbol: string
  price: number
  change: number
  changePercent: number
}

export function MarketTicker() {
  const [tickers, setTickers] = useState<TickerData[]>([])

  useEffect(() => {
    // Mock data - in production this would fetch from Alpha Vantage or real-time API
    const mockTickers: TickerData[] = [
      { symbol: 'NVDA', price: 892.45, change: 12.34, changePercent: 1.4 },
      { symbol: 'TSLA', price: 245.67, change: -3.21, changePercent: -1.29 },
      { symbol: 'AAPL', price: 178.23, change: 2.45, changePercent: 1.39 },
      { symbol: 'MSFT', price: 412.89, change: 5.67, changePercent: 1.39 },
      { symbol: 'GOOGL', price: 156.34, change: -1.23, changePercent: -0.78 },
      { symbol: 'META', price: 489.12, change: 8.90, changePercent: 1.85 },
      { symbol: 'AMD', price: 167.45, change: 4.32, changePercent: 2.65 },
      { symbol: 'COIN', price: 234.56, change: -5.43, changePercent: -2.26 },
      { symbol: 'PLTR', price: 45.67, change: 1.23, changePercent: 2.77 },
      { symbol: 'GME', price: 28.90, change: 0.45, changePercent: 1.58 },
    ]

    setTickers(mockTickers)
  }, [])

  return (
    <div className="relative h-12 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 overflow-hidden">
      <div className="absolute inset-0 flex items-center">
        <div className="flex gap-8 animate-scroll whitespace-nowrap">
          {/* Duplicate the tickers array to create seamless loop */}
          {[...tickers, ...tickers, ...tickers].map((ticker, index) => (
            <div
              key={`${ticker.symbol}-${index}`}
              className="flex items-center gap-3 px-4 py-2"
            >
              <span className="text-sm font-bold text-white">{ticker.symbol}</span>
              <span className="text-sm font-medium text-slate-300">
                ${ticker.price.toFixed(2)}
              </span>
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  ticker.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {ticker.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {ticker.change >= 0 ? '+' : ''}
                  {ticker.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add the animation to index.css */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .animate-scroll {
          animation: scroll 60s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
