'use client'

import { createContext, useContext, useEffect } from 'react'
import { useFolders } from '@/hooks/useFolders'
import { useConnections } from '@/hooks/useConnections'
import { usePins } from '@/hooks/usePins'
import { useWidgets } from '@/hooks/useWidgets'
import { useProjects } from '@/hooks/useProjects'

type DashboardContextValue = {
  projects: ReturnType<typeof useProjects>
  folders: ReturnType<typeof useFolders>
  connections: ReturnType<typeof useConnections>
  pins: ReturnType<typeof usePins>
  widgets: ReturnType<typeof useWidgets>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const projects = useProjects()
  const folders = useFolders()
  const connections = useConnections()
  const pins = usePins()
  const widgets = useWidgets()

  useEffect(() => {
    projects.loadProjects()
    folders.loadFolders()
    connections.loadConnections()
    pins.loadPinnedViews()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardContext.Provider value={{ projects, folders, connections, pins, widgets }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}

/**
 * Provider-tolerant variant — returns `null` when the consumer
 * isn't inside a `DashboardProvider` instead of throwing. Used by
 * components that are shared between real-mode (dashboard, has
 * provider) and demo-mode (landing-page `<InteractableDemo>`, no
 * provider). Demo callers degrade gracefully on `null`; real
 * callers get the same value `useDashboard()` returns.
 *
 * Don't use this in components that genuinely require the dashboard
 * context — those should keep using `useDashboard()` so the missing
 * provider fails loudly.
 */
export function useDashboardOptional() {
  return useContext(DashboardContext)
}
