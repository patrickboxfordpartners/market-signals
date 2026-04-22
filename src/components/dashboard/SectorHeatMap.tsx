import { useEffect, useState } from 'react'
import { supabase } from '../../integrations/supabase/client'
import { Layers } from 'lucide-react'

interface SectorData {
  sector: string
  mentionCount: number
  bullishRatio: number
  tickerCount: number
}

export function SectorHeatMap() {
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSectorData()
  }, [])

  async function fetchSectorData() {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: tickers } = await supabase
      .from('tickers')
      .select('id, sector')
      .eq('is_active', true)
      .not('sector', 'is', null)

    if (!tickers || tickers.length === 0) { setLoading(false); return }

    const sectorMap: Record<string, { tickerIds: string[]; tickerCount: number }> = {}
    for (const t of tickers) {
      if (!t.sector) continue
      if (!sectorMap[t.sector]) sectorMap[t.sector] = { tickerIds: [], tickerCount: 0 }
      sectorMap[t.sector].tickerIds.push(t.id)
      sectorMap[t.sector].tickerCount++
    }

    const allTickerIds = tickers.map(t => t.id)
    const { data: predictions } = await supabase
      .from('predictions')
      .select('ticker_id, sentiment')
      .in('ticker_id', allTickerIds)
      .gte('prediction_date', sevenDaysAgo.toISOString())

    const { data: mentions } = await supabase
      .from('mentions')
      .select('ticker_id')
      .in('ticker_id', allTickerIds)
      .gte('mentioned_at', sevenDaysAgo.toISOString())

    const mentionsByTicker: Record<string, number> = {}
    for (const m of mentions || []) {
      mentionsByTicker[m.ticker_id] = (mentionsByTicker[m.ticker_id] || 0) + 1
    }

    const predsByTicker: Record<string, { bullish: number; bearish: number }> = {}
    for (const p of predictions || []) {
      if (!predsByTicker[p.ticker_id]) predsByTicker[p.ticker_id] = { bullish: 0, bearish: 0 }
      if (p.sentiment === 'bullish') predsByTicker[p.ticker_id].bullish++
      else if (p.sentiment === 'bearish') predsByTicker[p.ticker_id].bearish++
    }

    const result: SectorData[] = Object.entries(sectorMap).map(([sector, { tickerIds, tickerCount }]) => {
      let totalMentions = 0, totalBullish = 0, totalBearish = 0
      for (const id of tickerIds) {
        totalMentions += mentionsByTicker[id] || 0
        totalBullish += predsByTicker[id]?.bullish || 0
        totalBearish += predsByTicker[id]?.bearish || 0
      }
      const total = totalBullish + totalBearish
      return {
        sector,
        mentionCount: totalMentions,
        bullishRatio: total > 0 ? totalBullish / total : 0.5,
        tickerCount,
      }
    })
    .filter(s => s.mentionCount > 0)
    .sort((a, b) => b.mentionCount - a.mentionCount)

    setSectors(result)
    setLoading(false)
  }

  if (loading || sectors.length === 0) return null

  const maxMentions = Math.max(...sectors.map(s => s.mentionCount), 1)

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-accent/30 flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="text-base font-bold">Sector Sentiment</h2>
        <span className="ml-auto text-xs text-muted-foreground">7d</span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sectors.map(s => {
          const sizePct = 0.5 + 0.5 * (s.mentionCount / maxMentions)
          // bullishRatio 0=red, 0.5=neutral, 1=green
          const r = s.bullishRatio < 0.5
            ? 239
            : Math.round(239 - (s.bullishRatio - 0.5) * 2 * (239 - 34))
          const g = s.bullishRatio > 0.5
            ? 197
            : Math.round((s.bullishRatio / 0.5) * 197)
          const b = 68
          const bg = `rgba(${r},${g},${b},0.15)`
          const border = `rgba(${r},${g},${b},0.35)`
          const text = `rgb(${r},${g},${b})`

          return (
            <div
              key={s.sector}
              className="rounded-lg p-3 transition-transform hover:scale-105 cursor-default"
              style={{ background: bg, border: `1px solid ${border}` }}
              title={`${s.tickerCount} tickers · ${s.mentionCount} mentions · ${(s.bullishRatio * 100).toFixed(0)}% bullish`}
            >
              <div
                className="text-xs font-bold truncate"
                style={{ color: text, fontSize: `${Math.max(10, 12 * sizePct)}px` }}
              >
                {s.sector}
              </div>
              <div className="text-xs mt-1 font-mono" style={{ color: text, opacity: 0.8 }}>
                {(s.bullishRatio * 100).toFixed(0)}% bull
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {s.mentionCount.toLocaleString()} mentions
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
