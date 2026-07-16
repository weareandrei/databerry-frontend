'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChatEmpty } from '@/app/hub/agent-chat/(components)/ChatEmpty'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
import { HomeGreetingContent } from '@/app/hub/home/(components)/HomeGreetingHeader'
import { CountryFlag } from '@/components/CountryFlag'
import { useDemoContext, buildOverviewChart } from '../context/DemoContext'
import { MOCK_OVERVIEW_CHARTS } from '../demoMocks'
import {
  detectCountryFromTimezone,
  detectViewerCountryCode,
} from '../detectViewerCountry'
import { DemoDashboardHeader } from '../DemoDashboardHeader'
import { DemoMobileTopBar } from '../DemoMobileTopBar'
import { DemoHomeProjectMiniCard } from './DemoHomeProjectMiniCard'
import { DemoPinnedWidgetsView } from './DemoPinnedWidgetsView'

const UNSUPPORTED = "This feature isn't available in the demo."

function formatVisitors(value: number): string {
  return value.toLocaleString('en-US')
}

function formatRevenue(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function HomeGreeting({
  prompt,
  onPromptChange,
  onLaunchAgent,
  onOpenConnections,
  compact,
}: {
  prompt: string
  onPromptChange: (next: string) => void
  onLaunchAgent: (q?: string) => void
  onOpenConnections: () => void
  compact?: boolean
}) {
  const { globalDate, projects, timeSeries } = useDemoContext()
  // Seed from timezone so the flag isn't blank while IP resolves —
  // never from locale (`en-GB` ≠ living in the UK).
  const [countryCode, setCountryCode] = useState<string | null>(() =>
    detectCountryFromTimezone(),
  )

  useEffect(() => {
    let cancelled = false
    void detectViewerCountryCode().then(code => {
      if (!cancelled && code) setCountryCode(code)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const { revenueLabel, visitorsLabel } = useMemo(() => {
    let visitors = 0
    let revenue = 0
    for (const project of projects) {
      const chart =
        timeSeries.length === 0
          ? MOCK_OVERVIEW_CHARTS[project.id] ?? null
          : buildOverviewChart(
              project.id,
              globalDate,
              timeSeries,
              'visitors',
              'revenue',
            )
      visitors += chart?.totalPrimary ?? 0
      revenue += chart?.totalSecondary ?? 0
    }
    return {
      revenueLabel: formatRevenue(revenue),
      visitorsLabel: formatVisitors(visitors),
    }
  }, [projects, globalDate, timeSeries])

  return (
    <section className="flex flex-col items-center gap-4">
      <HomeGreetingContent
        title={
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2">
            <span>Hi, user from</span>
            {countryCode ? (
              // 1.5× the default `md` flag (20px → 30px)
              <CountryFlag code={countryCode} size="md" className="!w-[30px]" />
            ) : (
              <span aria-hidden>🌍</span>
            )}
          </span>
        }
        mode={globalDate.mode}
        compact={compact}
        revenueLabel={revenueLabel}
        visitorsLabel={visitorsLabel}
      />
      <div className={compact ? 'w-full' : 'w-full max-w-3xl'}>
        <ChatEmpty
          value={prompt}
          onChange={onPromptChange}
          onSubmit={() => onLaunchAgent(prompt)}
          sending={false}
          mcpConnections={[]}
          hideTitle
          compact={compact}
          hideUserMcps={compact}
          mcpCtaLabel={compact ? 'Connect MCPs' : undefined}
          onConfigMcpClick={onOpenConnections}
        />
      </div>
    </section>
  )
}

/** Mini project cards — stack on mobile, 2-up from `xl`. */
function DemoProjectsSummary() {
  const { projects, goToPage } = useDemoContext()

  return (
    <ViewWrapper>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {projects.map(project => (
          <DemoHomeProjectMiniCard
            key={project.id}
            project={project}
            onOpenProject={() => goToPage('overview', project.id)}
          />
        ))}
      </div>
    </ViewWrapper>
  )
}

export function DemoHomePage() {
  const { goToPage, showNotice } = useDemoContext()
  const [prompt, setPrompt] = useState('')

  const launchAgent = (q?: string) => {
    void q
    goToPage('agent')
  }

  return (
    <>
      <div className="lg:hidden h-full flex flex-col bg-white">
        <DemoMobileTopBar variant="home" />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-8 px-3 pt-6 pb-10">
            <HomeGreeting
              prompt={prompt}
              onPromptChange={setPrompt}
              onLaunchAgent={launchAgent}
              onOpenConnections={() => goToPage('connections')}
              compact
            />
            <DemoProjectsSummary />
            <DemoPinnedWidgetsView singleColumn />
          </div>
        </div>
      </div>

      <div className="hidden lg:flex h-full flex-col">
        <DemoDashboardHeader
          showProjectSelectDropdown
          showCreateProjectButton
          onCreateProject={() => showNotice(UNSUPPORTED)}
        />
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-10 px-6 pt-8 pb-12">
            <HomeGreeting
              prompt={prompt}
              onPromptChange={setPrompt}
              onLaunchAgent={launchAgent}
              onOpenConnections={() => goToPage('connections')}
            />
            <DemoProjectsSummary />
            <DemoPinnedWidgetsView />
          </div>
        </div>
      </div>
    </>
  )
}
