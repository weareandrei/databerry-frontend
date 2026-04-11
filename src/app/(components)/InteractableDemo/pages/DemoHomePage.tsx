'use client'

import { PushPin } from '@phosphor-icons/react'
import { FolderGrid } from '@/components/dashboard/FolderGrid'
import { useDemoContext } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'
import type { DemoFolder } from '../context/DemoContext'
import type { Folder as RealFolder } from '@/types/folder'

function toRealFolder(f: DemoFolder): RealFolder {
  return { ...f, userId: 'demo', createdAt: '', updatedAt: '' }
}

export function DemoHomePage() {
  const { views, deleteView, folders, connections, setPageOpen, deleteFolder } = useDemoContext()
  const pinnedViews = views.filter(v => v.pinned)
  const rootFolders = folders.filter(f => f.parentId === null)

  return (
    <div className="flex-1 overflow-y-scroll bg-white p-6 pt-12 md:pt-6 space-y-6">
      <div>
        <h1 className="text-xl text-left font-semibold tracking-tight">Welcome to Databerry!</h1>
        <p className="text-[12px] text-left text-muted-foreground mt-1">
          This is your main dashboard. Pin important views, or quickly access folders.
        </p>
      </div>

      {pinnedViews.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <PushPin size={14} weight="thin" className="text-muted-foreground" />
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pinned views
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ gridAutoRows: '110px' }}>
            {pinnedViews.map(view => (
              <DemoViewCard
                key={view.id}
                view={view}
                connection={connections.find(c => c.id === view.connectionId)}
                onDelete={() => deleteView(view.id)}
              />
            ))}
          </div>
        </section>
      )}

      {rootFolders.length > 0 && (
        <section>
          <FolderGrid
            folders={rootFolders.map(toRealFolder)}
            onDeleteFolder={deleteFolder}
            onCreateSubfolder={() => {}}
            onFolderClick={() => setPageOpen('explorer')}
          />
        </section>
      )}
    </div>
  )
}
