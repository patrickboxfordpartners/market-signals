import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, TrendingDown, Award, Users } from 'lucide-react'
import { formatPercent } from '../lib/utils'

interface Source {
  id: string
  name: string
  platform: string
  source_type: string
  credibility_score: number
  accuracy_rate: number
  total_predictions: number
  correct_predictions: number
  reasoning_quality: number
  transparency_score: number
  verified: boolean
}

export function SourceLeaderboard() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'credibility' | 'accuracy' | 'volume'>('credibility')

  useEffect(() => {
    fetchSources()
  }, [sortBy])

  async function fetchSources() {
    setLoading(true)
    const orderBy =
      sortBy === 'credibility'
        ? 'credibility_score'
        : sortBy === 'accuracy'
        ? 'accuracy_rate'
        : 'total_predictions'

    const { data } = await supabase
      .from('sources')
      .select('*')
      .gt('total_predictions', 0)
      .order(orderBy, { ascending: false })
      .limit(100)

    if (data) {
      setSources(data as Source[])
    }
    setLoading(false)
  }

  const sortOptions = [
    { key: 'credibility' as const, label: 'Credibility' },
    { key: 'accuracy' as const, label: 'Accuracy' },
    { key: 'volume' as const, label: 'Volume' },
  ]

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
          <h1 className="text-2xl font-bold tracking-tight">Source Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ranked by track record and reasoning quality
          </p>
        </div>

        <div className="flex gap-1 bg-accent/50 rounded-md p-0.5 border">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                sortBy === opt.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-30" />
          <h3 className="text-sm font-semibold mb-1">No Sources Yet</h3>
          <p className="text-xs text-muted-foreground">
            Sources appear once predictions are validated
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-accent/30">
                  <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                  <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Platform</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cred</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Accuracy</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Record</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reasoning</th>
                  <th className="text-right py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Transparency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((source, index) => (
                  <tr key={source.id} className="hover:bg-accent/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {index < 3 && (
                          <Award
                            className={`h-3 w-3 ${
                              index === 0
                                ? 'text-yellow-500'
                                : index === 1
                                ? 'text-gray-400'
                                : 'text-amber-600'
                            }`}
                          />
                        )}
                        <span className="text-xs font-mono text-muted-foreground">{index + 1}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{source.name}</span>
                        {source.verified && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">V</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {source.source_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground uppercase tracking-wider">
                        {source.platform}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs font-mono font-medium">
                          {source.credibility_score.toFixed(1)}
                        </span>
                        {source.credibility_score >= 70 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : source.credibility_score < 40 ? (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-xs font-mono">{formatPercent(source.accuracy_rate)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-xs font-mono text-muted-foreground">
                        {source.correct_predictions}/{source.total_predictions}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <MiniBar value={source.reasoning_quality} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <MiniBar value={source.transparency_score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-primary' : 'bg-red-500'

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-12 bg-accent rounded-full h-1">
        <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{pct}%</span>
    </div>
  )
}
