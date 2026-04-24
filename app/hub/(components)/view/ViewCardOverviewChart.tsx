'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, CaretDown, Check, DotsThreeVertical, Gear, PushPin, PushPinSlash, Target, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ViewWrapper } from './ViewWrapper'
import { OverviewChart } from './OverviewChart'
import { ProjectConversionsDialog } from './ProjectConversionsDialog'
import { ALGORITHM, PROJECT_OVERVIEW, type OverviewChartResponse } from '@/lib/api'
import { bucketLabelForNow } from '@/utils/overviewBucketLabel'
import type {
  OverviewPrimaryMetric,
  OverviewSecondaryMetric,
  ProjectOverviewChartConfig,
  View,
} from '@/types/view'

const PRIMARY_OPTIONS: { value: OverviewPrimaryMetric; label: string }[] = [
  { value: 'visitors',    label: 'Visitors' },
  { value: 'pageviews',   label: 'Pageviews' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'revenue',     label: 'Revenue' },
]

const SECONDARY_OPTIONS: { value: OverviewSecondaryMetric; label: string }[] = [
  { value: null,               label: 'None' },
  { value: 'conversion_rate',  label: 'Conversion rate' },
  { value: 'bounce_rate',      label: 'Bounce rate' },
  { value: 'avg_session_sec',  label: 'Avg. session' },
  { value: 'revenue',          label: 'Revenue' },
]

function readConfig(view: View): ProjectOverviewChartConfig {
  const cfg = view.config as Partial<ProjectOverviewChartConfig>
  return {
    primaryMetric: cfg.primaryMetric ?? 'visitors',
    secondaryMetric: cfg.secondaryMetric ?? null,
  }
}

