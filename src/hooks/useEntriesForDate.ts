import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { FeedbackKind, FoodEntry } from '../types'

function dayBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// Entradas de food_entries de un día concreto, con suscripción Realtime a los
// cambios del usuario (filtrada en cliente por si el cambio cae en ese día).
// useTodayEntries es este mismo hook con date = hoy.
export function useEntriesForDate(date: Date) {
  const { session } = useAuth()
  const userId = session?.user.id
  const key = dateKey(date)
  const { start, end } = useMemo(() => dayBounds(date), [date])

  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackByEntry, setFeedbackByEntry] = useState<
    Record<string, FeedbackKind>
  >({})

  const fetchEntries = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('consumed_at', start)
      .lt('consumed_at', end)
      .order('consumed_at', { ascending: true })
    const rows = (data as FoodEntry[]) ?? []
    setEntries(rows)
    setLoading(false)

    if (rows.length === 0) {
      setFeedbackByEntry({})
      return
    }
    const { data: feedbackRows } = await supabase
      .from('calibration_feedback')
      .select('food_entry_id, feedback')
      .eq('user_id', userId)
      .in(
        'food_entry_id',
        rows.map((r) => r.id)
      )
    setFeedbackByEntry(
      Object.fromEntries(
        (feedbackRows ?? []).map((r) => [r.food_entry_id, r.feedback])
      )
    )
  }, [userId, start, end])

  // Feedback de calibración ("menos"/"bien"/"más") sobre una entrada: se
  // guarda una sola vez por entrada (ver FoodEntryCard, oculta los botones
  // tras enviarlo) y dispara en BD el ajuste del multiplicador de la
  // categoría (trigger calibration_feedback_apply_trigger).
  const submitFeedback = useCallback(
    async (entryId: string, feedback: FeedbackKind) => {
      if (!userId) return
      const { error } = await supabase
        .from('calibration_feedback')
        .insert({ food_entry_id: entryId, user_id: userId, feedback })
      if (!error) {
        setFeedbackByEntry((prev) => ({ ...prev, [entryId]: feedback }))
      }
      return error
    },
    [userId]
  )

  useEffect(() => {
    if (!userId) return
    fetchEntries()

    const isInRange = (consumedAt: string) =>
      consumedAt >= start && consumedAt < end

    const channel = supabase
      .channel(`food_entries_${userId}_${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as FoodEntry
            if (isInRange(row.consumed_at)) {
              setEntries((prev) =>
                [...prev, row].sort((a, b) =>
                  a.consumed_at.localeCompare(b.consumed_at)
                )
              )
            }
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as FoodEntry
            setEntries((prev) =>
              isInRange(row.consumed_at)
                ? prev.map((e) => (e.id === row.id ? row : e))
                : prev.filter((e) => e.id !== row.id)
            )
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as FoodEntry
            setEntries((prev) => prev.filter((e) => e.id !== row.id))
            setFeedbackByEntry((prev) => {
              const { [row.id]: _removed, ...rest } = prev
              return rest
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, key, fetchEntries, start, end])

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein_g: acc.protein_g + e.protein_g,
      carbs_g: acc.carbs_g + e.carbs_g,
      fat_g: acc.fat_g + e.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  return { entries, totals, loading, feedbackByEntry, submitFeedback }
}
