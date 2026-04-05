import { useEffect, useState } from 'react'
import { Clock, Zap, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '../../lib/utils'

interface SystemStatusProps {
  lastScanTime?: string
}

export function SystemStatus({ lastScanTime }: SystemStatusProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const getNextScanTime = () => {
    const now = new Date()
    const minutes = now.getMinutes()
    const nextQuarter = Math.ceil((minutes + 1) / 15) * 15
    const nextScan = new Date(now)
    nextScan.setMinutes(nextQuarter, 0, 0)

    const diff = Math.floor((nextScan.getTime() - now.getTime()) / 1000)
    const mins = Math.floor(diff / 60)
    const secs = diff % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const apis = [
    { name: 'Supabase', key: 'VITE_SUPABASE_URL', required: true },
    { name: 'NewsAPI', key: 'NEWS_API_KEY', required: false },
    { name: 'Grok AI', key: 'XAI_API_KEY', required: false },
    { name: 'Alpha Vantage', key: 'ALPHA_VANTAGE_API_KEY', required: false },
  ]

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-sm font-semibold">System Status</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Worker + Timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse-glow" />
            <span className="text-xs font-medium">Worker Active</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Next scan</div>
            <div className="text-sm font-mono font-bold text-primary">{getNextScanTime()}</div>
          </div>
        </div>

        {/* Last Scan */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last scan</span>
          </div>
          <span className="font-mono text-muted-foreground">
            {lastScanTime ? formatDateTime(lastScanTime) : '--:--'}
          </span>
        </div>

        {/* API Grid */}
        <div className="border-t pt-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            API Health
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {apis.map((api) => (
              <div
                key={api.name}
                className="flex items-center justify-between px-2.5 py-1.5 rounded bg-accent/50 border border-border/50"
              >
                <span className="text-[10px] font-medium">{api.name}</span>
                {api.required ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-primary/60" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