function MetricDropdown<T extends string | null>({
  label,
  value,
  options,
  onChange,
  colorDot,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
  colorDot?: string
}) {
  const current = options.find(o => o.value === value) ?? options[0]
  return (
    <div className="flex items-center gap-2">
      <p className="text-[11px] uppercase tracking-wider text-grey-light font-medium">{label}</p>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors cursor-pointer">
          {colorDot && (
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: colorDot }}
            />
          )}
          <span>{current.label}</span>
          <CaretDown size={9} weight="bold" className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          {options.map(o => (
            <DropdownMenuItem
              key={String(o.value)}
              onClick={() => onChange(o.value)}
              className="gap-2 text-sm"
            >
              <span className="w-4 shrink-0">
                {o.value === value && <Check size={12} weight="bold" />}
              </span>
              <span>{o.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface ViewCardOverviewChartProps {
  view: View
  dateFrom: string
  dateTo: string
  mode: 'daily' | 'weekly' | 'monthly'
  projectName?: string
  onUntrack?: (id: string) => void
  onPin?: (id: string) => void
}

export function ViewCardOverviewChart({
  view,
  dateFrom,
  dateTo,
  mode,
  projectName,
  onUntrack,
  onPin,
}: ViewCardOverviewChartProps) {
  const initialConfig = useMemo(() => readConfig(view), [view])
  const [config, setConfig] = useState<ProjectOverviewChartConfig>(initialConfig)
  const [chart, setChart] = useState<OverviewChartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [conversionsOpen, setConversionsOpen] = useState(false)
  // `nowTick` bumps once per minute so the "now" reference line advances to
  // the next bucket when the wall clock crosses an hour/day boundary without
  // requiring a refetch.
  const [nowTick, setNowTick] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const nowLabel = useMemo(
    () => bucketLabelForNow(mode, dateFrom, dateTo),
    // nowTick participates in the dependency array so we recompute every minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, dateFrom, dateTo, nowTick],
  )

  const persistConfig = async (next: ProjectOverviewChartConfig) => {
    try {
      await ALGORITHM.updateView(view.id, {
        config: next as unknown as Record<string, unknown>,
      })
    } catch {
      toast.error('Failed to save view settings')
    }
  }

  const onPrimaryChange = (primaryMetric: OverviewPrimaryMetric) => {
    const next = { ...config, primaryMetric }
    setConfig(next)
    void persistConfig(next)
  }
  const onSecondaryChange = (secondaryMetric: OverviewSecondaryMetric) => {
    const next = { ...config, secondaryMetric }
    setConfig(next)
    void persistConfig(next)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    PROJECT_OVERVIEW.getChart(
      view.projectId,
      dateFrom,
      dateTo,
      mode,
      config.primaryMetric,
      config.secondaryMetric,
    )
      .then(chartRes => {
        if (!cancelled) setChart(chartRes)
      })
      .catch(err => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load overview')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    view.projectId,
    dateFrom,
    dateTo,
    mode,
    config.primaryMetric,
    config.secondaryMetric,
    refreshTick,
  ])

  const refresh = () => setRefreshTick(t => t + 1)
  const primaryUnavailable = chart?.primaryUnavailable ?? false
  const secondaryUnavailable = chart?.secondaryUnavailable ?? false
  const totalPrimary = chart?.totalPrimary ?? 0

  void projectName

  return (
    <ViewWrapper variant="borderless">
      {/* Metric selectors row — replaces the standard header for this composite view */}
      <div className="px-4 pt-3.5 pb-3 flex items-center gap-4 flex-wrap shrink-0">
        <MetricDropdown
          label="Primary"
          value={config.primaryMetric}
          options={PRIMARY_OPTIONS}
          onChange={onPrimaryChange}
        />
        <MetricDropdown
          label="Overlay"
          value={config.secondaryMetric}
          options={SECONDARY_OPTIONS}
          onChange={onSecondaryChange}
          colorDot={config.secondaryMetric ? '#F46719' : undefined}
        />
        <div className="ml-auto flex items-center gap-1.5">
          {!loading && !error && (
            <span className="text-xs text-grey-light tabular-nums">
              Total:{' '}
              <span className="text-grey-darkest font-semibold">
                {totalPrimary.toLocaleString()}
              </span>
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-grey-light hover:text-grey-dark hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1">
              <DotsThreeVertical size={18} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => setConversionsOpen(true)}
                className="text-sm gap-2"
              >
                <Target size={13} weight="bold" />
                Configure conversions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/hub/settings')}
                className="text-sm gap-2"
              >
                <Gear size={13} weight="bold" />
                Global settings
              </DropdownMenuItem>
              {onPin && (
                <DropdownMenuItem
                  onClick={() => onPin(view.id)}
                  className="text-sm gap-2"
                >
                  {view.isPinned ? (
                    <><PushPinSlash size={13} weight="bold" />Unpin</>
                  ) : (
                    <><PushPin size={13} weight="bold" />Pin</>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={refresh}
                disabled={loading}
                className="text-sm gap-2"
              >
                <ArrowsClockwise
                  size={13}
                  weight="bold"
                  className={loading ? 'animate-spin' : ''}
                />
                Refresh
              </DropdownMenuItem>
              {onUntrack && (
                <DropdownMenuItem
                  onClick={() => onUntrack(view.id)}
                  className="text-sm text-destructive focus:text-destructive"
                >
                  Untrack
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart */}
      <div className="relative p-4">
        <div className="relative h-[280px] xl:h-[340px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <ArrowsClockwise
                size={20}
                weight="bold"
                className="text-muted-foreground animate-spin"
              />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center">
              <Warning size={18} weight="bold" className="text-amber-500" />
              <p className="text-xs text-grey-light">{error}</p>
            </div>
          ) : primaryUnavailable ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
              <p className="text-sm text-grey-dark">No traffic source connected.</p>
              <Link
                href="/hub/settings"
                className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1 text-xs font-medium text-grey-darkest hover:bg-main transition-colors"
              >
                <Gear size={12} weight="bold" />
                Set up in Settings
              </Link>
            </div>
          ) : chart ? (
            <>
              <OverviewChart
                data={chart}
                primaryMetric={config.primaryMetric}
                secondaryMetric={config.secondaryMetric}
                nowLabel={nowLabel}
              />
              {secondaryUnavailable && config.secondaryMetric && (
                <p className="absolute left-2 bottom-0 text-[11px] text-grey-light">
                  {config.secondaryMetric === 'bounce_rate' ||
                  config.secondaryMetric === 'avg_session_sec'
                    ? `${
                        config.secondaryMetric === 'bounce_rate' ? 'Bounce rate' : 'Avg. session'
                      } requires Google Analytics.`
                    : config.secondaryMetric === 'conversion_rate'
                      ? 'Configure conversions from the menu to see the rate line.'
                      : 'This overlay is unavailable for the current setup.'}
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>

      <ProjectConversionsDialog
        projectId={view.projectId}
        open={conversionsOpen}
        onOpenChange={setConversionsOpen}
      />
    </ViewWrapper>
  )
}
