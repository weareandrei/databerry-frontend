'use client'

/**
 * Real-mode wrapper around `<ViewCardOverviewChart>`.
 *
 * `<ViewCardOverviewChart>` itself is provider-free — it accepts
 * its data + selected metrics + handlers as props. Real callers
 * (project page, folder page, pinned-views card, mobile project
 * body) compose the same wiring every time:
 *
 *   - read initial metrics from `view.config`
 *   - call `useOverviewChartData()` to fetch the series
 *   - persist metric changes to the backend via `ALGORITHM.updateView`
 *   - mount the `<ProjectConversionsDialog>` so the menu's
 *     "Configure conversions" item has somewhere to open into
 *
 * This wrapper bundles all of that. Real callers get a drop-in
 * replacement for the previous public API of
 * `<ViewCardOverviewChart>` (just `view`, dates, mode, untrack /
 * pin / projectName / chromeless props).
 *
 * Demo callers do *not* import this wrapper — they render
 * `<ViewCardOverviewChart>` directly with static mock data.
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ViewCardOverviewChart } from './ViewCardOverviewChart'
import { ProjectConversionsDialog } from './ProjectConversionsDialog'
import { useOverviewChartData } from './data/useOverviewChartData'
import { ALGORITHM } from '@/lib/api'
import type {
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
  View,
} from '@/types/view'

function readConfig(view: View): ProjectOverviewChartConfig {
  const cfg = view.config as Partial<ProjectOverviewChartConfig>
  return {
    primaryMetric: cfg.primaryMetric ?? 'visitors',
    secondaryMetric: cfg.secondaryMetric ?? null,
  }
}

interface ViewCardOverviewChartConnectedProps {
  view: View
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
  chromeless?: boolean
}

export function ViewCardOverviewChartConnected({
  view,
  dateFrom,
  dateTo,
  mode,
  projectName,
  onUntrack,
  onPin,
  chromeless,
}: ViewCardOverviewChartConnectedProps) {
  const initialConfig = useMemo(() => readConfig(view), [view])
  const [primaryMetric, setPrimaryMetric] = useState<OverviewPrimaryMetric>(
    initialConfig.primaryMetric,
  )
  const [secondaryMetric, setSecondaryMetric] = useState<OverviewSecondaryMetric>(
    initialConfig.secondaryMetric,
  )
  const [conversionsOpen, setConversionsOpen] = useState(false)
  const router = useRouter()

  const { chart, loading, error, refresh } = useOverviewChartData(view.projectId, {
    dateFrom,
    dateTo,
    mode,
    primaryMetric,
    secondaryMetric,
  })

  const handleMetricChange = (next: ProjectOverviewChartConfig) => {
    setPrimaryMetric(next.primaryMetric)
    setSecondaryMetric(next.secondaryMetric)
    void persistConfig(next)
  }

  const persistConfig = async (next: ProjectOverviewChartConfig) => {
    try {
      await ALGORITHM.updateView(view.id, {
        config: next as unknown as Record<string, unknown>,
      })
    } catch {
      toast.error('Failed to save view settings')
    }
  }

  return (
    <>
      <ViewCardOverviewChart
        view={view}
        dateFrom={dateFrom}
        dateTo={dateTo}
        mode={mode}
        primaryMetric={primaryMetric}
        secondaryMetric={secondaryMetric}
        onMetricChange={handleMetricChange}
        chart={chart}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onOpenConversions={() => setConversionsOpen(true)}
        onOpenSettings={() => router.push('/hub/settings')}
        projectName={projectName}
        onUntrack={onUntrack}
        onPin={onPin}
        chromeless={chromeless}
      />
      <ProjectConversionsDialog
        projectId={view.projectId}
        open={conversionsOpen}
        onOpenChange={setConversionsOpen}
      />
    </>
  )
}
