'use client'

import { DotsThreeVertical, Warning, Cube } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/components/connections/ConnectionIcon'
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
  onUntrack: (id: string) => void
  viewId: string
  extraMenuItems?: React.ReactNode
  projectName?: string
}

export function ViewHeader({
  name,
  connectionType,
  connectionLabel,
  isDisconnected = false,
  onUntrack,
  viewId,
  extraMenuItems,
  projectName,
}: ViewHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-1 px-4 pt-3.5 pb-0 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <ConnectionIcon
          type={connectionType}
          size={16}
          className="shrink-0 text-grey-dark"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate text-grey-dark">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] text-grey-light leading-tight">{connectionLabel}</p>
            {projectName && (
              <span className="flex items-center gap-0.5 text-[10px] bg-black/[0.06] rounded px-1.5 py-0.5 text-grey-light leading-tight">
                <Cube size={9} weight="bold" />
                {projectName}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {isDisconnected && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Warning size={13} weight="bold" className="text-amber-500 cursor-default" />
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Not connected to any integration</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-6 h-6 rounded text-grey-light hover:text-grey-dark -mr-1">
            <DotsThreeVertical size={18} weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {isDisconnected && <DropdownMenuItem className="text-sm">Connect</DropdownMenuItem>}
            {extraMenuItems}
            <DropdownMenuItem
              onClick={() => onUntrack(viewId)}
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
