import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useAuth } from './useAuth'

export function useWatchlist() {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    (supabase as any)
      .from('user_watchlist')
      .select('ticker_id')
      .eq('user_id', user.id)
      .then(({ data }: { data: Array<{ ticker_id: string }> | null }) => {
        setWatchlist(new Set((data || []).map(r => r.ticker_id)))
        setLoading(false)
      })
  }, [user])

  const toggle = useCallback(async (tickerId: string) => {
    if (!user) return
    const isWatched = watchlist.has(tickerId)
    setWatchlist(prev => {
      const next = new Set(prev)
      isWatched ? next.delete(tickerId) : next.add(tickerId)
      return next
    })
    if (isWatched) {
      await (supabase as any)
        .from('user_watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker_id', tickerId)
    } else {
      await (supabase as any)
        .from('user_watchlist')
        .insert({ user_id: user.id, ticker_id: tickerId })
    }
  }, [user, watchlist])

  return { watchlist, toggle, loading }
}
