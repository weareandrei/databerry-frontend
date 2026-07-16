'use client'

/**
 * Hub home — the workspace-level landing page.
 *
 * Layout (per the structural redesign):
 *   - Top bar: project select + global date controls.
 *   - Centered greeting + agent ask box. Submitting the box deep-links
 *     to `/hub/agent-chat?q=…`, which auto-sends the prompt — the
 *     conversation itself never happens on the home page.
 *   - Mini project overview cards — one per project, visitors + revenue
 *     for the globally selected date range.
 *
 * Gone from this page (moved, not lost):
 *   - The Dashboard/Agent toggle — replaced by the launcher + the
 *     dedicated agent routes. (The `DashboardAgentSwitch` component
 *     file survives because the landing-page demo still renders it.)
 *   - The all-projects grid — projects now live at
 *     `/hub/project/[id]`, reached via the icon rail.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { DashboardHeader } from '@/app/hub/(components)/navigation/DashboardHeader'
import { HomeGreetingHeader } from '@/app/hub/home/(components)/HomeGreetingHeader'
import { ProjectsSummaryView } from '@/app/hub/(components)/views/ProjectsSummaryView'
import { PinnedWidgetsView } from '@/app/hub/(components)/views/PinnedWidgetsView'
import { WelcomeEmpty } from '@/app/hub/home/(components)/WelcomeEmpty'
import { ChatEmpty } from '@/app/hub/agent-chat/(components)/ChatEmpty'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar/MobileTopBar'
import { MobileHomeBody } from '@/app/hub/(components)/mobile/MobileHomeBody/MobileHomeBody'

export default function HomePage() {
  const router = useRouter()
  const { projects: projectsCtx, connections, pins: pinsCtx } = useDashboard()
  const [prompt, setPrompt] = useState('')

  const projects = useMemo(
    () => projectsCtx.projects.filter(p => !p.id.startsWith('temp-')),
    [projectsCtx.projects],
  )

  const mcpConnections = useMemo(
    () => connections.connections.filter(c => c.type === 'mcp'),
    [connections.connections],
  )

  const launchAgent = (q?: string) => {
    const trimmed = (q ?? '').trim()
    router.push(
      trimmed ? `/hub/agent-chat?q=${encodeURIComponent(trimmed)}` : '/hub/agent-chat',
    )
  }

  const showWelcome = !projectsCtx.loading && projects.length === 0
  const projectsLoading = projectsCtx.loading
  const pinsLoading = pinsCtx.loading
  const showPinnedSection = pinsCtx.pinnedViews.length > 0

  return (
    <>
      <div className="lg:hidden h-[calc(100dvh-60px)] flex flex-col bg-white">
        <MobileTopBar variant="home" />
        <MobileHomeBody />
      </div>

      <div className="hidden lg:flex h-screen flex-col">
        <DashboardHeader
          showProjectSelectDropdown
          showCreateProjectButton
          onCreateProject={() => projectsCtx.openModal()}
        />

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {showWelcome ? (
            <WelcomeEmpty onCreate={() => projectsCtx.openModal()} />
          ) : (
            <div className="flex flex-col gap-10 px-6 pt-8 pb-12">
              <section className="flex flex-col items-center">
                <HomeGreetingHeader />
                <div className="w-full max-w-3xl">
                  <ChatEmpty
                    value={prompt}
                    onChange={setPrompt}
                    onSubmit={() => launchAgent(prompt)}
                    sending={false}
                    mcpConnections={mcpConnections}
                    hideTitle
                  />
                </div>
              </section>

              <ProjectsSummaryView projects={projects} loading={projectsLoading} />

              {(showPinnedSection || pinsLoading) && (
                <PinnedWidgetsView
                  pins={pinsCtx.pinnedViews}
                  projects={projects}
                  loading={pinsLoading}
                  unpinView={pinsCtx.unpinView}
                  onConnectionAssigned={pinsCtx.replacePin}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
