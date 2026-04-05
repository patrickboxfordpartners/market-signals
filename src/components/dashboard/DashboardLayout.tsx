import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Target,
  Activity,
  Radio,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { MarketTicker } from './MarketTicker'
import { ErrorBoundary } from '../ErrorBoundary'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Live Signals', href: '/signals', icon: Radio },
  { name: 'Tickers', href: '/tickers', icon: TrendingUp },
  { name: 'Predictions', href: '/predictions', icon: Target },
  { name: 'Sources', href: '/sources', icon: Users },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-card border-r flex flex-col transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-5 border-b">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">MARKET SIGNALS</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Boxford Partners
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md hover:bg-accent lg:hidden"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse-glow" />
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center h-14 px-4 border-b bg-card lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-accent mr-3"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold tracking-tight">MARKET SIGNALS</span>
          </div>
        </div>

        <MarketTicker />
        <main className="p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
