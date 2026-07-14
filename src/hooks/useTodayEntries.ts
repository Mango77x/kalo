import { useMemo } from 'react'
import { useEntriesForDate } from './useEntriesForDate'

export function useTodayEntries() {
  const today = useMemo(() => new Date(), [])
  return useEntriesForDate(today)
}
