/**
 * Typography primitives for the legal pages. Pulled out into a small
 * component family so the two pages stay visually identical without
 * scattering Tailwind class strings across both files.
 *
 * Type scale matches the marketing site: Bricolage for the page title
 * (same font Hero uses), Inter for everything else. Sizes step down
 * conservatively — these pages are dense by nature, so we err on the
 * side of "compact and scan-able" rather than "magazine-style
 * spacious".
 */

import type { ReactNode } from 'react'

/** Page title — the only h1 on the page. */
export function LegalTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
      style={{ fontFamily: 'var(--font-bricolage)' }}
    >
      {children}
    </h1>
  )
}

/**
 * "Last updated" timestamp directly under the title. Greyed, small,
 * non-interactive — same affordance every reputable legal page uses.
 */
export function LastUpdated({ date }: { date: string }) {
  return <p className="mt-3 text-sm text-subtle">Last updated: {date}</p>
}

/** Lead paragraph that sits between the title cluster and the first §. */
export function LegalLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 text-base leading-7 text-muted-foreground">{children}</p>
  )
}

/**
 * Section heading. Numbered ("1. Acceptance of Terms", "2. …") at the
 * call sites — the number isn't a prop because hand-writing it next to
 * the heading text keeps re-ordering trivial (just edit the strings).
 */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

/** Sub-heading inside a section. Used sparingly. */
export function LegalSubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-4 text-sm font-semibold text-foreground">
      {children}
    </h3>
  )
}

/** Bulleted list with the same line-height + colour as the prose. */
export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 text-sm leading-6 text-muted-foreground marker:text-subtle">
      {children}
    </ul>
  )
}
