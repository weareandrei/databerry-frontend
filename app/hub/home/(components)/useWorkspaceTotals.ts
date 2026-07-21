'use client'

/**
 * Workspace-wide visitors + revenue for the hub home greeting.
 * Refetches when the global date range changes or a view refresh
 * is broadcast (same bus the per-project mini cards listen to).
 */

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { PROJECT_OVERVIEW } from '@/lib/api'
import { useViewRefreshNonce } from '@/lib/viewRefreshBus'
import type { RootState } from '@/store'

function formatVisitors(value: number): string {
  return value.toLocaleString('en-US')
}

function formatRevenue(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function useWorkspaceTotals() {
  const dateFrom = useSelector((s: RootState) => s.ui.globalDateFrom)
  const dateTo = useSelector((s: RootState) => s.ui.globalDateTo)
  const refreshNonce = useViewRefreshNonce()

  const [revenueLabel, setRevenueLabel] = useState('$XXX')
  const [visitorsLabel, setVisitorsLabel] = useState('XXX')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    PROJECT_OVERVIEW.getWorkspaceTotals(dateFrom, dateTo)
      .then(res => {
        if (cancelled) return
        setRevenueLabel(formatRevenue(res.totalRevenue))
        setVisitorsLabel(formatVisitors(res.totalVisitors))
      })
      .catch(() => {
        if (cancelled) return
        setRevenueLabel('$0')
        setVisitorsLabel('0')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dateFrom, dateTo, refreshNonce])

  return { revenueLabel, visitorsLabel, loading }
}
