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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Source Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked by track record and reasoning quality
          </p>
        </div>

        <div className="flex gap-1 bg-accent/50 rounded-lg p-1 border shadow-sm">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                sortBy === opt.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-16 text-center">
          <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-base font-bold mb-2">No Sources Yet</h3>
          <p className="text-sm text-muted-foreground">
            Sources appear once predictions are validated
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-accent/40">
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12">#</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Platform</th>
                  <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Cred</th>
                  <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Accuracy</th>
                  <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Record</th>
                  <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Reasoning</th>
                  <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Transparency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((source, index) => (
                  <tr key={source.id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <Award
                            className={`h-4 w-4 ${
                              index === 0
                                ? 'text-yellow-500'
                                : index === 1
                                ? 'text-gray-400'
                                : 'text-amber-600'
                            }`}
                          />
                        )}
                        <span className="text-sm font-mono font-bold text-muted-foreground">{index + 1}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{source.name}</span>
                        {source.verified && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">V</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize font-medium">
                        {source.source_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-muted-foreground uppercase tracking-wider font-semibold">
                        {source.platform}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm font-mono font-bold">
                          {source.credibility_score.toFixed(1)}
                        </span>
                        {source.credibility_score >= 70 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        ) : source.credibility_score < 40 ? (
                          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-mono font-bold">{formatPercent(source.accuracy_rate)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-mono text-muted-foreground font-semibold">
                        {source.correct_predictions}/{source.total_predictions}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <MiniBar value={source.reasoning_quality} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
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
    <div className="flex items-center justify-end gap-2.5">
      <div className="w-16 bg-accent rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  )
}
