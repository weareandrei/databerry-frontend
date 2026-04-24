'use client'

import { ArrowsClockwise, Warning } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import type { View } from '@/types/view'
import { formatViewValue } from '@/utils/formatters'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'

export function FetchErrorBadge({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium">
      <Warning size={11} weight="bold" />
      {message}
    </span>
  )
}

interface ViewCardProps {
  view: View
  onUntrack?: (id: string) => void
  liveValue?: string | null
  liveLoading?: boolean
  liveError?: string | null
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
}

export function ViewCard({
  view,
  onUntrack,
  liveValue = null,
  liveLoading = false,
  liveError = null,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
}: ViewCardProps) {
  const isDisconnected = !view.connectionId
  const displayValue = liveValue ?? view.value
  const isUnknown = !liveLoading && !isDisconnected && !liveError && (displayValue == null || displayValue === '')
  const connectionLabel = CONNECTION_DISPLAY_NAMES[view.connectionType] ?? view.connectionType

  return (
    <ViewWrapper className="col-span-1 row-span-1">
      <ViewHeader
        name={view.name}
        connectionType={view.connectionType}
        connectionLabel={connectionLabel}
        isDisconnected={isDisconnected}
        onUntrack={onUntrack}
        viewId={view.id}
        projectName={projectName}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onPin={onPin}
        isPinned={isPinned}
      />

      <div className="px-4 pb-4 mt-3 flex-1 flex flex-col justify-center">
        {liveLoading ? (
          <ArrowsClockwise size={14} weight="bold" className="text-muted-foreground animate-spin" />
        ) : isDisconnected ? (
          <FetchErrorBadge message="No connection" />
        ) : liveError ? (
          <FetchErrorBadge message="Fetch failed" />
        ) : isUnknown ? (
          <span className="text-2xl font-semibold leading-none text-grey-light">Unknown</span>
        ) : (
          <span className="text-2xl font-semibold tabular-nums leading-none">
            {formatViewValue(displayValue, view.type)}
          </span>
        )}
      </div>
    </ViewWrapper>
  )
}
