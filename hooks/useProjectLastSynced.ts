'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ALGORITHM } from '@/lib/api'

/** Poll cadence while the backend reports `isResyncing`. */
const RESYNC_POLL_MS = 3000

/**
 * Latest people-sync timestamp for a project — backs the sidebar
 * "Last synced … ago" line. Reads `lastSyncedAt` from `GET /people`
 * with `autoResync=false` so opening the selector never kicks sync.
 */
export function useProjectLastSynced(projectId: string | null) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [isResyncing, setIsResyncing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId

  const readStatus = useCallback(async (id: string) => {
    const result = await ALGORITHM.getPeople(id, { limit: 1, autoResync: false })
    setLastSyncedAt(result.lastSyncedAt)
    setIsResyncing(result.isResyncing)
    return result
  }, [])

  useEffect(() => {
    if (!projectId) {
      setLastSyncedAt(null)
      setIsResyncing(false)
      return
    }

    let cancelled = false

    void readStatus(projectId).catch(() => {
      if (!cancelled) {
        setLastSyncedAt(null)
        setIsResyncing(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [projectId, readStatus])

  useEffect(() => {
    if (!projectId || !isResyncing || syncing) return

    let cancelled = false
    const interval = setInterval(() => {
      if (cancelled) return
      void readStatus(projectId).catch(() => {})
    }, RESYNC_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [projectId, isResyncing, syncing, readStatus])

  const refresh = useCallback(async () => {
    const id = projectIdRef.current
    if (!id || syncing) return

    setSyncing(true)
    setIsResyncing(true)
    try {
      await ALGORITHM.syncPeople(id)
      await readStatus(id)
    } catch {
      await readStatus(id).catch(() => {})
    } finally {
      setSyncing(false)
    }
  }, [syncing, readStatus])

  return {
    lastSyncedAt,
    isResyncing: isResyncing || syncing,
    refresh,
    syncing,
  }
}
