import { useState, useCallback } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, FlaskConical, TrendingUp, TrendingDown, Target, Percent } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatDate } from '../lib/utils'

interface BacktestParams {
  minCredibility: number
  minConfidence: 'low' | 'medium' | 'high'
  lookbackDays: number
}

interface Trade {
  date: string
  symbol: string
  sentiment: string
  entry_price: number
  exit_price: number
  change_pct: number
  was_correct: boolean
  accuracy_score: number
}

interface BacktestResult {
  trades: Trade[]
  equityCurve: { date: string; value: number }[]
  totalReturn: number
  winRate: number
  maxDrawdown: number
  totalTrades: number
  avgReturn: number
}

const CONFIDENCE_ORDER = { low: 0, medium: 1, high: 2 }

export function Backtest() {
  const [params, setParams] = useState<BacktestParams>({
    minCredibility: 60,
    minConfidence: 'medium',
    lookbackDays: 180,
  })
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runBacktest = useCallback(async () => {
    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const since = new Date()
      since.setDate(since.getDate() - params.lookbackDays)

      // Fetch validated predictions that meet threshold
      const { data: validations, error: err } = await supabase
        .from('validations')
        .select(`
          prediction_id,
          price_at_prediction,
          price_at_validation,
          price_change_percent,
          was_correct,
          accuracy_score,
          validation_date,
          predictions!inner(
            sentiment,
            prediction_date,
            confidence_level,
            tickers(symbol),
            sources(credibility_score)
          )
        `)
        .gte('validation_date', since.toISOString())
        .not('price_at_prediction', 'is', null)
        .not('price_at_validation', 'is', null)

      if (err) throw err
      if (!validations || validations.length === 0) {
        setError('No validated predictions found for this period. The backtest needs historical validation data to run.')
        setRunning(false)
        return
      }

      // Filter by parameters
      const filtered = validations.filter((v: any) => {
        const pred = v.predictions
        const credScore = pred?.sources?.credibility_score || 0
        const confLevel = pred?.confidence_level || 'low'
        return (
          credScore >= params.minCredibility &&
          CONFIDENCE_ORDER[confLevel as keyof typeof CONFIDENCE_ORDER] >=
            CONFIDENCE_ORDER[params.minConfidence]
        )
      })

      if (filtered.length === 0) {
        setError('No trades match these parameters. Try lowering the credibility or confidence threshold.')
        setRunning(false)
        return
      }

      // Sort by prediction_date ascending
      filtered.sort((a: any, b: any) =>
        new Date(a.predictions.prediction_date).getTime() - new Date(b.predictions.prediction_date).getTime()
      )

      // Simulate portfolio: start at $10,000, size each trade equally
      const trades: Trade[] = []
      let equity = 10000
      let peak = 10000
      let maxDrawdown = 0
      const equityCurve: { date: string; value: number }[] = [
        { date: since.toISOString().split('T')[0], value: 10000 }
      ]

      for (const v of filtered) {
        const pred = (v as any).predictions
        const changePct = v.price_change_percent || 0
        const sentiment = pred?.sentiment || 'neutral'

        // For bullish predictions: buy. For bearish: short (inverse return)
        const tradeReturn = sentiment === 'bearish' ? -changePct : changePct
        const tradeSize = equity / filtered.length // equal-weight
        const pnl = tradeSize * (tradeReturn / 100)

        equity += pnl
        if (equity > peak) peak = equity
        const dd = (peak - equity) / peak
        if (dd > maxDrawdown) maxDrawdown = dd

        trades.push({
          date: v.validation_date,
          symbol: pred?.tickers?.symbol || 'UNK',
          sentiment,
          entry_price: v.price_at_prediction || 0,
          exit_price: v.price_at_validation || 0,
          change_pct: changePct,
          was_correct: v.was_correct || false,
          accuracy_score: v.accuracy_score || 0,
        })

        equityCurve.push({
          date: new Date(v.validation_date).toISOString().split('T')[0],
          value: Math.round(equity * 100) / 100,
        })
      }

      const wins = trades.filter(t => t.was_correct).length
      const returns = trades.map(t => t.sentiment === 'bearish' ? -t.change_pct : t.change_pct)
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length

      setResult({
        trades,
        equityCurve,
        totalReturn: ((equity - 10000) / 10000) * 100,
        winRate: (wins / trades.length) * 100,
        maxDrawdown: maxDrawdown * 100,
        totalTrades: trades.length,
        avgReturn,
      })
    } catch (e: any) {
      setError(e.message || 'Unknown error')
    }

    setRunning(false)
  }, [params])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backtesting Engine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulate a portfolio built on Street Insights validated predictions
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <h2 className="text-base font-bold mb-4">Simulation Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Min Source Credibility
              <span className="ml-2 font-mono text-primary">{params.minCredibility}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={params.minCredibility}
              onChange={e => setParams(p => ({ ...p, minCredibility: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0 (all)</span>
              <span>100 (elite)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Min Confidence Level</label>
            <select
              value={params.minConfidence}
              onChange={e => setParams(p => ({ ...p, minConfidence: e.target.value as BacktestParams['minConfidence'] }))}
              className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="low">Low+</option>
              <option value="medium">Medium+</option>
              <option value="high">High only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Lookback Period</label>
            <select
              value={params.lookbackDays}
              onChange={e => setParams(p => ({ ...p, lookbackDays: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
        </div>

        <button
          onClick={runBacktest}
          disabled={running}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {running ? (
            <Activity className="h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4" />
          )}
          {running ? 'Running simulation...' : 'Run Backtest'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {result && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              label="Total Return"
              value={`${result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toFixed(2)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              color={result.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}
            />
            <KPICard
              label="Win Rate"
              value={`${result.winRate.toFixed(1)}%`}
              icon={<Target className="h-4 w-4" />}
              color={result.winRate >= 55 ? 'text-green-500' : 'text-muted-foreground'}
            />
            <KPICard
              label="Max Drawdown"
              value={`-${result.maxDrawdown.toFixed(1)}%`}
              icon={<TrendingDown className="h-4 w-4" />}
              color={result.maxDrawdown > 20 ? 'text-red-500' : 'text-yellow-500'}
            />
            <KPICard
              label="Avg Trade Return"
              value={`${result.avgReturn >= 0 ? '+' : ''}${result.avgReturn.toFixed(2)}%`}
              icon={<Percent className="h-4 w-4" />}
              color={result.avgReturn >= 0 ? 'text-green-500' : 'text-red-500'}
            />
          </div>

          {/* Equity curve */}
          <div className="bg-card rounded-lg border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Portfolio Equity Curve</h2>
              <span className="text-xs text-muted-foreground">{result.totalTrades} trades · Starting $10,000</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={result.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={v => `$${v.toLocaleString()}`}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(v: any) => [`$${Number(v ?? 0).toLocaleString()}`, 'Portfolio'] as [string, string]}
                />
                <ReferenceLine y={10000} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={result.totalReturn >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trade log */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-accent/30">
              <h2 className="text-base font-bold">Trade Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-left">Ticker</th>
                    <th className="px-4 py-2.5 text-left">Direction</th>
                    <th className="px-4 py-2.5 text-right">Entry</th>
                    <th className="px-4 py-2.5 text-right">Exit</th>
                    <th className="px-4 py-2.5 text-right">Return</th>
                    <th className="px-4 py-2.5 text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.trades.slice(0, 50).map((trade, i) => (
                    <tr key={i} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                        {formatDate(trade.date)}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-primary text-xs">
                        ${trade.symbol}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold ${
                          trade.sentiment === 'bullish' ? 'text-green-500' :
                          trade.sentiment === 'bearish' ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {trade.sentiment}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        ${trade.entry_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        ${trade.exit_price.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${
                        trade.change_pct >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.change_pct >= 0 ? '+' : ''}{trade.change_pct.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-semibold ${
                          trade.was_correct ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {trade.was_correct ? 'WIN' : 'LOSS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.trades.length > 50 && (
                <p className="px-4 py-3 text-xs text-muted-foreground text-center border-t">
                  Showing 50 of {result.trades.length} trades
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KPICard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-card rounded-lg border shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="text-muted-foreground opacity-60">{icon}</div>
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}
