import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import {
  Activity,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { formatNumber, formatDateTime, formatDate } from '../lib/utils'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

interface TickerInfo {
  id: string
  symbol: string
  company_name: string | null
  sector: string | null
  avg_daily_mentions: number
  mention_spike_threshold: number
}

interface MentionFrequency {
  date: string
  mention_count: number
  spike_detected: boolean
}

interface Prediction {
  id: string
  sentiment: string
  source_name: string
  prediction_date: string
  validated: boolean
  was_correct: boolean | null
}

interface Mention {
  id: string
  content: string
  platform: string
  source_name: string
  mentioned_at: string
  engagement_score: number
}

export function TickerDetail() {
  const { symbol } = useParams<{ symbol: string }>()
  const [ticker, setTicker] = useState<TickerInfo | null>(null)
  const [frequency, setFrequency] = useState<MentionFrequency[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [mentions, setMentions] = useState<Mention[]>([])
  const [sentimentBreakdown, setSentimentBreakdown] = useState({ bullish: 0, bearish: 0, neutral: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (symbol) fetchAll(symbol)
  }, [symbol])

  async function fetchAll(sym: string) {
    // Fetch ticker
    const { data: tickerData } = await supabase
      .from('tickers')
      .select('id, symbol, company_name, sector, avg_daily_mentions, mention_spike_threshold')
      .eq('symbol', sym)
      .single()

    if (!tickerData) {
      setLoading(false)
      return
    }

    setTicker(tickerData)

    // Fetch frequency data (30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      { data: freqData },
      { data: predData },
      { data: mentionData },
    ] = await Promise.all([
      supabase
        .from('mention_frequency')
        .select('date, mention_count, spike_detected')
        .eq('ticker_id', tickerData.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true }),
      supabase
        .from('predictions')
        .select('id, sentiment, prediction_date, sources (name), validations (was_correct)')
        .eq('ticker_id', tickerData.id)
        .order('prediction_date', { ascending: false })
        .limit(20),
      supabase
        .from('mentions')
        .select('id, content, platform, mentioned_at, engagement_score, sources (name)')
        .eq('ticker_id', tickerData.id)
        .order('mentioned_at', { ascending: false })
        .limit(20),
    ])

    setFrequency(freqData || [])

    if (predData) {
      setPredictions(
        predData.map((p: any) => ({
          id: p.id,
          sentiment: p.sentiment,
          source_name: p.sources?.name || 'Unknown',
          prediction_date: p.prediction_date,
          validated: !!p.validations,
          was_correct: p.validations?.was_correct ?? null,
        }))
      )

      // Sentiment breakdown
      const breakdown = { bullish: 0, bearish: 0, neutral: 0 }
      predData.forEach((p: any) => {
        if (p.sentiment === 'bullish') breakdown.bullish++
        else if (p.sentiment === 'bearish') breakdown.bearish++
        else breakdown.neutral++
      })
      setSentimentBreakdown(breakdown)
    }

    if (mentionData) {
      setMentions(
        mentionData.map((m: any) => ({
          id: m.id,
          content: m.content,
          platform: m.platform,
          source_name: m.sources?.name || 'Unknown',
          mentioned_at: m.mentioned_at,
          engagement_score: m.engagement_score,
        }))
      )
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

  if (!ticker) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Ticker not found</p>
        <Link to="/tickers" className="text-xs text-primary hover:underline mt-2 inline-block">
          Back to Tickers
        </Link>
      </div>
    )
  }

  const totalPredictions = sentimentBreakdown.bullish + sentimentBreakdown.bearish + sentimentBreakdown.neutral
  const sentimentBars = [
    { label: 'Bull', value: sentimentBreakdown.bullish, color: '#22c55e' },
    { label: 'Neutral', value: sentimentBreakdown.neutral, color: '#6b7280' },
    { label: 'Bear', value: sentimentBreakdown.bearish, color: '#ef4444' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/tickers"
          className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono tracking-tight">${ticker.symbol}</h1>
            {ticker.sector && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-accent text-muted-foreground uppercase tracking-wider font-semibold">
                {ticker.sector}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{ticker.company_name}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Avg/Day" value={String(ticker.avg_daily_mentions)} />
        <MiniStat label="Spike Threshold" value={String(ticker.mention_spike_threshold)} />
        <MiniStat label="Predictions" value={String(totalPredictions)} />
        <MiniStat label="Mentions" value={formatNumber(mentions.length)} sub="recent 20" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Mention frequency chart */}
        <div className="lg:col-span-2 bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-accent/30">
            <h2 className="text-base font-bold">Mention Volume</h2>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <div className="p-5">
            {frequency.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={frequency}>
                  <defs>
                    <linearGradient id="mentionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(215 15% 55%)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(220 25% 14%)' }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(215 15% 55%)' }}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(220 40% 9%)',
                      border: '1px solid hsl(220 25% 20%)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'hsl(210 20% 92%)',
                      padding: '8px 12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                    labelFormatter={(d) => formatDate(d)}
                    formatter={(value: any) => [
                      <span className="font-mono font-bold">{value}</span>,
                      <span className="text-muted-foreground ml-1">mentions</span>
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="mention_count"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2.5}
                    fill="url(#mentionGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground grid-pattern rounded">
                No frequency data yet
              </div>
            )}
          </div>
        </div>

        {/* Sentiment breakdown */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-accent/30">
            <h2 className="text-base font-bold">Sentiment</h2>
            <p className="text-xs text-muted-foreground">Prediction breakdown</p>
          </div>
          <div className="p-5">
            {totalPredictions > 0 ? (
              <div className="space-y-5">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={sentimentBars} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'hsl(215 15% 55%)', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                      {sentimentBars.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 text-sm bg-accent/30 py-2.5 rounded-md">
                  <span className="text-green-500 font-mono font-bold">{sentimentBreakdown.bullish} bull</span>
                  <span className="text-muted-foreground font-mono font-bold">{sentimentBreakdown.neutral} neutral</span>
                  <span className="text-red-500 font-mono font-bold">{sentimentBreakdown.bearish} bear</span>
                </div>
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                No predictions yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Predictions + Mentions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent predictions */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-accent/30">
            <h2 className="text-base font-bold">Recent Predictions</h2>
          </div>
          <div className="divide-y divide-border">
            {predictions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No predictions yet
              </div>
            ) : (
              predictions.slice(0, 10).map((pred) => (
                <div key={pred.id} className="px-5 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {pred.sentiment === 'bullish' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {pred.sentiment === 'bearish' && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {pred.sentiment === 'neutral' && <Minus className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{pred.source_name}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatDateTime(pred.prediction_date)}
                      </span>
                    </div>
                  </div>
                  {pred.validated ? (
                    pred.was_correct ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent mentions */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-accent/30">
            <h2 className="text-base font-bold">Recent Mentions</h2>
          </div>
          <div className="divide-y divide-border">
            {mentions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No mentions yet
              </div>
            ) : (
              mentions.slice(0, 10).map((mention) => (
                <div key={mention.id} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-muted-foreground uppercase tracking-wider font-semibold">
                      {mention.platform}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{mention.source_name}</span>
                    {mention.engagement_score > 0 && (
                      <span className="text-xs font-mono text-muted-foreground">
                        eng {mention.engagement_score}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">{mention.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-2xl font-bold font-mono mt-1.5">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}
