import { useEffect, useState } from 'react'
import { AlertTriangle, Target, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { formatDateTime } from '../../lib/utils'

interface TimelineEvent {
  id: string
  type: 'spike' | 'prediction' | 'validation'
  ticker_symbol: string
  description: string
  timestamp: string
  metadata?: any
}

export function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTimeline()

    // Real-time subscription for new events
    const subscription = supabase
      .channel('timeline-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        () => {
          fetchTimeline()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mention_frequency' },
        () => {
          fetchTimeline()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'validations' },
        () => {
          fetchTimeline()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchTimeline() {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    // Fetch recent spikes
    const { data: spikes } = await supabase
      .from('mention_frequency')
      .select(
        `
        date,
        mention_count,
        tickers (symbol)
      `
      )
      .eq('spike_detected', true)
      .gte('date', twentyFourHoursAgo.toISOString())
      .order('date', { ascending: false })
      .limit(10)

    // Fetch recent predictions
    const { data: predictions } = await supabase
      .from('predictions')
      .select(
        `
        id,
        prediction_date,
        sentiment,
        tickers (symbol),
        sources (name)
      `
      )
      .gte('prediction_date', twentyFourHoursAgo.toISOString())
      .order('prediction_date', { ascending: false })
      .limit(10)

    // Fetch recent validations
    const { data: validations } = await supabase
      .from('validations')
      .select(
        `
        validation_date,
        was_correct,
        predictions (
          tickers (symbol)
        )
      `
      )
      .gte('validation_date', twentyFourHoursAgo.toISOString())
      .order('validation_date', { ascending: false })
      .limit(10)

    const timelineEvents: TimelineEvent[] = []

    // Add spikes
    if (spikes) {
      spikes.forEach((spike: any) => {
        if (spike.tickers?.symbol) {
          timelineEvents.push({
            id: `spike-${spike.date}`,
            type: 'spike',
            ticker_symbol: spike.tickers.symbol,
            description: `Spike detected: ${spike.mention_count} mentions`,
            timestamp: spike.date,
            metadata: { count: spike.mention_count },
          })
        }
      })
    }

    // Add predictions
    if (predictions) {
      predictions.forEach((pred: any) => {
        if (pred.tickers?.symbol) {
          timelineEvents.push({
            id: `pred-${pred.id}`,
            type: 'prediction',
            ticker_symbol: pred.tickers.symbol,
            description: `${pred.sentiment.toUpperCase()} prediction by ${pred.sources?.name || 'Unknown'}`,
            timestamp: pred.prediction_date,
            metadata: { sentiment: pred.sentiment },
          })
        }
      })
    }

    // Add validations
    if (validations) {
      validations.forEach((val: any) => {
        if (val.predictions?.tickers?.symbol) {
          timelineEvents.push({
            id: `val-${val.validation_date}`,
            type: 'validation',
            ticker_symbol: val.predictions.tickers.symbol,
            description: `Prediction ${val.was_correct ? 'CORRECT' : 'INCORRECT'}`,
            timestamp: val.validation_date,
            metadata: { was_correct: val.was_correct },
          })
        }
      })
    }

    // Sort by timestamp descending
    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setEvents(timelineEvents.slice(0, 15))
    setLoading(false)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'spike':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'prediction':
        return <Target className="h-4 w-4 text-blue-500" />
      case 'validation':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Activity Timeline</h2>
            <p className="text-xs text-muted-foreground">Recent events (24h)</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="relative flex gap-4 group">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm">
                    {getEventIcon(event.type)}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0 rounded-lg border bg-muted/30 p-3 group-hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            ${event.ticker_symbol}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              event.type === 'spike'
                                ? 'bg-red-100 text-red-800'
                                : event.type === 'prediction'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {event.type}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{event.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
