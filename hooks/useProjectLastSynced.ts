'use client'

import { useEffect, useState } from 'react'
import { ALGORITHM } from '@/lib/api'

/**
 * Latest people-sync timestamp for a project — backs the sidebar
 * "Last synced … ago" line. Reads `lastSyncedAt` from `GET /people`
 * with `autoResync=false` so opening the selector never kicks sync.
 */
export function useProjectLastSynced(projectId: string | null) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [isResyncing, setIsResyncing] = useState(false)

  useEffect(() => {
    if (!projectId) {
      setLastSyncedAt(null)
      setIsResyncing(false)
      return
    }

    let cancelled = false

    void ALGORITHM.getPeople(projectId, { limit: 1, autoResync: false }).then(result => {
      if (cancelled) return
      setLastSyncedAt(result.lastSyncedAt)
      setIsResyncing(result.isResyncing)
    })

    return () => {
      cancelled = true
    }
  }, [projectId])

  return { lastSyncedAt, isResyncing }
}
