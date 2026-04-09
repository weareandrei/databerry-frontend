'use client'

import { DotsThreeVertical, Warning, ArrowsClockwise } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/components/connections/ConnectionIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { View } from '@/types/view'

const MONEY_TYPES = ['stripe_revenue_today', 'daily_revenue']

const CONNECTION_LABELS: Record<string, string> = {
  posthog: 'PostHog',
  stripe: 'Stripe Connect',
  stripe_manual: 'Stripe',
  calendly: 'Calendly',
  webhook: 'Webhook',
  sentry: 'Sentry',
  github: 'GitHub',
  x: 'X (Twitter)',
  reddit: 'Reddit',
  gmail: 'Gmail',
}

function formatValue(value: string | null, type: string): string {
  if (value == null) return '—'
  if (MONEY_TYPES.includes(type)) {
    return `$${(parseInt(value, 10) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  return Number(value).toLocaleString()
}

interface ViewCardProps {
  view: View
  onUntrack: (id: string) => void
  liveValue?: string | null
  liveLoading?: boolean
  liveError?: string | null
}

export function ViewCard({
  view,
  onUntrack,
  liveValue = null,
  liveLoading = false,
  liveError = null,
}: ViewCardProps) {
  const isDisconnected = !view.connectionId
  const displayValue = liveValue ?? view.value
  const connectionLabel = CONNECTION_LABELS[view.connectionType] ?? view.connectionType

  return (
    <div className="col-span-1 row-span-1 flex flex-col justify-between rounded-xl border bg-card px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <ConnectionIcon
            type={view.connectionType}
            size={18}
            className="shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate text-left">{view.name}</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5 text-left">
              {connectionLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 -mr-1">
          {isDisconnected && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Warning size={14} weight="thin" className="text-amber-500 cursor-default" />
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Not connected to any integration</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground">
              <DotsThreeVertical size={15} weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {isDisconnected && <DropdownMenuItem className="text-sm">Connect</DropdownMenuItem>}
              <DropdownMenuItem
                onClick={() => onUntrack(view.id)}
                className="text-sm text-destructive focus:text-destructive"
              >
                Untrack
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3">
        {liveLoading && !displayValue ? (
          <ArrowsClockwise size={14} weight="thin" className="text-muted-foreground animate-spin" />
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
            {formatValue(displayValue, view.type)}
          </span>
        )}
      </div>
    </div>
  )
}
