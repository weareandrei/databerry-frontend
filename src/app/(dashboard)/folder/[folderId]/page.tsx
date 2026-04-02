'use client'

import { use, useEffect } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FolderGrid } from '@/components/dashboard/FolderGrid'
import { ViewCard } from '@/components/dashboard/ViewCard'

export default function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = use(params)
  const { folders: foldersCtx, views: viewsCtx } = useDashboard()

  const folder = foldersCtx.folders.find((f) => f.id === folderId)
  const subFolders = foldersCtx.getChildFolders(folderId)
  const folderViews = viewsCtx.getViewsByFolder(folderId)

  useEffect(() => {
    viewsCtx.loadViewsForFolder(folderId)
  }, [folderId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!folder) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground text-sm">Folder not found</p>
      </div>
    )
  }

  const isEmpty = subFolders.length === 0 && folderViews.length === 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title={folder.name}
        parentId={folderId}
        backHref={folder.parentId ? `/folder/${folder.parentId}` : '/home'}
      />

      <div className="space-y-8">
        {subFolders.length > 0 && <FolderGrid folders={subFolders} />}

        {folderViews.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Views
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {folderViews.map((view) => (
                <ViewCard key={view.id} view={view} />
              ))}
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">
              This folder is empty. Add sub-folders or create a view.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
