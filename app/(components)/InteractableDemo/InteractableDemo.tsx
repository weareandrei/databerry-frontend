'use client'

/**
 * Root of the interactable demo. Mounts the `DemoProvider` (single
 * source of truth for demo state) + the page-switch that picks the
 * right body for the current `pageOpen`.
 *
 * The "demo doesn't support this" notice lives at this level so any
 * page can surface it via `showNotice(message)` from the demo
 * context — covers OAuth-required flows, real chat backend, Stripe
 * sync, etc.
 */

import { DemoProvider, useDemoContext } from './context/DemoContext'
import { DemoSidebar } from './DemoSidebar'
import { DemoHomePage } from './pages/DemoHomePage'
import { DemoConnectionsPage } from './pages/DemoConnectionsPage'
import { DemoSettingsPage } from './pages/DemoSettingsPage'
import { DemoAskAIPage } from './pages/DemoAskAIPage'
import { DemoProjectPage } from './pages/DemoProjectPage'

function DemoNotice() {
  const { notice, dismissNotice } = useDemoContext()
  if (!notice) return null

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-xl"
      onClick={dismissNotice}
    >
      <div
        className="bg-card border rounded-xl px-6 py-4 shadow-lg text-center max-w-[260px]"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium">{notice}</p>
        <button
          onClick={dismissNotice}
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

  // `text-left` resets the `text-center` the surrounding landing-page
  // `<DemoSection>` applies for its hero copy. Without this, every
  // demo heading (project name, "PROJECTS" label, etc.) renders
  // centered because the text-align cascades through.
  return (
    <div className="relative bg-background rounded-lg flex h-full text-left">
      <DemoSidebar />
      {pageOpen === 'home' && <DemoHomePage />}
      {pageOpen === 'project' && <DemoProjectPage />}
      {pageOpen === 'connections' && <DemoConnectionsPage />}
      {pageOpen === 'settings' && <DemoSettingsPage />}
      {pageOpen === 'agent-chat' && <DemoAskAIPage />}
      <DemoNotice />
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
