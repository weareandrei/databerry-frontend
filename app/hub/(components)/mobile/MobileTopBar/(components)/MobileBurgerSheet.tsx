'use client'

/**
 * Bottom-sheet wrapper around `<MobileNav>`.
 *
 * Header mirrors the Untitled-UI mobile menu pattern: project select
 * on the left, close on the right. Sheet surface is white.
 */

import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { ProjectSelect } from '@/app/hub/(components)/navigation/(components)/ProjectSelect'
import { MobileNav } from '@/app/hub/(components)/navigation/MobileNav'

interface MobileBurgerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set (project top-bar), MobileNav shows this project's
   *  workspace links instead of the global home menu. */
  projectId?: string
}

export function MobileBurgerSheet({
  open,
  onOpenChange,
  projectId,
}: MobileBurgerSheetProps) {
  return (
    <BottomDialog
      open={open}
      onOpenChange={onOpenChange}
      className="bg-white"
    >
      <BottomDialog.Page
        bodyVariant="plain"
        headerLeft={
          <div
            className="w-fit max-w-full min-w-0"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
          >
            <ProjectSelect />
          </div>
        }
      >
        <MobileNav
          bounded={false}
          projectId={projectId}
          onNavigate={() => onOpenChange(false)}
        />
      </BottomDialog.Page>
    </BottomDialog>
  )
}
