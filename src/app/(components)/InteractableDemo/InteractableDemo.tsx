'use client'

import { DemoProvider, useDemoContext } from './context/DemoContext'
import { DemoSidebar } from './DemoSidebar'
import { DemoHomePage } from './pages/DemoHomePage'
import { DemoConnectionsPage } from './pages/DemoConnectionsPage'
import { DemoExplorerPage } from './pages/DemoExplorerPage'

function UnsupportedNotice() {
  const { showUnsupportedNotice, dismissUnsupportedNotice } = useDemoContext()
  if (!showUnsupportedNotice) return null

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-xl"
      onClick={dismissUnsupportedNotice}
    >
      <div
        className="bg-card border rounded-xl px-6 py-4 shadow-lg text-center max-w-[240px]"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium">Demo doesn't support this feature</p>
        <button
          onClick={dismissUnsupportedNotice}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function DemoContent() {
  const { pageOpen } = useDemoContext()

  return (
    <div className="relative bg-background rounded-lg flex h-full">
      <DemoSidebar />
      {pageOpen === 'home' && <DemoHomePage />}
      {pageOpen === 'connections' && <DemoConnectionsPage />}
      {pageOpen === 'explorer' && <DemoExplorerPage />}
      <UnsupportedNotice />
    </div>
  )
}

const InteractableDemo = () => {
  return (
    <DemoProvider>
      <DemoContent />
    </DemoProvider>
  )
}

export default InteractableDemo
