'use client'

/**
 * Sample widgets for the landing page's showcases — the real hub components
 * fed with demo data. Shared by the Connect and Features sections so the
 * same Stripe week or Google Analytics week reads identically in both.
 */

import { useEffect, useState } from 'react'
import { LiveValueWidget } from '@/app/hub/(components)/widgets/live-value/LiveValueWidget'
import type { Widget } from '@/types/widget'

/**
 * True once the element has come within a screen of the viewport, and from
 * then on. A showcase waits for this before mounting its widgets, for two
 * reasons. The charts cost real time to build, so they are built just
 * before they are needed rather than all at page load. And widget text
 * depends on the visitor — time zone (meeting times), locale (number
 * separators), today's date ("last seen 7mo ago") — so it must never be
 * rendered on the server, where those answers are different.
 */
export const useNearViewport = (ref: React.RefObject<Element | null>) => {
  const [near, setNear] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || near) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true)
      },
      { rootMargin: '100% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, near])

  return near
}

/**
 * Put this on the element that wraps a showcase's widgets. `dashboard` is
 * the marker class the hub and the interactive demo put on their widget
 * surfaces; it is kept here to match. Each tile's action cluster — the ⋮ menu
 * (a 24px square trigger) and its info tooltip — is hidden: nothing in it
 * can work on a marketing page, and the room goes to the tile's name.
 * Other dropdowns, like Sentry's filters, stay.
 */
export const SHOWCASE_WIDGETS =
  'dashboard [&_div:has(>.w-6[data-slot=dropdown-menu-trigger])]:hidden'

// Tile names are kept short on purpose: two tiles share a phone-width row,
// which leaves each name about 80px before it truncates.

export const demoWidget = (
  name: string,
  connectionType: string,
  type: string,
  value: string | null = null,
): Widget => {
  return {
    id: `${connectionType}-${type}-${name}`,
    name,
    projectId: 'id1',
    folderId: '',
    connectionId: 'preview',
    connectionType,
    type,
    config: {},
    value,
    isPinned: false,
    userId: 'preview',
    createdAt: '',
  }
}

/** A single-number tile, in the hub's compact header size. */
export const DemoTile = ({ view }: { view: Widget }) => {
  return <LiveValueWidget view={view} dense />
}

const total = (points: { value: number }[]) => points.reduce((sum, point) => sum + point.value, 0)

// Each chart's tallest bar sits just under a round axis maximum, so the bars
// fill the plot. (The axis rounds up hard: a $10.4k peak gets a $20k axis.)

/** Stripe gross volume by day, in cents. */
export const STRIPE_WEEK = [
  { label: 'Mon', value: 480000 },
  { label: 'Tue', value: 620000 },
  { label: 'Wed', value: 540000 },
  { label: 'Thu', value: 730000 },
  { label: 'Fri', value: 840000 },
  { label: 'Sat', value: 410000 },
  { label: 'Sun', value: 450000 },
]
export const STRIPE_WEEK_TOTAL = total(STRIPE_WEEK)

/** Google Analytics sessions by day. */
export const GA_WEEK = [
  { label: 'Mon', value: 1820 },
  { label: 'Tue', value: 2140 },
  { label: 'Wed', value: 2390 },
  { label: 'Thu', value: 2610 },
  { label: 'Fri', value: 2980 },
  { label: 'Sat', value: 1520 },
  { label: 'Sun', value: 1360 },
]
export const GA_WEEK_TOTAL = total(GA_WEEK)

/** Stripe gross volume through one day, in cents. */
export const STRIPE_DAY = [
  { label: '9am', value: 62000 },
  { label: '10am', value: 118000 },
  { label: '11am', value: 94000 },
  { label: '12pm', value: 171000 },
  { label: '1pm', value: 143000 },
  { label: '2pm', value: 208000 },
  { label: '3pm', value: 156000 },
  { label: '4pm', value: 90000 },
]
export const STRIPE_DAY_TOTAL = total(STRIPE_DAY)
