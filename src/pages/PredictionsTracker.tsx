import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, TrendingDown, Minus, CheckCircle, Clock } from 'lucide-react'
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
  data_discipline_score: number | null
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
    let query = supabase
      .from('predictions')
      .select(
        `
        id,
        sentiment,
        price_target,
        confidence_level,
        reasoning_quality_score,
        data_discipline_score,
        prediction_date,
        target_date,
        tickers (symbol),
        sources (name, credibility_score),
        validations (was_correct, accuracy_score)
      `
      )
      .order('prediction_date', { ascending: false })
      .limit(100)

    const { data } = await query

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
        data_discipline_score: p.data_discipline_score,
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
          <h1 className="text-3xl font-bold">Predictions Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Monitor predictions and validation outcomes
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              filter === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-card border hover:bg-accent hover:shadow'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              filter === 'pending'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-card border hover:bg-accent hover:shadow'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('validated')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              filter === 'validated'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-card border hover:bg-accent hover:shadow'
            }`}
          >
            Validated
          </button>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl border p-12 text-center">
          <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
            <Clock className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Predictions Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Predictions will appear once mentions are analyzed by the extraction worker
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {predictions.map((prediction) => (
            <div
              key={prediction.id}
              className="bg-card rounded-xl border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left Side */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      ${prediction.ticker_symbol}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        prediction.sentiment === 'bullish'
                          ? 'bg-green-100 text-green-800'
                          : prediction.sentiment === 'bearish'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {prediction.sentiment === 'bullish' && <TrendingUp className="h-3 w-3" />}
                      {prediction.sentiment === 'bearish' && <TrendingDown className="h-3 w-3" />}
                      {prediction.sentiment === 'neutral' && <Minus className="h-3 w-3" />}
                      {prediction.sentiment}
                    </span>
                    {prediction.price_target && (
                      <span className="text-xs text-muted-foreground">
                        Target: ${prediction.price_target}
                      </span>
                    )}
                    {prediction.confidence_level && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          prediction.confidence_level === 'high'
                            ? 'bg-blue-100 text-blue-800'
                            : prediction.confidence_level === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {prediction.confidence_level} confidence
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{prediction.source_name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      Credibility: {prediction.source_credibility.toFixed(1)}
                    </span>
                    {prediction.reasoning_quality_score !== null && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          Reasoning: {(prediction.reasoning_quality_score * 100).toFixed(0)}%
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Made {formatDateTime(prediction.prediction_date)}
                    {prediction.target_date && ` • Target: ${formatDateTime(prediction.target_date)}`}
                  </div>
                </div>

                {/* Right Side - Validation Status */}
                <div className="text-right">
                  {prediction.validated ? (
                    <div>
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                          prediction.was_correct
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <CheckCircle className="h-3 w-3" />
                        {prediction.was_correct ? 'Correct' : 'Incorrect'}
                      </div>
                      {prediction.accuracy_score !== null && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Score: {prediction.accuracy_score.toFixed(1)}/100
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3" />
                      Pending
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
