import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { Activity, TrendingUp, AlertTriangle, Plus, X, Edit2, Trash2, Upload, Search, Layers, ArrowUpDown, Star } from 'lucide-react'
import { formatNumber, formatDate } from '../lib/utils'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useWatchlist } from '../hooks/useWatchlist'

interface TickerStat {
  id: string
  symbol: string
  company_name: string | null
  sector: string | null
  mention_count: number
  spike_detected: boolean
  avg_daily_mentions: number
  is_active: boolean
  last_mention_date: string | null
  sparkline: { date: string; count: number }[]
}

export function TickerAnalysis() {
  const [tickers, setTickers] = useState<TickerStat[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingTicker, setAddingTicker] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newSector, setNewSector] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTicker, setEditingTicker] = useState<TickerStat | null>(null)
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editSector, setEditSector] = useState('')
  const [updatingTicker, setUpdatingTicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [tickerToDelete, setTickerToDelete] = useState<TickerStat | null>(null)
  const [deletingTicker, setDeletingTicker] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkSymbols, setBulkSymbols] = useState('')
  const [importingBulk, setImportingBulk] = useState(false)
  const { watchlist, toggle: toggleWatchlist } = useWatchlist()
  const [searchQuery, setSearchQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'mentions' | 'velocity' | 'symbol'>('mentions')

  useEffect(() => {
    fetchTickers()
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false)
        else if (showEditModal) setShowEditModal(false)
        else if (showBulkImport) setShowBulkImport(false)
        else if (showAddModal) setShowAddModal(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showAddModal, showEditModal, showDeleteConfirm, showBulkImport])

  async function addTicker() {
    if (!newSymbol.trim()) return

    setAddingTicker(true)
    const symbol = newSymbol.trim().toUpperCase()

    const { error } = await supabase.from('tickers').insert({
      symbol,
      company_name: newCompanyName.trim() || null,
      sector: newSector.trim() || null,
      is_active: true,
      avg_daily_mentions: 0,
      mention_spike_threshold: 10,
    })

    if (error) {
      alert(`Error adding ticker: ${error.message}`)
    } else {
      setNewSymbol('')
      setNewCompanyName('')
      setNewSector('')
      setShowAddModal(false)
      fetchTickers()
    }
    setAddingTicker(false)
  }

  function openEditModal(ticker: TickerStat, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditingTicker(ticker)
    setEditCompanyName(ticker.company_name || '')
    setEditSector(ticker.sector || '')
    setShowEditModal(true)
  }

  async function updateTicker() {
    if (!editingTicker) return

    setUpdatingTicker(true)
    const { error } = await supabase
      .from('tickers')
      .update({
        company_name: editCompanyName.trim() || null,
        sector: editSector.trim() || null,
      })
      .eq('id', editingTicker.id)

    if (error) {
      alert(`Error updating ticker: ${error.message}`)
    } else {
      setShowEditModal(false)
      setEditingTicker(null)
      fetchTickers()
    }
    setUpdatingTicker(false)
  }

  function openDeleteConfirm(ticker: TickerStat, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setTickerToDelete(ticker)
    setShowDeleteConfirm(true)
  }

  async function deleteTicker() {
    if (!tickerToDelete) return

    setDeletingTicker(true)
    const { error } = await supabase
      .from('tickers')
      .update({ is_active: false })
      .eq('id', tickerToDelete.id)

    if (error) {
      alert(`Error deleting ticker: ${error.message}`)
    } else {
      setShowDeleteConfirm(false)
      setTickerToDelete(null)
      fetchTickers()
    }
    setDeletingTicker(false)
  }

  async function bulkImportTickers() {
    if (!bulkSymbols.trim()) return

    setImportingBulk(true)

    // Parse symbols - split by comma, newline, or space
    const symbols = bulkSymbols
      .split(/[,\n\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0 && s.length <= 5) // Basic validation
      .filter((v, i, arr) => arr.indexOf(v) === i) // Remove duplicates

    if (symbols.length === 0) {
      alert('No valid symbols found')
      setImportingBulk(false)
      return
    }

    // Check which symbols already exist
    const { data: existing } = await supabase
      .from('tickers')
      .select('symbol')
      .in('symbol', symbols)

    const existingSymbols = new Set((existing || []).map(t => t.symbol))
    const newSymbols = symbols.filter(s => !existingSymbols.has(s))

    if (newSymbols.length === 0) {
      alert('All symbols already exist in the database')
      setImportingBulk(false)
      return
    }

    // Insert new tickers
    const { error } = await supabase.from('tickers').insert(
      newSymbols.map(symbol => ({
        symbol,
        is_active: true,
        avg_daily_mentions: 0,
        mention_spike_threshold: 10,
      }))
    )

    if (error) {
      alert(`Error importing tickers: ${error.message}`)
    } else {
      const skipped = symbols.length - newSymbols.length
      alert(
        `Successfully imported ${newSymbols.length} ticker${newSymbols.length !== 1 ? 's' : ''}` +
        (skipped > 0 ? `\n${skipped} skipped (already exist)` : '')
      )
      setBulkSymbols('')
      setShowBulkImport(false)
      fetchTickers()
    }
    setImportingBulk(false)
  }

  async function fetchTickers() {
    const { data } = await supabase
      .from('tickers')
      .select('id, symbol, company_name, sector, avg_daily_mentions, is_active')
      .eq('is_active', true)
      .order('symbol')

    if (data) {
      // Fetch sparkline data for all tickers (last 14 days)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      const { data: frequencyData } = await supabase
        .from('mention_frequency')
        .select('ticker_id, date, mention_count, spike_detected')
        .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true })

      const frequencyMap = new Map<string, { date: string; count: number }[]>()
      const spikeMap = new Map<string, boolean>()

      if (frequencyData) {
        for (const row of frequencyData) {
          if (!frequencyMap.has(row.ticker_id)) {
            frequencyMap.set(row.ticker_id, [])
          }
          frequencyMap.get(row.ticker_id)!.push({
            date: row.date,
            count: row.mention_count,
          })
          if (row.spike_detected) {
            spikeMap.set(row.ticker_id, true)
          }
        }
      }

      const tickerStats = await Promise.all(
        data.map(async (ticker) => {
          const { count } = await supabase
            .from('mentions')
            .select('*', { count: 'exact', head: true })
            .eq('ticker_id', ticker.id)

          const { data: lastMention } = await supabase
            .from('mentions')
            .select('mentioned_at')
            .eq('ticker_id', ticker.id)
            .order('mentioned_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...ticker,
            mention_count: count || 0,
            spike_detected: spikeMap.has(ticker.id),
            last_mention_date: lastMention?.mentioned_at || null,
            sparkline: frequencyMap.get(ticker.id) || [],
          }
        })
      )

      setTickers(tickerStats.sort((a, b) => b.mention_count - a.mention_count))
    }
    setLoading(false)
  }

  const sectors = useMemo(() => {
    const s = new Set(tickers.map(t => t.sector).filter(Boolean) as string[])
    return ['all', ...Array.from(s).sort()]
  }, [tickers])

  const filteredTickers = useMemo(() => {
    let result = tickers.filter(t => {
      const matchesSearch = !searchQuery ||
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.company_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSector = sectorFilter === 'all' || t.sector === sectorFilter
      return matchesSearch && matchesSector
    })
    if (sortBy === 'symbol') {
      result = [...result].sort((a, b) => a.symbol.localeCompare(b.symbol))
    } else if (sortBy === 'velocity') {
      result = [...result].sort((a, b) => {
        const aVel = a.sparkline.length >= 2 ? a.sparkline[a.sparkline.length - 1].count - a.sparkline[a.sparkline.length - 2].count : 0
        const bVel = b.sparkline.length >= 2 ? b.sparkline[b.sparkline.length - 1].count - b.sparkline[b.sparkline.length - 2].count : 0
        return bVel - aVel
      })
    }
    // default: mentions (already sorted by fetchTickers)
    return result
  }, [tickers, searchQuery, sectorFilter, sortBy])

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
          <h1 className="text-3xl font-bold tracking-tight">Tickers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mention frequency and spike detection — {filteredTickers.length} of {tickers.length} tracked
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg font-semibold text-sm hover:bg-accent transition-colors shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Ticker
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {sectors.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Sectors' : s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'mentions' | 'velocity' | 'symbol')}
            className="px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="mentions">Sort: Total Mentions</option>
            <option value="velocity">Sort: Recent Velocity</option>
            <option value="symbol">Sort: Symbol A–Z</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main list */}
        <div className="lg:col-span-2 space-y-3">
          {filteredTickers.map((ticker) => (
            <div key={ticker.id} className="relative group">
              <Link
                to={`/tickers/${ticker.symbol}`}
                className="block bg-card rounded-lg border shadow-sm p-5 card-glow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="w-28">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono">${ticker.symbol}</span>
                        {ticker.spike_detected && (
                          <span className="flex items-center gap-0.5 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="h-3 w-3" />
                            SPIKE
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">
                        {ticker.company_name}
                      </span>
                    </div>

                    {/* Sparkline */}
                    <div className="w-24 h-8 hidden sm:block">
                      {ticker.sparkline.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ticker.sparkline}>
                            <defs>
                              <linearGradient id={`spark-${ticker.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke="hsl(38 92% 50%)"
                              strokeWidth={1.5}
                              fill={`url(#spark-${ticker.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-px w-full bg-border" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-right">
                    <div>
                      <div className="text-2xl font-bold font-mono">{formatNumber(ticker.mention_count)}</div>
                      <span className="text-xs text-muted-foreground">total</span>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-base font-mono text-muted-foreground font-semibold">{ticker.avg_daily_mentions}/d</div>
                      <span className="text-xs text-muted-foreground">avg</span>
                    </div>
                    {ticker.last_mention_date && (
                      <div className="hidden md:block">
                        <div className="text-xs font-mono text-muted-foreground">
                          {formatDate(ticker.last_mention_date)}
                        </div>
                        <span className="text-xs text-muted-foreground">last seen</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatchlist(ticker.id) }}
                  className={`p-2.5 rounded-md bg-card border transition-colors ${watchlist.has(ticker.id) ? 'text-yellow-500 hover:bg-yellow-500/10' : 'hover:bg-accent active:bg-accent/80'}`}
                  title={watchlist.has(ticker.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <Star className={`h-4 w-4 ${watchlist.has(ticker.id) ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={(e) => openEditModal(ticker, e)}
                  className="p-2.5 rounded-md bg-card border hover:bg-accent active:bg-accent/80 transition-colors"
                  title="Edit ticker"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => openDeleteConfirm(ticker, e)}
                  className="p-2.5 rounded-md bg-card border hover:bg-red-500/10 hover:text-red-500 active:bg-red-500/20 transition-colors"
                  title="Delete ticker"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredTickers.length === 0 && (
            <div className="bg-card rounded-lg border shadow-sm p-16 text-center">
              <TrendingUp className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-base font-bold mb-2">No Tickers</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first ticker to start tracking mentions
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Ticker
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b bg-accent/30 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold">Most Active</h3>
            </div>
            <div className="p-4 space-y-2">
              {tickers.slice(0, 5).map((ticker, index) => (
                <div key={ticker.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-accent/40 transition-colors border border-transparent hover:border-border/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground font-mono w-4 font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold font-mono">${ticker.symbol}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground font-semibold">
                    {formatNumber(ticker.mention_count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b bg-accent/30 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold">Active Spikes</h3>
            </div>
            <div className="p-4">
              {tickers.filter((t) => t.spike_detected).length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No spikes detected</p>
              ) : (
                <div className="space-y-2">
                  {tickers
                    .filter((t) => t.spike_detected)
                    .slice(0, 5)
                    .map((ticker) => (
                      <div key={ticker.id} className="flex items-center justify-between p-2.5 rounded-md bg-red-500/5 border border-red-500/20">
                        <span className="text-sm font-bold font-mono">${ticker.symbol}</span>
                        <span className="text-xs font-bold text-red-500">ACTIVE</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Ticker Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Ticker</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                addTicker()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Symbol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="NVDA"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Company Name <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="NVIDIA Corporation"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Sector <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  placeholder="Technology"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg font-semibold text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSymbol.trim() || addingTicker}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingTicker ? 'Adding...' : 'Add Ticker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ticker Modal */}
      {showEditModal && editingTicker && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit Ticker</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateTicker()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-muted-foreground">
                  Symbol
                </label>
                <div className="w-full px-3 py-2 bg-accent border rounded-lg text-sm font-mono font-bold">
                  {editingTicker.symbol}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="NVIDIA Corporation"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Sector
                </label>
                <input
                  type="text"
                  value={editSector}
                  onChange={(e) => setEditSector(e.target.value)}
                  placeholder="Technology"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg font-semibold text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTicker}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingTicker ? 'Updating...' : 'Update Ticker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && tickerToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}
        >
          <div className="bg-card rounded-lg border shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-500">Delete Ticker</h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <span className="font-mono font-bold text-foreground">{tickerToDelete.symbol}</span>?
              This will deactivate the ticker and stop tracking mentions. This action can be reversed later.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border rounded-lg font-semibold text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteTicker}
                disabled={deletingTicker}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingTicker ? 'Deleting...' : 'Delete Ticker'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowBulkImport(false)}
        >
          <div className="bg-card rounded-lg border shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Bulk Import Tickers</h2>
              <button
                onClick={() => setShowBulkImport(false)}
                className="p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                bulkImportTickers()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Ticker Symbols
                </label>
                <textarea
                  value={bulkSymbols}
                  onChange={(e) => setBulkSymbols(e.target.value)}
                  placeholder="Enter symbols separated by commas, spaces, or newlines&#10;Example: NVDA, TSLA, AAPL"
                  className="w-full px-3 py-2 bg-background border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary min-h-[200px]"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Paste a list of ticker symbols. Duplicates and existing tickers will be automatically skipped.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImport(false)}
                  className="flex-1 px-4 py-2 border rounded-lg font-semibold text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!bulkSymbols.trim() || importingBulk}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importingBulk ? 'Importing...' : 'Import Tickers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
