'use client'

/**
 * Root of the interactable demo. Mounts the `DemoProvider` (single
 * source of truth for demo state) + the page-switch that picks the
 * right body for the current `pageOpen`.
 */

import { useEffect, useState } from 'react'
import { SquaresFour, Warning, X } from '@phosphor-icons/react'
import { DemoProvider, useDemoContext } from './(components)/context/DemoContext'
import { DemoErrorBoundary } from './(components)/DemoErrorBoundary'
import { DemoDashboardSidebar } from './(components)/DemoDashboardSidebar'
import { DemoMobileTopBar } from './(components)/DemoMobileTopBar'
import { DemoAgentBody } from './(components)/DemoAgentBody'
import { DemoProjectView } from './(components)/projects/DemoProjectView'
import { DemoHomePage } from './(components)/pages/DemoHomePage'
import { DemoConnectionsPage } from './(components)/pages/DemoConnectionsPage'
import { DemoProjectPageHeader } from './(components)/DemoProjectPageHeader'
import { DemoCreateViewModal } from './(components)/DemoCreateViewModal'

const DEMO_UNSUPPORTED_NOTICE = "This feature isn't available in the demo."
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
  const {
    pageOpen,
    currentProjectId,
    projects,
    showNotice,
    setDialogContainer,
    goToPage,
    renameProject,
    deleteProject,
  } = useDemoContext()
  const project = currentProjectId
    ? projects.find(p => p.id === currentProjectId) ?? null
    : null
  const [createViewOpen, setCreateViewOpen] = useState(false)

  useEffect(() => {
    if (pageOpen === 'overview' && !project) {
      goToPage('home')
    }
  }, [pageOpen, project, goToPage])

  return (
    <div
      ref={setDialogContainer}
      className="relative overflow-hidden rounded-lg flex h-full text-left font-sans bg-surface"
    >
      <div className="dashboard flex h-full w-full overflow-hidden">
        <DemoDashboardSidebar />

        <DemoErrorBoundary onError={() => showNotice(DEMO_UNSUPPORTED_NOTICE)}>
          <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden border-l border-stroke bg-white pt-[60px] md:pt-0">
            {pageOpen === 'home' && <DemoHomePage />}

            {pageOpen === 'overview' && project && (
              <>
                <DemoMobileTopBar
                  variant="project"
                  projectName={project.name}
                  projectWebsiteUrl={project.websiteUrl}
                  onBack={() => goToPage('home')}
                />
                <DemoProjectPageHeader
                  project={project}
                  pageLabel="Overview"
                  pageIcon={SquaresFour}
                  onBack={() => goToPage('home')}
                  onCreateView={() => setCreateViewOpen(true)}
                  onEditProject={() => {
                    const next = window.prompt('Rename project', project.name)?.trim()
                    if (next) renameProject(project.id, next)
                  }}
                  onDeleteProject={() => {
                    if (
                      window.confirm(
                        `Delete "${project.name}"? This removes its folders + views.`,
                      )
                    ) {
                      deleteProject(project.id)
                    }
                  }}
                />
                <div className="flex-1 min-h-0 overflow-hidden">
                  <DemoProjectView
                    project={project}
                    onCreateView={() => setCreateViewOpen(true)}
                  />
                </div>
                <DemoCreateViewModal
                  open={createViewOpen}
                  onOpenChange={setCreateViewOpen}
                  projectId={project.id}
                  folderId={`${project.id}-root`}
                />
              </>
            )}

            {pageOpen === 'agent' && (
              <>
                <DemoMobileTopBar variant="page" title="Ask agent" />
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <DemoAgentBody />
                </div>
              </>
            )}

            {pageOpen === 'connections' && (
              <>
                <DemoMobileTopBar
                  variant="page"
                  title="Connections"
                  onBack={
                    currentProjectId
                      ? () => goToPage('overview', currentProjectId)
                      : undefined
                  }
                />
                <DemoConnectionsPage />
              </>
            )}
          </div>
        </DemoErrorBoundary>
      </div>

      <DemoNotice />
    </div>
  )
}

const DemoNotice = () => {
  const { notice, dismissNotice } = useDemoContext()

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(dismissNotice, NOTICE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [notice, dismissNotice])

  if (!notice) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-1.5rem)] pointer-events-auto"
    >
      <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-lg">
        <Warning size={14} weight="bold" className="shrink-0 text-amber-700" />
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
