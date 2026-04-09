'use client'

import { useState } from 'react'
import { ArrowLeft, Folder, FolderPlus, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FolderGrid } from '@/components/dashboard/FolderGrid'
import { useDemoContext } from '../context/DemoContext'
import { DemoViewCard } from '../DemoViewCard'
import { DemoCreateViewModal } from '../DemoCreateViewModal'
import type { DemoFolder } from '../context/DemoContext'
import type { Folder as RealFolder } from '@/types/folder'

function toRealFolder(f: DemoFolder): RealFolder {
  return { ...f, userId: 'demo', createdAt: '', updatedAt: '' }
}

function CreateFolderDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (name: string) => void
}) {
  const [name, setName] = useState('')
  function handleSubmit() {
    if (!name.trim()) return
    onConfirm(name.trim())
    setName('')
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Folder name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DemoExplorerPage() {
  const {
    folders,
    createFolder,
    deleteFolder,
    views,
    deleteView,
    connections,
    openFolderId,
    setOpenFolderId,
  } = useDemoContext()
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createViewOpen, setCreateViewOpen] = useState(false)

  const currentFolder = openFolderId ? folders.find(f => f.id === openFolderId) : null
  const visibleFolders = folders.filter(f => f.parentId === (openFolderId ?? null))
  const visibleViews = openFolderId ? views.filter(v => v.folderId === openFolderId) : []

  return (
    <div className="flex-1 overflow-y-scroll bg-white p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2.5">
          {openFolderId && (
            <button
              onClick={() => setOpenFolderId(currentFolder?.parentId ?? null)}
              className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            >
              <ArrowLeft size={15} weight="thin" />
            </button>
          )}
          {currentFolder && (
            <Folder size={22} weight="thin" className="text-muted-foreground shrink-0 mt-0.5" />
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {currentFolder ? currentFolder.name : 'All folders'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCreateFolderOpen(true)}
          >
            <FolderPlus size={15} weight="thin" />
            Create folder
          </Button>
          {openFolderId && (
            <Button size="sm" className="gap-1.5" onClick={() => setCreateViewOpen(true)}>
              <Plus size={15} weight="thin" />
              Create view
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {visibleFolders.length > 0 && (
          <FolderGrid
            folders={visibleFolders.map(toRealFolder)}
            onDeleteFolder={deleteFolder}
            onCreateSubfolder={parentId => {
              createFolder('New folder', parentId)
            }}
            onFolderClick={setOpenFolderId}
          />
        )}

        {visibleViews.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Views</h2>
            <div className="grid grid-cols-3 gap-3" style={{ gridAutoRows: '110px' }}>
              {visibleViews.map(view => (
                <DemoViewCard
                  key={view.id}
                  view={view}
                  connection={connections.find(c => c.id === view.connectionId)}
                  onDelete={() => deleteView(view.id)}
                />
              ))}
            </div>
          </div>
        )}

        {visibleFolders.length === 0 && visibleViews.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </div>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onConfirm={name => createFolder(name, openFolderId)}
      />
      {openFolderId && (
        <DemoCreateViewModal
          open={createViewOpen}
          onOpenChange={setCreateViewOpen}
          folderId={openFolderId}
        />
      )}
    </div>
  )
}
