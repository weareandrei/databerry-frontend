'use client'

import { createContext, useContext, useEffect } from 'react'
import { useFolders } from '@/hooks/useFolders'
import { useConnections } from '@/hooks/useConnections'
import { usePins } from '@/hooks/usePins'
import { useViews } from '@/hooks/useViews'
import { useProjects } from '@/hooks/useProjects'

type DashboardContextValue = {
  projects: ReturnType<typeof useProjects>
  folders: ReturnType<typeof useFolders>
  connections: ReturnType<typeof useConnections>
  pins: ReturnType<typeof usePins>
  views: ReturnType<typeof useViews>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const projects = useProjects()
  const folders = useFolders()
  const connections = useConnections()
  const pins = usePins()
  const views = useViews()

  useEffect(() => {
    projects.loadProjects()
    folders.loadFolders()
    connections.loadConnections()
    pins.loadPinnedViews()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardContext.Provider value={{ projects, folders, connections, pins, views }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
