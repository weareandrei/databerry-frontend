'use client'

import { ChartLine, DotsThreeVertical, Warning } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { View } from '@/types/view'

interface ViewCardProps {
  view: View
}

const ICON_MAP: Record<string, React.ElementType> = {
  posthog: ChartLine,
}

export function ViewCard({ view }: ViewCardProps) {
  const { views: viewsCtx } = useDashboard()
  const Icon = ICON_MAP[view.connectionType] ?? ChartLine
  const isDisconnected = !view.connectionId

  return (
    <div className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Icon size={16} weight="thin" className="text-muted-foreground shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{view.name}</span>
          <span className="text-xs text-muted-foreground capitalize">{view.connectionType}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isDisconnected ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Warning size={16} weight="thin" className="text-amber-500 cursor-default" />
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Not connected to any integration</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {view.value ?? '—'}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground">
            <DotsThreeVertical size={16} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {isDisconnected && (
              <DropdownMenuItem className="text-sm">
                Connect
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => viewsCtx.untrackView(view.id)}
              className="text-sm text-destructive focus:text-destructive"
            >
              Untrack
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
