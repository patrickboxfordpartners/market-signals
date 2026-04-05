import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, TrendingDown, Award } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Source Leaderboard</h1>
          <p className="text-muted-foreground mt-1">
            Ranked by credibility score and track record
          </p>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('credibility')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              sortBy === 'credibility'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-card border hover:bg-accent hover:shadow'
            }`}
          >
            Credibility
          </button>
          <button
            onClick={() => setSortBy('accuracy')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              sortBy === 'accuracy'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-card border hover:bg-accent hover:shadow'
            }`}
          >
            Accuracy
          </button>
          <button
            onClick={() => setSortBy('volume')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              sortBy === 'volume'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-card border hover:bg-accent hover:shadow'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border p-12 text-center">
          <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
            <Award className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Sources Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Sources will appear once predictions are validated
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-muted/50 to-muted/30">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Source</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Platform</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Credibility</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Accuracy</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Predictions</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Reasoning</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Transparency</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sources.map((source, index) => (
                <tr key={source.id} className="hover:bg-accent/30 transition-all duration-200">
                  <td className="py-3 px-4">
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
                      <span className="text-sm font-medium">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{source.name}</span>
                      {source.verified && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {source.source_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm capitalize">{source.platform}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm font-medium">
                        {source.credibility_score.toFixed(1)}
                      </span>
                      {source.credibility_score >= 70 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : source.credibility_score >= 50 ? (
                        <Activity className="h-3 w-3 text-yellow-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm">{formatPercent(source.accuracy_rate)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm">
                      {source.correct_predictions}/{source.total_predictions}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end">
                      <div className="w-16 bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${source.reasoning_quality * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end">
                      <div className="w-16 bg-muted rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${source.transparency_score * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
