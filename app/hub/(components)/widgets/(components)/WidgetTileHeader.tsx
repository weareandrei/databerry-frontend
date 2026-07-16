'use client'

import { Cube } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { WidgetHeader } from './WidgetHeader'
import { WidgetTileMenu } from './WidgetTileMenu'
import type { Widget } from '@/types/widget'

export interface WidgetTileHeaderProps {
  name: string
  connectionType: string
  connectionLabel: string
  isDisconnected?: boolean
  isConnectionMissing?: boolean
  onReconnect?: () => void
  onUntrack?: (id: string) => void
  viewId: string
  extraMenuItems?: React.ReactNode
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  compact?: boolean
  dense?: boolean
  view?: Widget
  onUpdated?: (updated: Widget) => void
}

export function WidgetTileHeader({
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
  view,
  onUpdated,
}: WidgetTileHeaderProps) {
  const subHeader = compact ? undefined : (
    <>
      {!(dense && projectName) && (
        <p className={dense ? 'text-xs leading-tight text-subtle' : 'text-sm leading-tight text-subtle'}>
          {connectionLabel}
        </p>
      )}
      {projectName && (
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-stroke px-2 py-0.5 text-[10px] leading-tight text-subtle">
          <Cube size={9} weight="bold" />
          {projectName}
        </span>
      )}
    </>
  )

  return (
    <WidgetHeader
      compact={compact}
      icon={
        <ConnectionIcon
          type={connectionType}
          size={compact ? 14 : dense ? 28 : 36}
          className="shrink-0 text-muted-foreground"
        />
      }
      header={name}
      subHeader={subHeader}
      headerClassName={dense && !compact ? 'text-sm' : undefined}
      actions={
        <WidgetTileMenu
          connectionType={connectionType}
          isDisconnected={isDisconnected}
          isConnectionMissing={isConnectionMissing}
          onReconnect={onReconnect}
          onUntrack={onUntrack}
          viewId={viewId}
          extraMenuItems={extraMenuItems}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onPin={onPin}
          isPinned={isPinned}
          view={view}
          onUpdated={onUpdated}
        />
      }
    />
  )
}
