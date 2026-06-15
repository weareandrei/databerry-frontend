'use client'

import { Gear } from '@phosphor-icons/react'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
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
    /*
      Single-tree layout — the body content + ref attachment lives in
      one place, chrome forks via Tailwind responsive prefixes:
        - `<MobileTopBar>` is internally `md:hidden`           → mobile-only
        - `<SectionHeader>` wrapper is `hidden md:block`       → desktop-only
        - Padding `px-4 pt-4 pb-8 md:pl-4 md:pt-6 md:pr-6 md:pb-8`
          (`md:pl-4` = the same 16-px left gap home/project pages keep
           from the rail; matched on `/hub/connections` too)
      The dual-tree pattern used on `/hub/home` doesn't work here because
      the deep-link timezone ref would attach to two `<section>` instances
      and clobber itself on `useRef` (the last attach wins; the visible
      element on the user's breakpoint may not be that one).

      Mobile sticky-top-bar behaviour: `<main>` (`hub/layout.tsx`) is
      `flex flex-col min-h-screen` so a `shrink-0` top bar sits at the
      top and the body's `flex-1 overflow-y-auto md:overflow-visible
      md:flex-none` fills the remaining space (mobile) or lays out
      naturally (desktop, overflow handled by the page).
    */
    <>
      <MobileTopBar variant="page" title="Settings" />
      <div className="flex-1 overflow-y-auto md:overflow-visible md:flex-none px-4 pt-4 pb-8 md:pl-4 md:pt-6 md:pr-6 md:pb-8 md:max-w-[1600px]">
        <div className="flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
          {/* Desktop-only header — title is in `<MobileTopBar>` on
              phones. `hidden md:block` keeps the chrome behaviour
              identical to pre-mobile. */}
          <div className="hidden md:block">
            <SectionHeader
              icon={
                <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
                  <Gear size={14} weight="bold" className="text-grey-darkest" />
                </span>
              }
              title={<span className="text-base font-bold text-grey-darkest">Settings</span>}
              subtitle="Global preferences shared across every project."
              // `bg-main` was previously the SectionHeader default; pass
              // it explicitly now that the component no longer hardcodes
              // a bg.
              className="bg-main"
            />
          </div>

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

            {/* Timezone — `id` enables the deep-link from the sidebar
                3-dots menu (`/hub/settings#timezone`). */}
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
    </>
  )
}
