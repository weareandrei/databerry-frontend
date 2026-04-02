'use client'

import { createContext, useContext, useEffect } from 'react'
import { useFolders } from '@/hooks/useFolders'
import { useConnections } from '@/hooks/useConnections'
import { usePins } from '@/hooks/usePins'
import { useViews } from '@/hooks/useViews'

type DashboardContextValue = {
  folders: ReturnType<typeof useFolders>
  connections: ReturnType<typeof useConnections>
  pins: ReturnType<typeof usePins>
  views: ReturnType<typeof useViews>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const folders = useFolders()
  const connections = useConnections()
  const pins = usePins()
  const views = useViews()

  // Single data load on mount
  useEffect(() => {
    folders.loadFolders()
    connections.loadConnections()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // views.loadViewsForFolder is called per-folder page, not here

  return (
    <DashboardContext.Provider value={{ folders, connections, pins, views }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
