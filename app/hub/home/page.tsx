'use client'

/**
 * Hub home — the workspace-level landing page.
 *
 * Layout (per the structural redesign):
 *   - Top bar: search (filters pinned views) + global date controls.
 *   - Centered agent launcher: a "Chat with Agent" button (opens the
 *     full-page `/hub/agent-chat`) above the "Ask anything" box.
 *     Submitting the box deep-links to `/hub/agent-chat?q=…`, which
 *     auto-sends the prompt — the conversation itself never happens
 *     on the home page.
 *   - Pinned views, grouped BY PROJECT — one labelled section per
 *     project (favicon + "Pinned views"), each rendering the shared
 *     `<PinnedViews>` lanes for that project's pins only.
 *
 * Gone from this page (moved, not lost):
 *   - The Dashboard/Agent toggle — replaced by the launcher + the
 *     dedicated agent routes. (The `DashboardAgentSwitch` component
 *     file survives because the landing-page demo still renders it.)
 *   - The all-projects grid — projects now live at
 *     `/hub/projects/[id]/overview`, reached via the icon rail.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from '@phosphor-icons/react'
import { useDashboard } from '@/contexts/DashboardContext'
import { HubTopBar } from '@/app/hub/(components)/HubTopBar'
import { PinnedViews } from '@/app/hub/home/(components)/PinnedViews'
import { WelcomeEmpty } from '@/app/hub/home/(components)/WelcomeEmpty'
import { ChatEmpty } from '@/app/hub/agent-chat/(components)/ChatEmpty'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { MobileHomeBody } from '@/app/hub/(components)/mobile/MobileHomeBody'
import type { Project } from '@/types/project'
import type { View } from '@/types/view'

export default function HomePage() {
  const router = useRouter()
  const { projects: projectsCtx, pins: pinsCtx, connections } = useDashboard()
  const [query, setQuery] = useState('')
  const [prompt, setPrompt] = useState('')

  // ── Search — filters pinned views (by view OR project name) ──────
  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const filteredPins = useMemo(() => {
    if (!isSearching) return pinsCtx.pinnedViews
    return pinsCtx.pinnedViews.filter(pin => {
      if (pin.name.toLowerCase().includes(normalizedQuery)) return true
      const owningProject = projectsCtx.projects.find(p => p.id === pin.projectId)
      return owningProject?.name.toLowerCase().includes(normalizedQuery) ?? false
    })
  }, [pinsCtx.pinnedViews, projectsCtx.projects, normalizedQuery, isSearching])

  // Group pins by project, in project order — each group becomes its
  // own labelled "Pinned views" section.
  const pinGroups = useMemo(() => {
    const groups: { project: Project; pins: View[] }[] = []
    for (const project of projectsCtx.projects) {
      const pins = filteredPins.filter(p => p.projectId === project.id)
      if (pins.length > 0) groups.push({ project, pins })
    }
    return groups
  }, [projectsCtx.projects, filteredPins])

  const mcpConnections = useMemo(
    () => connections.connections.filter(c => c.type === 'mcp'),
    [connections.connections],
  )

  // Submitting the launcher hands the prompt to the full-page agent
  // via the existing `?q=` deep-link (auto-sends on mount there).
  const launchAgent = (q?: string) => {
    const trimmed = (q ?? '').trim()
    router.push(
      trimmed ? `/hub/agent-chat?q=${encodeURIComponent(trimmed)}` : '/hub/agent-chat',
    )
  }

  const showWelcome = !projectsCtx.loading && projectsCtx.projects.length === 0

  return (
    <>
      {/* ─── Mobile layout (<md) ──────────────────────────────────── */}
      <div className="md:hidden h-[calc(100dvh-60px)] flex flex-col bg-main">
        <MobileTopBar variant="home" />
        {/* Compact agent entry — full chat lives on its own route. */}
        <div className="shrink-0 px-4 pt-3 pb-1">
          <button
            type="button"
            onClick={() => launchAgent()}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-stroke bg-white px-4 py-3 shadow-sm text-sm font-semibold text-grey-darkest cursor-pointer"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white">
              <ArrowRight size={12} weight="bold" />
            </span>
            Chat with Agent
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <MobileHomeBody />
        </div>
      </div>

      {/* ─── Desktop layout (md+) ─────────────────────────────────── */}
      <div className="hidden md:flex h-screen flex-col">
        <HubTopBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: 'Search or ask AI about your data',
          }}
        />

        {/* One white panel wraps the ENTIRE page body; the top bar +
            panel together fill the viewport (h-screen on the column)
            and only the panel's inside scrolls — the page itself
            never does. Same card chrome as the agent surface.
            `mx-4 mb-4` = the shared 16-px margin rhythm (aligns with
            the top bar's `px-4` and the project sidebar's `top-4 /
            bottom-4`). */}
        <div className="flex-1 min-h-0 mx-4 mb-4 bg-white rounded-2xl border border-stroke shadow-card overflow-y-auto">
          {showWelcome ? (
            <WelcomeEmpty onCreate={() => projectsCtx.openModal()} />
          ) : (
            <div className="flex flex-col gap-10 px-6 pt-10 pb-12">
              {/* ── Agent launcher ────────────────────────────────
                  Centered column: the "Chat with Agent" pill above
                  the ask box. The box is the SAME `<ChatEmpty>` the
                  agent pages use (input + disclaimer + MCP chips),
                  just without its heading — submitting routes to the
                  full-page chat with the prompt pre-sent. */}
              <section className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => launchAgent()}
                  className="mb-2 inline-flex items-center gap-2.5 rounded-xl border border-stroke bg-white pl-1.5 pr-4 py-1.5 shadow-sm cursor-pointer hover:bg-hover-fill transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-main text-grey-darkest">
                    <ArrowRight size={13} weight="bold" />
                  </span>
                  <span className="text-sm font-semibold text-grey-darkest">
                    Chat with Agent
                  </span>
                </button>
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

              {/* ── Pinned views, one section per project ──────────
                  Tiles sit directly on the panel (no nested white
                  cards — the page body IS the card now). */}
              {pinGroups.map(({ project, pins }) => (
                <section key={project.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/hub/projects/${project.id}/overview`)}
                    className="flex items-center gap-2 px-1 mb-4 cursor-pointer group"
                    title={`Open ${project.name}`}
                  >
                    <ProjectIcon websiteUrl={project.websiteUrl} size={22} pill />
                    <h2 className="text-xs font-medium uppercase tracking-wider text-grey-light group-hover:text-grey-darkest transition-colors">
                      Pinned views
                    </h2>
                  </button>
                  <PinnedViews
                    pins={pins}
                    unpinView={pinsCtx.unpinView}
                    onConnectionAssigned={pinsCtx.replacePin}
                    projects={projectsCtx.projects}
                  />
                </section>
              ))}

              {isSearching && pinGroups.length === 0 && (
                <div className="rounded-xl border border-dashed border-stroke bg-main/50 px-6 py-12 text-center">
                  <p className="text-sm text-grey-darkest font-medium">
                    No pinned views match &ldquo;{query}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-grey-darkest hover:bg-main transition-colors cursor-pointer"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
