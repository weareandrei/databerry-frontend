'use client'

import { DotsThreeVertical, Warning, Cube, ArrowsClockwise, PushPin, PushPinSlash, Info, Plug } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ViewHeaderProps {
  name: string
  connectionType: string
  connectionLabel: string
  isDisconnected?: boolean
  /**
   * Connection FK on the view points at a row that no longer exists for
   * this user (typically because the connection was deleted while the
   * tile was open). Same UX treatment as `isDisconnected` from the
   * dropdown's perspective — both surface a "Reconnect" item that opens
   * the reassign-connection dialog. See `ViewCard` for the badge side.
   */
  isConnectionMissing?: boolean
  /**
   * Click handler for the dropdown's "Reconnect" item. Wired by `ViewCard`
   * to open `ReassignConnectionDialog`. The item is shown only when the
   * view is in a state that benefits from reattachment — i.e.
   * `isDisconnected || isConnectionMissing`.
   */
  onReconnect?: () => void
  onUntrack?: (id: string) => void
  viewId: string
  extraMenuItems?: React.ReactNode
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  /** Compact layout: small icon + small title on a single line, no connection label / project chip. */
  compact?: boolean
  /**
   * "Dense" layout — same shape as the default (icon | title / second
   * row | actions), but tighter sizing AND the connection label gets
   * dropped when a `projectName` pill is present. The icon already
   * conveys which integration this view belongs to, so showing both
   * "Stripe" + the project pill on a narrow tile (e.g. inside the
   * landing-page demo card) wraps the pill onto a third line —
   * dropping the redundant text fixes that.
   *
   * Real-dashboard tiles leave this `false`; only the demo passes it.
   * Default is opt-in so the existing dashboard pixels are unchanged.
   */
  dense?: boolean
}

export function ViewHeader({
  name,
  connectionType,
  connectionLabel,
  isDisconnected = false,
  isConnectionMissing = false,
  onReconnect,
  onUntrack,
  viewId,
  extraMenuItems,
  projectName,
  onRefresh,
  refreshing = false,
  onPin,
  isPinned = false,
  compact = false,
  dense = false,
}: ViewHeaderProps) {
  // "Needs reattach" covers both true orphans and dangling FKs — same
  // remedy (point this view at a different connection of the same type),
  // same dropdown affordance.
  const needsReattach = isDisconnected || isConnectionMissing
  return (
    <div
      className={
        compact
          ? 'flex items-center justify-between gap-1 px-4 pt-3 pb-0 shrink-0'
          : 'flex items-start justify-between gap-1 px-4 pt-3.5 pb-0 shrink-0'
      }
    >
      {compact ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <ConnectionIcon
            type={connectionType}
            size={14}
            className="shrink-0 text-grey-dark"
          />
          <p className="text-sm font-semibold leading-tight truncate text-grey-dark">{name}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          {/*
            Sizing forks on `dense`:
              - default real-dashboard sizing (34 px icon, `text-md`
                title, `text-sm` label) is unchanged for every existing
                tile in `/hub/...`
              - dense (demo only) shrinks each rung one notch and
                drops the connection-label text when there's a
                project pill — the icon already conveys integration,
                and on a narrow tile (~300 px) "Stripe" + pill won't
                fit on one line, so we'd otherwise wrap pill onto a
                third row.
          */}
          <ConnectionIcon
            type={connectionType}
            size={dense ? 28 : 34}
            className="shrink-0 text-grey-dark"
          />
          <div className="min-w-0">
            <p
              className={
                dense
                  ? 'text-sm font-semibold leading-tight truncate text-grey-dark'
                  : 'text-md font-semibold leading-tight truncate text-grey-dark'
              }
            >
              {name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {/* In dense mode with a project pill, drop the connection
                  label entirely — the icon already shows what
                  integration this is, and shaving the label off frees
                  the horizontal room the pill needs. */}
              {!(dense && projectName) && (
                <p
                  className={
                    dense
                      ? 'text-xs text-grey-light leading-tight'
                      : 'text-sm text-grey-light leading-tight'
                  }
                >
                  {connectionLabel}
                </p>
              )}
              {projectName && (
                <span className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-grey-light leading-tight shrink-0">
                  <Cube size={9} weight="bold" />
                  {projectName}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-0.5 shrink-0">
        {/*
          Refund-handling caveat. Currently the revenue sums in any Stripe
          tile are based on `charges.amount` (gross succeeded), not net of
          refunds. The `?` icon makes that explicit so a user staring at a
          revenue tile doesn't assume refunds have been subtracted.
          Schema-wise we do persist `amount_refunded`; the UI just hasn't
          subtracted it yet (see plan: out-of-scope for v1).
        */}
        {(connectionType === 'stripe' || connectionType === 'stripe_manual') && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info size={13} weight="bold" className="text-grey-light cursor-default" />
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
                <Warning size={13} weight="bold" className="text-amber-500 cursor-default" />
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
          <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded cursor-pointer text-grey-light hover:text-grey-dark hover:bg-black/[0.06] active:bg-black/[0.1] transition-colors -mr-1">
            <DotsThreeVertical size={18} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {/*
              Always available when a parent passes `onReconnect` — the
              user might want to swap connections even when nothing is
              visibly broken (e.g. the live value loaded but is wrong
              because the connection points at the wrong account, or the
              backend's generic "Couldn't load value" error doesn't
              specifically signal `CONNECTION_MISSING`).
              The earlier inert "Connect" item only worked for strict
              orphans (`view.connectionId == null`) and never had an
              `onClick` — replaced by this.
            */}
            {onReconnect && (
              <DropdownMenuItem onClick={onReconnect} className="text-sm gap-2">
                <Plug size={13} weight="bold" />
                Reconnect
              </DropdownMenuItem>
            )}
            {extraMenuItems}
            {onPin && (
              <DropdownMenuItem onClick={onPin} className="text-sm gap-2">
                {isPinned
                  ? <><PushPinSlash size={13} weight="bold" />Unpin</>
                  : <><PushPin size={13} weight="bold" />Pin</>
                }
              </DropdownMenuItem>
            )}
            {onRefresh && (
              <DropdownMenuItem
                onClick={onRefresh}
                disabled={refreshing}
                className="text-sm gap-2"
              >
                <ArrowsClockwise size={13} weight="bold" className={refreshing ? 'animate-spin' : ''} />
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
    </div>
  )
}
