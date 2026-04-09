'use client'

import { createContext, useContext, useState } from 'react'
import { useDemoFolders, type DemoFolder } from '../hooks/useDemoFolders'
import { useDemoViews, type DemoView } from '../hooks/useDemoViews'
import { useDemoConnections, type DemoConnection } from '../hooks/useDemoConnections'

type DemoPage = 'home' | 'connections' | 'explorer'

export type { DemoPage, DemoFolder, DemoView, DemoConnection }

interface DemoContextValue {
  pageOpen: DemoPage
  setPageOpen: (page: DemoPage) => void

  openFolderId: string | null
  setOpenFolderId: (id: string | null) => void

  folders: DemoFolder[]
  createFolder: (name: string, parentId?: string | null) => void
  deleteFolder: (id: string) => void

  views: DemoView[]
  createView: (view: Omit<DemoView, 'id' | 'pinned'>) => void
  deleteView: (id: string) => void
  pinView: (id: string) => void
  getPinnedViews: () => DemoView[]

  connections: DemoConnection[]
  createConnection: () => void
  deleteConnection: (id: string) => void
  showUnsupportedNotice: boolean
  dismissUnsupportedNotice: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [pageOpen, setPageOpen] = useState<DemoPage>('home')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const { folders, createFolder, deleteFolder } = useDemoFolders()
  const { views, createView, deleteView, pinView, getPinnedViews } = useDemoViews()
  const {
    connections,
    createConnection,
    deleteConnection,
    showUnsupportedNotice,
    dismissUnsupportedNotice,
  } = useDemoConnections()

  return (
    <DemoContext.Provider
      value={{
        pageOpen,
        setPageOpen,
        openFolderId,
        setOpenFolderId,
        folders,
        createFolder,
        deleteFolder,
        views,
        createView,
        deleteView,
        pinView,
        getPinnedViews,
        connections,
        createConnection,
        deleteConnection,
        showUnsupportedNotice,
        dismissUnsupportedNotice,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

export function useDemoContext() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemoContext must be used within DemoProvider')
  return ctx
}
