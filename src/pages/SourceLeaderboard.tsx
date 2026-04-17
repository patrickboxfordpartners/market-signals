import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, TrendingDown, Award, Users, Download, Search } from 'lucide-react'
import { formatPercent } from '../lib/utils'
import { downloadCSV, downloadJSON } from '../lib/export'

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
  const [searchTerm, setSearchTerm] = useState('')

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

  const filteredSources = sources.filter(source => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      source.name.toLowerCase().includes(term) ||
      source.platform.toLowerCase().includes(term) ||
      source.source_type.toLowerCase().includes(term)
    )
  })

  function handleExport(format: 'csv' | 'json') {
    if (filteredSources.length === 0) return

    const exportData = filteredSources.map(s => ({
      name: s.name,
      platform: s.platform,
      type: s.source_type,
      credibility: s.credibility_score,
      accuracy: s.accuracy_rate,
      correct: s.correct_predictions,
      total: s.total_predictions,
      reasoning_quality: s.reasoning_quality,
      transparency: s.transparency_score,
      verified: s.verified ? 'Yes' : 'No',
    }))

    if (format === 'csv') {
      downloadCSV(exportData, `sources-${sortBy}-${new Date().toISOString().split('T')[0]}`)
    } else {
      downloadJSON(sources, `sources-${sortBy}-${new Date().toISOString().split('T')[0]}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Source Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked by track record and reasoning quality
          </p>
        </div>

        <div className="flex gap-2">
          {sources.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2.5 border rounded-lg font-semibold text-sm hover:bg-accent active:bg-accent/80 transition-colors shadow-sm">
                <Download className="h-4 w-4" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-xl p-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-3 py-2.5 text-sm hover:bg-accent active:bg-accent/80 rounded-md whitespace-nowrap"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-3 py-2.5 text-sm hover:bg-accent active:bg-accent/80 rounded-md whitespace-nowrap"
                >
                  Download JSON
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-1 bg-accent/50 rounded-lg p-1 border shadow-sm">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 sm:px-4 py-2.5 text-sm font-semibold rounded-md transition-all active:opacity-80 ${
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
      </div>

      {sources.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sources by name, platform, or type..."
              className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {searchTerm && (
            <span className="text-sm text-muted-foreground">
              {filteredSources.length} of {sources.length} sources
            </span>
          )}
        </div>
      )}

      {sources.length === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-16 text-center">
          <Users className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-base font-bold mb-2">No Sources Yet</h3>
          <p className="text-sm text-muted-foreground">
            Sources appear once predictions are validated
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="space-y-3 md:hidden">
            {filteredSources.map((source, index) => (
              <div key={source.id} className="bg-card rounded-lg border shadow-sm p-4 active:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {index < 3 && (
                      <Award
                        className={`h-4 w-4 shrink-0 ${
                          index === 0
                            ? 'text-yellow-500'
                            : index === 1
                            ? 'text-gray-400'
                            : 'text-amber-600'
                        }`}
                      />
                    )}
                    <span className="text-xs font-mono font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="text-sm font-bold">{source.name}</span>
                    {source.verified && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">V</span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-muted-foreground uppercase tracking-wider font-semibold shrink-0">
                    {source.platform}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground capitalize font-medium mb-3">{source.source_type}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Credibility</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono font-bold">{source.credibility_score.toFixed(1)}</span>
                      {source.credibility_score >= 70 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      ) : source.credibility_score < 40 ? (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Accuracy</div>
                    <span className="text-sm font-mono font-bold">{formatPercent(source.accuracy_rate)}</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Record</div>
                    <span className="text-sm font-mono text-muted-foreground font-semibold">
                      {source.correct_predictions}/{source.total_predictions}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Reasoning</div>
                    <MiniBar value={source.reasoning_quality} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-accent/40">
                    <th className="text-left py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12">#</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Source</th>
                    <th className="text-left py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Platform</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Credibility</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Accuracy</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Record</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Reasoning</th>
                    <th className="text-right py-3.5 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Transparency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSources.map((source, index) => (
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
        </>
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
