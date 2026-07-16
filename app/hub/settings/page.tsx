'use client'

import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar/MobileTopBar'
import { DashboardHeader } from '@/app/hub/(components)/navigation/DashboardHeader'
import { BaseView } from '@/app/hub/(components)/views/(components)/BaseView'
import { ViewBody } from '@/app/hub/(components)/views/(components)/ViewBody'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
import { SettingsPageBreadcrumbs } from './(components)/SettingsPageBreadcrumbs'
import { TrafficSourceSelector } from './(components)/TrafficSourceSelector'
import {
  TimezonePicker,
  useScrollToTimezoneAnchor,
} from './(components)/TimezonePicker'

export default function SettingsPage() {
  const timezoneSectionRef = useScrollToTimezoneAnchor()

  return (
    <div className="flex h-[calc(100dvh-60px)] flex-col bg-white lg:h-screen">
      <MobileTopBar variant="page" title="Settings" />

      <DashboardHeader
        breadcrumbs={<SettingsPageBreadcrumbs />}
        showDateSelect={false}
      />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-8 pt-3 lg:px-6 lg:pb-12 lg:pt-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-sm text-subtle">
              Global preferences shared across every project.
            </p>
          </header>

          <ViewWrapper className="flex flex-col gap-3">
            <BaseView
              body={
                <ViewBody>
                  <h2 className="mb-1 text-sm font-semibold text-foreground">Traffic source</h2>
                  <p className="mb-3 text-xs text-subtle">
                    Which connection provides the stacked visitors chart and sources list. When set to
                    Auto, we pick Google Analytics if available, else PostHog. Conversion events are
                    configured per-project from each overview chart&rsquo;s menu.
                  </p>
                  <TrafficSourceSelector />
                </ViewBody>
              }
            />

            <BaseView
              body={
                <ViewBody>
                  <section id="timezone" ref={timezoneSectionRef}>
                    <h2 className="mb-1 text-sm font-semibold text-foreground">Timezone</h2>
                    <p className="mb-3 text-xs text-subtle">
                      Used for date ranges and the &ldquo;Now&rdquo; indicator across every view.
                      Changing this re-fetches all open tiles to align with your selected zone&rsquo;s
                      wall-clock day.
                    </p>
                    <TimezonePicker />
                  </section>
                </ViewBody>
              }
            />
          </ViewWrapper>
        </div>
      </div>
    </div>
  )
}
