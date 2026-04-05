import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Target,
  Activity
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { MarketTicker } from './MarketTicker'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Sources', href: '/sources', icon: Users },
  { name: 'Tickers', href: '/tickers', icon: TrendingUp },
  { name: 'Predictions', href: '/predictions', icon: Target },
  { name: 'Live Signals', href: '/signals', icon: Activity },
]

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-xl">
        {/* Logo */}
        <div className="relative h-16 overflow-hidden border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 opacity-90" />
          <div className="relative flex h-full items-center px-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Market Signals</h1>
                <p className="text-[10px] text-white/80 font-medium">
                  Credibility-Weighted Analysis
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-4 bg-gradient-to-br from-muted/30 to-muted/10">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Activity className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold">Market Signals</span>
            </div>
            <div className="text-[10px] opacity-70 pl-8">
              Boxford Partners © 2026
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <MarketTicker />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
