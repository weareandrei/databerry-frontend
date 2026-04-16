'use client'

import { ArrowsClockwise } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import type { View } from '@/types/view'
import { formatViewValue } from '@/utils/formatters'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'

interface ViewCardProps {
  view: View
  onUntrack: (id: string) => void
  liveValue?: string | null
  liveLoading?: boolean
  liveError?: string | null
  projectName?: string
}

export function ViewCard({
  view,
  onUntrack,
  liveValue = null,
  liveLoading = false,
  liveError = null,
  projectName,
}: ViewCardProps) {
  const isDisconnected = !view.connectionId
  const displayValue = liveValue ?? view.value
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
      />

      <div className="px-4 pb-4 mt-3 flex-1 flex flex-col justify-center">
        {liveLoading && !displayValue ? (
          <ArrowsClockwise size={14} weight="bold" className="text-muted-foreground animate-spin" />
        ) : liveError && !displayValue ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-2xl font-semibold tabular-nums text-muted-foreground">—</span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{liveError}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-2xl font-semibold tabular-nums leading-none">
            {formatViewValue(displayValue, view.type)}
          </span>
        )}
      </div>
    </ViewWrapper>
  )
}
