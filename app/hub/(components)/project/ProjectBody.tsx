'use client'

/**
 * The project body — folders row + views grid + loading/empty states.
 * Renders chrome-free: every caller (`<ProjectView>` on the overview
 * page, `<MobileProjectBody>` builds its own variant) already sits
 * inside a white panel, so the body only owns padding and content.
 *
 * Folders appear ONLY here (the Overview surface) — the filtered
 * views sub-pages render `<ProjectBodyViews>` directly, per the
 * layout spec.
 */

import { CaretLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { FolderGrid } from '@/app/hub/(components)/folder/FolderGrid'
import { ProjectBodyViews } from './ProjectBodyViews'
import type { DateMode } from '@/types/dates'
import type { Folder } from '@/types/folder'
import type { View } from '@/types/view'

interface ProjectBodyProps {
  projectId: string
  currentFolder: Folder | null
  handleBack: () => void
  subFolders: Folder[]
  foldersCtx: {
    folders: Folder[]
    deleteFolder: (id: string) => void
    renameFolder: (folderId: string, name: string) => void | Promise<void>
    openModal: (parentId: string | null, projectId: string) => void
  }
  loading: boolean
  handleFolderClick: (folder: Folder) => void
  views: View[]
  isRange: boolean
  dateFrom: string
  dateTo: string
  mode: DateMode
  tz: string | null
  handleUntrack: (viewId: string) => void
  handlePin: (viewId: string) => void
  handleConnectionAssigned: (updated: View) => void
  handleReorder: (newDispatchTilesIds: string[]) => void
  isEmpty: boolean
  /** See `ProjectBodyViews` — drag-reorder is Overview-only, and the
   *  overview turns it off while a search filter is active. */
  sortable?: boolean
}

export function ProjectBody({
  projectId,
  currentFolder,
  handleBack,
  subFolders,
  foldersCtx,
  loading,
  handleFolderClick,
  views,
  isRange,
  dateFrom,
  dateTo,
  mode,
  tz,
  handleUntrack,
  handlePin,
  handleConnectionAssigned,
  handleReorder,
  isEmpty,
  sortable = true,
}: ProjectBodyProps) {
  return (
    <div className="p-5 pb-6">
      {currentFolder && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="-ml-2 mb-4 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <CaretLeft size={11} weight="bold" />
          Back
        </Button>
      )}

      <div className="mb-5">
        <FolderGrid
          folders={subFolders}
          onDeleteFolder={foldersCtx.deleteFolder}
          onRenameFolder={foldersCtx.renameFolder}
          onCreateSubfolder={foldersCtx.openModal}
          onCreateFolder={() => foldersCtx.openModal(currentFolder?.id ?? null, projectId)}
          onFolderClick={id => {
            const f = foldersCtx.folders.find(fl => fl.id === id)
            if (f) handleFolderClick(f)
          }}
        />
      </div>

      {loading ? (
        <ProjectBodyLoadingState />
      ) : views.length > 0 ? (
        <ProjectBodyViews
          views={views}
          isRange={isRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          tz={tz}
          handleUntrack={handleUntrack}
          handlePin={handlePin}
          handleConnectionAssigned={handleConnectionAssigned}
          handleReorder={handleReorder}
          sortable={sortable}
        />
      ) : isEmpty ? (
        <ProjectBodyEmptyState isRange={isRange} />
      ) : null}
    </div>
  )
}

function ProjectBodyLoadingState() {
  // Skeleton (not a spinner): a chart-shaped block + a tile row,
  // pulsing — same family as `<BodySkeleton>` but without the toolbar
  // stub (the real toolbar is already on screen above).
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading views">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-4 mb-6">
        <div className="h-[300px] rounded-xl bg-black/[0.05]" />
        <div className="h-[300px] rounded-xl bg-black/[0.04]" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[140px] rounded-xl bg-black/[0.05]" />
        ))}
      </div>
    </div>
  )
}

function ProjectBodyEmptyState({ isRange }: { isRange: boolean }) {
  return (
    <p className="text-xs text-muted-foreground py-10">
      {isRange
        ? 'No data recorded for this date range.'
        : 'No views yet. Use the + button to add one.'}
    </p>
  )
}
