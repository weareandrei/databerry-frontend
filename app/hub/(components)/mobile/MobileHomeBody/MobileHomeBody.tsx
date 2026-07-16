'use client'

/**
 * Body of the mobile home page — the whole scrollable column under
 * `<MobileTopBar variant="home">`. Stacked sections, in order:
 *
 *   1. Agent launcher — same "Hi {name}" + period stats as desktop,
 *      then the compact `<ChatEmpty>` ask-box (MCP chips collapsed to
 *      a single "Connect MCPs" CTA).
 *   2. Projects — same mini summary cards as desktop
 *      (`<ProjectsSummaryView>`), one full-width row each.
 *   3. Pinned widgets — same `<PinnedWidgetsView>` as desktop,
 *      forced single-column.
 *   4. "Help us improve" suggest card — moved here from the burger
 *      sheet so it's reachable from the home page itself.
 *
 * Self-contained: owns the launcher prompt state and the suggest-
 * dialog state, so the home page's mobile branch is just
 * `<MobileTopBar /> <MobileHomeBody />`. Empty (no projects) →
 * launcher + suggest card stay, `<WelcomeEmpty>` replaces projects
 * + pinned.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { ProjectsSummaryView } from '@/app/hub/(components)/views/ProjectsSummaryView'
import { PinnedWidgetsView } from '@/app/hub/(components)/views/PinnedWidgetsView'
import { HomeGreetingHeader } from '@/app/hub/home/(components)/HomeGreetingHeader'
import { WelcomeEmpty } from '@/app/hub/home/(components)/WelcomeEmpty'
import { ChatEmpty } from '@/app/hub/agent-chat/(components)/ChatEmpty'
import { HelpImproveCard, SuggestFeatureDialog } from '@/app/hub/(components)/feedback/SuggestFeature'

export function MobileHomeBody() {
  const router = useRouter()
  const { projects: projectsCtx, pins: pinsCtx, connections } = useDashboard()
  const [prompt, setPrompt] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)

  const projects = useMemo(
    () => projectsCtx.projects.filter(p => !p.id.startsWith('temp-')),
    [projectsCtx.projects],
  )

  const mcpConnections = useMemo(
    () => connections.connections.filter(c => c.type === 'mcp'),
    [connections.connections],
  )

  // Submitting the box hands the prompt to the full-page agent via the
  // `?q=` deep-link (auto-sends on mount there).
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
    <div className="flex-1 overflow-y-auto px-3 pt-6 pb-8">
      <div className="flex flex-col gap-6">
        {/* ── 1. Agent launcher — Hi {name} + stats + ask-box ──────── */}
        <section className="flex flex-col items-center gap-4">
          <HomeGreetingHeader compact />
          <div className="w-full">
            <ChatEmpty
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => launchAgent(prompt)}
              sending={false}
              mcpConnections={mcpConnections}
              hideTitle
              compact
              hideUserMcps
              mcpCtaLabel="Connect MCPs"
            />
          </div>
        </section>

        {showWelcome ? (
          <WelcomeEmpty onCreate={() => projectsCtx.openModal()} />
        ) : (
          <>
            <ProjectsSummaryView projects={projects} loading={projectsLoading} />

            {(showPinnedSection || pinsLoading) && (
              <PinnedWidgetsView
                pins={pinsCtx.pinnedViews}
                projects={projects}
                loading={pinsLoading}
                unpinView={pinsCtx.unpinView}
                onConnectionAssigned={pinsCtx.replacePin}
                singleColumn
              />
            )}
          </>
        )}

        <HelpImproveCard onSuggest={() => setSuggestOpen(true)} />
      </div>

      <SuggestFeatureDialog open={suggestOpen} onOpenChange={setSuggestOpen} />
    </div>
  )
}
