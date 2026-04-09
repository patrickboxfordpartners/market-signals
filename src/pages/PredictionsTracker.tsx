import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, Clock, Target } from 'lucide-react'
import { formatDateTime } from '../lib/utils'

interface Prediction {
  id: string
  ticker_symbol: string
  source_name: string
  source_credibility: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  price_target: number | null
  confidence_level: 'low' | 'medium' | 'high' | null
  reasoning_quality_score: number | null
  prediction_date: string
  target_date: string | null
  validated: boolean
  was_correct: boolean | null
  accuracy_score: number | null
}

export function PredictionsTracker() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'validated'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPredictions()
  }, [filter])

  async function fetchPredictions() {
    const { data } = await supabase
      .from('predictions')
      .select(
        `
        id,
        sentiment,
        price_target,
        confidence_level,
        reasoning_quality_score,
        prediction_date,
        target_date,
        tickers (symbol),
        sources (name, credibility_score),
        validations (was_correct, accuracy_score)
      `
      )
      .order('prediction_date', { ascending: false })
      .limit(100)

    if (data) {
      const formatted = data.map((p: any) => ({
        id: p.id,
        ticker_symbol: p.tickers?.symbol || 'Unknown',
        source_name: p.sources?.name || 'Unknown',
        source_credibility: p.sources?.credibility_score || 0,
        sentiment: p.sentiment,
        price_target: p.price_target,
        confidence_level: p.confidence_level,
        reasoning_quality_score: p.reasoning_quality_score,
        prediction_date: p.prediction_date,
        target_date: p.target_date,
        validated: !!p.validations,
        was_correct: p.validations?.was_correct || null,
        accuracy_score: p.validations?.accuracy_score || null,
      }))

      const filtered =
        filter === 'pending'
          ? formatted.filter((p) => !p.validated)
          : filter === 'validated'
          ? formatted.filter((p) => p.validated)
          : formatted

      setPredictions(filtered)
    }
    setLoading(false)
  }

  const filterOptions = [
    { key: 'all' as const, label: 'All' },
    { key: 'pending' as const, label: 'Pending' },
    { key: 'validated' as const, label: 'Validated' },
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
          <h1 className="text-3xl font-bold tracking-tight">Predictions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track predictions and validation outcomes
          </p>
        </div>

        <div className="flex gap-1 bg-accent/50 rounded-lg p-1 border shadow-sm">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                filter === opt.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="bg-card rounded-lg border shadow-sm p-16 text-center">
          <Target className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-base font-bold mb-2">No Predictions Yet</h3>
          <p className="text-sm text-muted-foreground">
            Predictions appear once mentions are analyzed by the extraction worker
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {predictions.map((prediction) => {
            const sentimentConfig = {
              bullish: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
              bearish: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
              neutral: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-accent', border: 'border-border' },
            }
            const config = sentimentConfig[prediction.sentiment]
            const Icon = config.icon

            return (
              <div
                key={prediction.id}
                className="bg-card rounded-lg border shadow-sm p-5 card-glow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Left side */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Sentiment icon */}
                    <div className={`p-2 rounded-md ${config.bg} border ${config.border}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold font-mono text-primary">
                          ${prediction.ticker_symbol}
                        </span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                          {prediction.sentiment}
                        </span>
                        {prediction.price_target && (
                          <span className="text-xs font-mono text-muted-foreground">
                            PT ${prediction.price_target}
                          </span>
                        )}
                        {prediction.confidence_level && (
                          <span className={`text-xs px-2 py-0.5 rounded-md border font-semibold ${
                            prediction.confidence_level === 'high'
                              ? 'border-primary/30 text-primary bg-primary/10'
                              : prediction.confidence_level === 'medium'
                              ? 'border-border text-muted-foreground bg-accent/60'
                              : 'border-border text-muted-foreground bg-accent/40'
                          }`}>
                            {prediction.confidence_level}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium">{prediction.source_name}</span>
                        <span className="font-mono">
                          cred {prediction.source_credibility.toFixed(0)}
                        </span>
                        {prediction.reasoning_quality_score !== null && (
                          <span className="font-mono">
                            reasoning {(prediction.reasoning_quality_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side — dates + validation */}
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-mono text-muted-foreground">
                        {formatDateTime(prediction.prediction_date)}
                      </div>
                      {prediction.target_date && (
                        <div className="text-xs font-mono text-muted-foreground mt-0.5">
                          target {formatDateTime(prediction.target_date)}
                        </div>
                      )}
                    </div>

                    {/* Validation badge */}
                    {prediction.validated ? (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-bold ${
                        prediction.was_correct
                          ? 'bg-green-500/10 border-green-500/20 text-green-500'
                          : 'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                        {prediction.was_correct ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        <span className="font-mono">
                          {prediction.accuracy_score !== null
                            ? prediction.accuracy_score.toFixed(0)
                            : prediction.was_correct
                            ? 'OK'
                            : 'X'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-accent/30 text-sm text-muted-foreground font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
