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

import { useEffect } from 'react'
import { Warning, X } from '@phosphor-icons/react'
import { DemoProvider, useDemoContext } from './context/DemoContext'
import { DemoErrorBoundary } from './DemoErrorBoundary'
import { DemoIconRail } from './DemoIconRail'
import { DemoMobileNav } from './DemoMobileNav'
import { DemoProjectSidebar } from './DemoProjectSidebar'
import { DemoTopBar } from './DemoTopBar'
import { DemoAgentBody } from './DemoAgentBody'
import { DemoProjectView } from './projects/DemoProjectView'
import { DemoPinned } from './projects/DemoPinned'
import { DemoHomePage } from './pages/DemoHomePage'
import { DemoConnectionsPage } from './pages/DemoConnectionsPage'

const DEMO_UNSUPPORTED_NOTICE = "This feature isn't available in the demo."

/**
 * How long the snackbar stays visible before auto-dismissing.
 * 3.5 s is the same window Sonner (the toast library used elsewhere
 * in the app) defaults to — long enough to read a short sentence,
 * short enough that it doesn't linger when the user moves on.
 */
const NOTICE_DURATION_MS = 3500

const InteractableDemo = () => {
  return (
    <DemoProvider>
      <DemoContent />
    </DemoProvider>
  )
}

export default InteractableDemo

const DemoContent = () => {
  const { pageOpen, currentProjectId, projects, showNotice, setDialogContainer } =
    useDemoContext()
  const project = currentProjectId
    ? projects.find(p => p.id === currentProjectId) ?? null
    : null

  // `text-left` resets the `text-center` the surrounding landing-page
  // `<DemoSection>` applies for its hero copy. Without this, every
  // demo heading (project name, "PROJECTS" label, etc.) renders
  // centered because the text-align cascades through.
  //
  // `<DemoErrorBoundary>` wraps just the page area — `<DemoSidebar>`
  // + `<DemoNotice>` sit outside so a notice fired by the boundary
  // can be rendered without being inside the failing subtree. The
  // boundary catches any render-time throw (most commonly: a shared
  // view-card opens a dialog whose body calls `useDashboard()`,
  // which has no provider here), then `showNotice` paints the
  // existing "not available in demo" overlay so the user sees an
  // explanation instead of a crashed page.
  return (
    // `ref={setDialogContainer}` exposes this element to demo modals so
    // <BottomDialog container={dialogContainer} /> can portal its sheet
    // into THIS surface instead of the page <body>, keeping the bottom
    // sheet inside the demo card on the landing page.
    // `overflow-hidden` clips the dialog's rounded-top corners to the
    // demo card's rounded-lg, and stops the sheet's slide-in transform
    // from briefly bleeding outside the card.
    <div
      ref={setDialogContainer}
      className="relative overflow-hidden bg-background rounded-lg flex h-full text-left"
    >
      {/* Desktop nav: the left icon spine + (inside a project) the
          per-project sidebar. Both are `hidden md:flex`. */}
      <DemoIconRail />
      {project && <DemoProjectSidebar projectId={project.id} />}
      {/* Mobile nav: a floating burger + bottom-sheet menu (`md:hidden`),
          the demo's mirror of the real `<MobileTopBar>` burger. Sits at
          the surface root so it floats over whichever page is open. */}
      <DemoMobileNav />

      <DemoErrorBoundary onError={() => showNotice(DEMO_UNSUPPORTED_NOTICE)}>
        <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
          {/* Project dashboard surfaces — date controls on top, body
              scrolls beneath (mirrors `<ProjectOverviewScreen>`). */}
          {pageOpen === 'overview' && project && (
            <>
              <DemoTopBar />
              <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
                <DemoProjectView project={project} />
              </div>
            </>
          )}
          {pageOpen === 'pinned' && project && (
            <>
              <DemoTopBar />
              <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
                <DemoPinned project={project} />
              </div>
            </>
          )}
          {/* Agent / connections / home own their full internal layout. */}
          {pageOpen === 'agent' && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <DemoAgentBody />
            </div>
          )}
          {pageOpen === 'connections' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <DemoConnectionsPage />
            </div>
          )}
          {pageOpen === 'home' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <DemoHomePage />
            </div>
          )}
        </div>
      </DemoErrorBoundary>
      <DemoNotice />
    </div>
  )
}

/**
 * Bottom-pinned snackbar — slides up when `notice` is set, auto-
 * dismisses after `NOTICE_DURATION_MS`, can be manually dismissed
 * via the X. Non-blocking (no backdrop dim, no click-outside trap)
 * so the user can keep interacting with the demo while it's
 * showing — same way real toast libraries (Sonner, etc.) work.
 *
 * Was previously a centered modal with a backdrop, which felt too
 * heavy for "this feature isn't available" messaging — it stopped
 * the user's flow entirely. A snackbar communicates the same
 * "demo limitation" message without freezing the surface.
 */
const DemoNotice = () => {
  const { notice, dismissNotice } = useDemoContext()

  // Auto-dismiss timer — restarts whenever `notice` changes (e.g.
  // user triggered a second unsupported action before the first
  // toast cleared, so the timer resets to give them the full
  // window to read the new message). Cleared on unmount and on
  // notice change.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(dismissNotice, NOTICE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [notice, dismissNotice])

  if (!notice) return null

  return (
    // `absolute bottom-3` pins to the bottom of the demo card (the
    // nearest positioned ancestor — `<DemoContent>`'s root has
    // `relative`). `z-50` keeps it above the page content but below
    // dialogs from the shared components. Width caps at `max-w-sm`
    // to keep a single line of body text from stretching across the
    // whole card on desktop.
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-1.5rem)] pointer-events-auto"
    >
      <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-lg">
        <Warning
          size={14}
          weight="bold"
          className="shrink-0 text-amber-700"
        />
        <p className="flex-1 text-xs font-medium text-amber-900">{notice}</p>
        <button
          type="button"
          onClick={dismissNotice}
          aria-label="Dismiss notice"
          className="shrink-0 -mr-1 flex items-center justify-center w-5 h-5 rounded text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-colors"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    </div>
  )
}
