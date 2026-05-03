'use client'

import { Gear } from '@phosphor-icons/react'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { TrafficSourceSelector } from './(components)/TrafficSourceSelector'
import {
  TimezonePicker,
  useScrollToTimezoneAnchor,
} from './(components)/TimezonePicker'

export default function SettingsPage() {
  // When the URL has `#timezone` (e.g. clicked from the sidebar 3-dots menu),
  // scroll the timezone section into view on mount. The hook returns a ref
  // we attach to the section.
  const timezoneSectionRef = useScrollToTimezoneAnchor()

  return (
    <div className="p-8 flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
        <SectionHeader
          icon={
            <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
              <Gear size={14} weight="bold" className="text-grey-darkest" />
            </span>
          }
          title={<span className="text-base font-bold text-grey-darkest">Settings</span>}
          subtitle="Global preferences shared across every project."
        />

        <div className="p-5 space-y-8">
          {/* Traffic source */}
          <section>
            <h3 className="text-sm font-semibold text-grey-darkest mb-1">Traffic source</h3>
            <p className="text-xs text-grey-light mb-3">
              Which connection provides the stacked visitors chart and sources list. When set to
              Auto, we pick Google Analytics if available, else PostHog. Conversion events are
              configured per-project from each overview chart&rsquo;s menu.
            </p>
            <TrafficSourceSelector />
          </section>

          {/* Timezone — `id` enables the deep-link from the sidebar 3-dots
              menu (`/hub/settings#timezone`). */}
          <section id="timezone" ref={timezoneSectionRef}>
            <h3 className="text-sm font-semibold text-grey-darkest mb-1">Timezone</h3>
            <p className="text-xs text-grey-light mb-3">
              Used for date ranges and the &ldquo;Now&rdquo; indicator across every view. Changing
              this re-fetches all open tiles to align with your selected zone&rsquo;s wall-clock day.
            </p>
            <TimezonePicker />
          </section>
        </div>
      </div>
    </div>
  )
}
