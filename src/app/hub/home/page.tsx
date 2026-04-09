'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { FolderGrid } from '@/components/dashboard/FolderGrid'
import { ConnectionCard } from '@/components/connections/ConnectionCard'
import { PushPin } from '@phosphor-icons/react'

export default function HomePage() {
  const { user } = useAuth()
  const { folders: foldersCtx, views: viewsCtx, connections: connectionsCtx, pins } = useDashboard()

  const rootFolders = foldersCtx.getRootFolders()
  const displayName = user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <PageHeader
        title={`Welcome back, ${displayName}`}
        subtitle="Glad to have you back! Let's get started."
        showActions={false}
      />

      {pins.pinned.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-4">
            <PushPin size={14} weight="thin" className="text-muted-foreground" />
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Pins
            </h2>
          </div>
          <div className="space-y-2">
            {pins.pinned.map(connection => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onDelete={connectionsCtx.deleteConnection}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Folders
        </h2>
        {rootFolders.length > 0 ? (
          <FolderGrid
            folders={rootFolders}
            onDeleteFolder={foldersCtx.deleteFolder}
            onCreateSubfolder={foldersCtx.openModal}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            No folders yet. Create one to start organizing your projects.
          </p>
        )}
      </section>
    </div>
  )
}
