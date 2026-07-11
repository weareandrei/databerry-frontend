'use client'

import { useMemo, useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { ChatEmpty } from '@/app/hub/agent-chat/(components)/ChatEmpty'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { useDemoContext } from '../context/DemoContext'
import { DemoDashboardHeader } from '../DemoDashboardHeader'
import { DemoMobileTopBar } from '../DemoMobileTopBar'
import { DemoPinnedViews } from '../projects/DemoPinnedViews'

export function DemoHomePage() {
  const { views, projects, goToPage } = useDemoContext()
  const [query, setQuery] = useState('')
  const [prompt, setPrompt] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const pinned = views.filter(
    v =>
      v.pinned &&
      v.kind !== 'overview-chart' &&
      v.kind !== 'overview-sources',
  )

  const filteredPins = useMemo(() => {
    if (!isSearching) return pinned
    return pinned.filter(pin => {
      if (pin.name.toLowerCase().includes(normalizedQuery)) return true
      const owningProject = projects.find(p => p.id === pin.projectId)
      return owningProject?.name.toLowerCase().includes(normalizedQuery) ?? false
    })
  }, [pinned, projects, normalizedQuery, isSearching])

  const pinGroups = useMemo(() => {
    const groups: { projectId: string; projectName: string; websiteUrl: string | null; pins: typeof pinned }[] = []
    for (const project of projects) {
      const projectPins = filteredPins.filter(p => p.projectId === project.id)
      if (projectPins.length > 0) {
        groups.push({
          projectId: project.id,
          projectName: project.name,
          websiteUrl: project.websiteUrl ?? null,
          pins: projectPins,
        })
      }
    }
    return groups
  }, [projects, filteredPins])

  const launchAgent = (q?: string) => {
    void q
    goToPage('agent')
  }

  return (
    <>
      <div className="md:hidden h-full flex flex-col bg-surface">
        <DemoMobileTopBar variant="home" />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-8 px-4 pt-6 pb-10">
            <section className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => launchAgent()}
                className="mb-2 inline-flex items-center gap-2.5 rounded-xl border border-stroke bg-white pl-1.5 pr-4 py-1.5 shadow-sm cursor-pointer hover:bg-hover-fill transition-colors"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface text-foreground">
                  <ArrowRight size={13} weight="bold" />
                </span>
                <span className="text-sm font-semibold text-foreground">Chat with Agent</span>
              </button>
              <div className="w-full">
                <ChatEmpty
                  value={prompt}
                  onChange={setPrompt}
                  onSubmit={() => launchAgent(prompt)}
                  sending={false}
                  mcpConnections={[]}
                  hideTitle
                  compact
                  hideUserMcps
                  mcpCtaLabel="Connect MCPs"
                  onConfigMcpClick={() => goToPage('connections')}
                />
              </div>
            </section>

            {pinGroups.map(group => (
              <section key={group.projectId}>
                <button
                  type="button"
                  onClick={() => goToPage('overview', group.projectId)}
                  className="flex items-center gap-2 px-1 mb-3 cursor-pointer group"
                >
                  <ProjectIcon websiteUrl={group.websiteUrl} size={20} pill />
                  <h2 className="text-xs font-medium uppercase tracking-wider text-subtle group-hover:text-foreground transition-colors">
                    Pinned views
                  </h2>
                </button>
                <DemoPinnedViews pins={group.pins} />
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden md:flex h-full flex-col">
        <DemoDashboardHeader searchValue={query} onSearch={setQuery} />
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-10 px-6 pt-8 pb-12">
            <section className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => launchAgent()}
                className="mb-2 inline-flex items-center gap-2.5 rounded-xl border border-stroke bg-white pl-1.5 pr-4 py-1.5 shadow-sm cursor-pointer hover:bg-hover-fill transition-colors"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface text-foreground">
                  <ArrowRight size={13} weight="bold" />
                </span>
                <span className="text-sm font-semibold text-foreground">Chat with Agent</span>
              </button>
              <div className="w-full max-w-3xl">
                <ChatEmpty
                  value={prompt}
                  onChange={setPrompt}
                  onSubmit={() => launchAgent(prompt)}
                  sending={false}
                  mcpConnections={[]}
                  hideTitle
                  onConfigMcpClick={() => goToPage('connections')}
                />
              </div>
            </section>

            {pinGroups.map(group => (
              <section key={group.projectId}>
                <button
                  type="button"
                  onClick={() => goToPage('overview', group.projectId)}
                  className="flex items-center gap-2 px-1 mb-4 cursor-pointer group"
                >
                  <ProjectIcon websiteUrl={group.websiteUrl} size={22} pill />
                  <h2 className="text-xs font-medium uppercase tracking-wider text-subtle group-hover:text-foreground transition-colors">
                    Pinned views
                  </h2>
                </button>
                <DemoPinnedViews pins={group.pins} />
              </section>
            ))}

            {isSearching && pinGroups.length === 0 && (
              <div className="rounded-xl border border-dashed border-stroke bg-surface/50 px-6 py-12 text-center">
                <p className="text-sm text-foreground font-medium">
                  No pinned views match &ldquo;{query}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
