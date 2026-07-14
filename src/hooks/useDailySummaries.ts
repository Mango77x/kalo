import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { DailySummary } from '../types'

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Histórico desde daily_summaries (cacheado por trigger en food_entries):
// evita sumar cientos de filas en cliente para las gráficas de tendencia.
export function useDailySummaries(days: number) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSummaries = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))

    const { data } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', toDateKey(from))
      .lte('date', toDateKey(to))
      .order('date', { ascending: true })

    setSummaries((data as DailySummary[]) ?? [])
    setLoading(false)
  }, [userId, days])

  useEffect(() => {
    fetchSummaries()
    window.addEventListener('focus', fetchSummaries)
    return () => window.removeEventListener('focus', fetchSummaries)
  }, [fetchSummaries])

  return { summaries, loading }
}
