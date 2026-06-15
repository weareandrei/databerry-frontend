'use client'

/**
 * Body of the mobile home page — the whole scrollable column under
 * `<MobileTopBar variant="home">`. Stacked sections, in order:
 *
 *   1. Agent launcher — ONE white card holding a "Chat with Agent"
 *      button ABOVE the real `<ChatEmpty>` ask-box (same box the
 *      desktop home + agent pages use, embedded `compact`). The box
 *      shows ONLY a single "Connect MCPs" button — never the
 *      per-connection MCP chips (`hideUserMcps`). The full agent page
 *      still lists every connection as normal.
 *   2. Projects — the flat tap-through list (`<MobileProjectsList>`).
 *   3. Pinned views — grouped BY PROJECT, each project's pins in its
 *      own white-bordered card (single-column).
 *   4. "Help us improve" suggest card — moved here from the burger
 *      sheet so it's reachable from the home page itself.
 *
 * Self-contained: owns the launcher prompt state, the suggest-dialog
 * state, and the per-project pin grouping, so the home page's mobile
 * branch is just `<MobileTopBar /> <MobileHomeBody />`. Empty (no
 * projects) → launcher + suggest card stay, `<WelcomeEmpty>` replaces
 * projects + pinned.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { PinnedViews } from '@/app/hub/home/(components)/PinnedViews'
import { PinnedViewsSkeleton } from '@/app/hub/home/(components)/PinnedViewsSkeleton'
import { WelcomeEmpty } from '@/app/hub/home/(components)/WelcomeEmpty'
import { ChatEmpty } from '@/app/hub/agent-chat/(components)/ChatEmpty'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { HelpImproveCard, SuggestFeatureDialog } from '@/app/hub/(components)/SuggestFeature'
import { MobileProjectsList } from './MobileProjectsList'
import type { Project } from '@/types/project'
import type { View } from '@/types/view'

const SECTION_LABEL = 'text-xs font-medium uppercase tracking-wider text-grey-light'

export function MobileHomeBody() {
  const router = useRouter()
  const { projects: projectsCtx, pins: pinsCtx, connections } = useDashboard()
  const [prompt, setPrompt] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)

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

  // Pins grouped by project, in project order — one card per project.
  const pinGroups = useMemo(() => {
    const groups: { project: Project; pins: View[] }[] = []
    for (const project of projectsCtx.projects) {
      const pins = pinsCtx.pinnedViews.filter(p => p.projectId === project.id)
      if (pins.length > 0) groups.push({ project, pins })
    }
    return groups
  }, [projectsCtx.projects, pinsCtx.pinnedViews])

  const showWelcome = !projectsCtx.loading && projectsCtx.projects.length === 0
  // Skeleton stands in until BOTH projects (to group) and pins settle.
  const pinsLoading = projectsCtx.loading || pinsCtx.loading

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
      <div className="flex flex-col gap-6">
        {/* ── 1. Agent launcher ─────────────────────────────────────
            Button + ask-box live in ONE white card (not separated).
            `<ChatEmpty compact>` drops its own page padding so the
            card's `p-4` owns the spacing; `hideUserMcps` leaves only
            the "Connect MCPs" CTA. */}
        <section>
          <div className="rounded-2xl border border-stroke bg-white shadow-card p-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => launchAgent()}
              className="mb-3 inline-flex items-center gap-2.5 rounded-xl border border-stroke bg-white pl-1.5 pr-4 py-1.5 shadow-sm cursor-pointer hover:bg-hover-fill transition-colors"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-main text-grey-darkest">
                <ArrowRight size={13} weight="bold" />
              </span>
              <span className="text-sm font-semibold text-grey-darkest">Chat with Agent</span>
            </button>
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
            {/* ── 2. Projects ───────────────────────────────────────── */}
            <section>
              <h2 className={`px-1 mb-2 ${SECTION_LABEL}`}>Projects</h2>
              <MobileProjectsList projects={projectsCtx.projects} />
            </section>

            {/* Pinned-views skeleton while projects + pins load, so the
                section isn't a blank gap on launch. */}
            {pinsLoading && (
              <section>
                <div className="rounded-xl border border-stroke bg-white shadow-card p-4">
                  <PinnedViewsSkeleton singleColumn />
                </div>
              </section>
            )}

            {/* ── 3. Pinned views, one card per project ─────────────── */}
            {pinGroups.map(({ project, pins }) => (
              <section key={project.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/hub/projects/${project.id}/overview`)}
                  className="flex items-center gap-2 px-1 mb-2 cursor-pointer"
                >
                  <ProjectIcon websiteUrl={project.websiteUrl} size={20} pill />
                  <h2 className={SECTION_LABEL}>Pinned views</h2>
                </button>
                <div className="rounded-xl border border-stroke bg-white shadow-card p-4">
                  <PinnedViews
                    pins={pins}
                    unpinView={pinsCtx.unpinView}
                    onConnectionAssigned={pinsCtx.replacePin}
                    projects={projectsCtx.projects}
                    singleColumn
                  />
                </div>
              </section>
            ))}
          </>
        )}

        {/* ── 4. Help-us-improve suggest card (moved off the burger) ── */}
        <HelpImproveCard onSuggest={() => setSuggestOpen(true)} />
      </div>

      <SuggestFeatureDialog open={suggestOpen} onOpenChange={setSuggestOpen} />
    </div>
  )
}
