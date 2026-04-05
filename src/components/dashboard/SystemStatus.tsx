import { useEffect, useState } from 'react'
import { Clock, Zap, CheckCircle } from 'lucide-react'
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
    return `${mins}m ${secs}s`
  }

  const apiStatus = [
    { name: 'Supabase', status: 'operational', color: 'text-green-500' },
    { name: 'NewsAPI', status: 'operational', color: 'text-green-500' },
    { name: 'XAI Grok', status: 'operational', color: 'text-green-500' },
    { name: 'Alpha Vantage', status: 'operational', color: 'text-green-500' },
  ]

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">System Status</h2>
            <p className="text-xs text-muted-foreground">Workers and API health</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Worker Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 opacity-30 animate-ping" />
            </div>
            <div>
              <div className="text-sm font-medium">Worker Status</div>
              <div className="text-xs text-muted-foreground">Running</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Next scan in</div>
            <div className="text-sm font-mono font-medium">{getNextScanTime()}</div>
          </div>
        </div>

        {/* Last Scan */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Last Scan</div>
              <div className="text-xs text-muted-foreground">
                {lastScanTime ? formatDateTime(lastScanTime) : 'No scans yet'}
              </div>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div>
          <div className="text-sm font-medium mb-3">API Health</div>
          <div className="grid grid-cols-2 gap-3">
            {apiStatus.map((api) => (
              <div
                key={api.name}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
              >
                <span className="text-xs font-medium">{api.name}</span>
                <CheckCircle className={`h-4 w-4 ${api.color}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
