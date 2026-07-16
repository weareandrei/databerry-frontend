'use client'

import { useState } from 'react'
import {
  DotsThreeVertical,
  Warning,
  Info,
  Plug,
  ArrowsClockwise,
  PushPin,
  PushPinSlash,
  ChartLine,
  Hash,
  ListBullets,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent } from '@/lib/posthog'
import { getViewOption, type ViewKind } from '@/constants/viewOptions'
import type { Widget } from '@/types/widget'

const MODE_META: Record<ViewKind, { label: string; icon: typeof ChartLine }> = {
  chart: { label: 'chart', icon: ChartLine },
  value: { label: 'value', icon: Hash },
  list: { label: 'list', icon: ListBullets },
}

export interface WidgetTileMenuProps {
  connectionType: string
  isDisconnected?: boolean
  isConnectionMissing?: boolean
  onReconnect?: () => void
  onUntrack?: (id: string) => void
  viewId: string
  extraMenuItems?: React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  view?: Widget
  onUpdated?: (updated: Widget) => void
}

export function WidgetTileMenu({
  connectionType,
  isDisconnected = false,
  isConnectionMissing = false,
  onReconnect,
  onUntrack,
  viewId,
  extraMenuItems,
  onRefresh,
  refreshing = false,
  onPin,
  isPinned = false,
  view,
  onUpdated,
}: WidgetTileMenuProps) {
  const needsReattach = isDisconnected || isConnectionMissing
  const [converting, setConverting] = useState(false)
  const option = view ? getViewOption(view.connectionType, view.type) : null
  const currentDisplayMode =
    (view?.config as { displayMode?: ViewKind } | undefined)?.displayMode ??
    option?.kind ??
    null
  const convertibleModes: ViewKind[] =
    option && view && onUpdated && option.modes.length > 1
      ? option.modes.filter(m => m !== currentDisplayMode)
      : []

  const handleConvert = async (mode: ViewKind) => {
    if (!view || !onUpdated || converting) return
    setConverting(true)
    try {
      const nextConfig = { ...(view.config ?? {}), displayMode: mode }
      const updated = await ALGORITHM.updateView(view.id, { config: nextConfig })
      onUpdated(updated)
    } catch {
      toast.error(`Couldn’t convert to ${MODE_META[mode].label}`)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {(connectionType === 'stripe' || connectionType === 'stripe_manual') && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info size={13} weight="bold" className="cursor-default text-subtle" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-56">
              <p className="text-xs">
                Refunds aren&rsquo;t reflected in this view yet. Coming soon.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {needsReattach && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Warning size={13} weight="bold" className="cursor-default text-amber-500" />
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">
                {isConnectionMissing
                  ? 'Connection no longer exists'
                  : 'Not connected to any integration'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className="-mr-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded text-subtle transition-colors hover:bg-black/[0.06] hover:text-muted-foreground active:bg-black/[0.1]">
          <DotsThreeVertical size={18} weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {onReconnect && (
            <DropdownMenuItem onClick={onReconnect} className="gap-2 text-sm">
              <Plug size={13} weight="bold" />
              Reconnect
            </DropdownMenuItem>
          )}
          {convertibleModes.map(mode => {
            const Icon = MODE_META[mode].icon
            return (
              <DropdownMenuItem
                key={`convert:${mode}`}
                onClick={() => handleConvert(mode)}
                disabled={converting}
                className="gap-2 text-sm"
              >
                <Icon size={13} weight="bold" />
                Convert to {MODE_META[mode].label}
              </DropdownMenuItem>
            )
          })}
          {extraMenuItems}
          {onPin && (
            <DropdownMenuItem onClick={onPin} className="gap-2 text-sm">
              {isPinned ? (
                <>
                  <PushPinSlash size={13} weight="bold" />
                  Unpin
                </>
              ) : (
                <>
                  <PushPin size={13} weight="bold" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
          )}
          {onRefresh && (
            <DropdownMenuItem
              onClick={() => {
                trackEvent(EVENT.VIEW_REFRESHED, {
                  viewId,
                  viewType: view?.type,
                })
                onRefresh()
              }}
              disabled={refreshing}
              className="gap-2 text-sm"
            >
              <ArrowsClockwise
                size={13}
                weight="bold"
                className={refreshing ? 'animate-spin' : ''}
              />
              Refresh
            </DropdownMenuItem>
          )}
          {onUntrack && (
            <DropdownMenuItem
              onClick={() => onUntrack(viewId)}
              className="text-sm text-destructive focus:text-destructive"
            >
              Untrack
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
