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
}

export function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTimeline()

    const subscription = supabase
      .channel('timeline-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => fetchTimeline())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mention_frequency' }, () => fetchTimeline())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validations' }, () => fetchTimeline())
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchTimeline() {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const [{ data: spikes }, { data: predictions }, { data: validations }] = await Promise.all([
      supabase
        .from('mention_frequency')
        .select('date, mention_count, tickers (symbol)')
        .eq('spike_detected', true)
        .gte('date', twentyFourHoursAgo.toISOString())
        .order('date', { ascending: false })
        .limit(10),
      supabase
        .from('predictions')
        .select('id, prediction_date, sentiment, tickers (symbol), sources (name)')
        .gte('prediction_date', twentyFourHoursAgo.toISOString())
        .order('prediction_date', { ascending: false })
        .limit(10),
      supabase
        .from('validations')
        .select('validation_date, was_correct, predictions ( tickers (symbol) )')
        .gte('validation_date', twentyFourHoursAgo.toISOString())
        .order('validation_date', { ascending: false })
        .limit(10),
    ])

    const timelineEvents: TimelineEvent[] = []

    if (spikes) {
      spikes.forEach((spike: any) => {
        if (spike.tickers?.symbol) {
          timelineEvents.push({
            id: `spike-${spike.date}`,
            type: 'spike',
            ticker_symbol: spike.tickers.symbol,
            description: `Spike: ${spike.mention_count} mentions`,
            timestamp: spike.date,
          })
        }
      })
    }

    if (predictions) {
      predictions.forEach((pred: any) => {
        if (pred.tickers?.symbol) {
          timelineEvents.push({
            id: `pred-${pred.id}`,
            type: 'prediction',
            ticker_symbol: pred.tickers.symbol,
            description: `${pred.sentiment} call by ${pred.sources?.name || 'Unknown'}`,
            timestamp: pred.prediction_date,
          })
        }
      })
    }

    if (validations) {
      validations.forEach((val: any) => {
        if (val.predictions?.tickers?.symbol) {
          timelineEvents.push({
            id: `val-${val.validation_date}`,
            type: 'validation',
            ticker_symbol: val.predictions.tickers.symbol,
            description: val.was_correct ? 'Prediction correct' : 'Prediction incorrect',
            timestamp: val.validation_date,
          })
        }
      })
    }

    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setEvents(timelineEvents.slice(0, 10))
    setLoading(false)
  }

  const typeConfig = {
    spike: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    prediction: { icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    validation: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-sm font-semibold">Activity</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">24h</span>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
            <p className="text-xs">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => {
              const config = typeConfig[event.type]
              const Icon = config.icon
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/30 transition-colors"
                >
                  <div className={`p-1 rounded ${config.bg}`}>
                    <Icon className={`h-3 w-3 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-primary">
                        ${event.ticker_symbol}
                      </span>
                      <span className="text-xs text-foreground/80 truncate">
                        {event.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
