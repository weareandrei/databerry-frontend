/**
 * Reusable breadcrumb trail (e.g. `Home / Compare / Databerry vs Amplitude`).
 *
 * Server-component friendly — pure presentation, no client hooks. Pass an
 * ordered `items` list; the LAST item is treated as the current page
 * (rendered as plain, emphasized text with `aria-current="page"`), every
 * earlier item with an `href` becomes a link.
 *
 * `tone` switches the palette so the same component reads well on the
 * orange/dark landing canvas (`onDark`, the default) and on white panels
 * (`onLight`). `align` controls horizontal placement; `className` is for
 * outer spacing (margins).
 *
 * The visible trail is decorative for SEO — pages that care about machine
 * readability should ALSO emit `BreadcrumbList` JSON-LD (the comparison
 * pages already do).
 */

import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  /** Omit on the current page (the last item). */
  href?: string
}

const TONE = {
  onDark: {
    link: 'text-white/70 hover:text-white',
    current: 'text-white',
    separator: 'text-white/40',
  },
  onLight: {
    link: 'text-muted-foreground hover:text-foreground',
    current: 'text-foreground',
    separator: 'text-subtle',
  },
} as const

const ALIGN = {
  start: 'justify-start',
  center: 'justify-center',
} as const

export const Breadcrumbs = ({
  items,
  tone = 'onDark',
  align = 'center',
  className = '',
}: {
  items: BreadcrumbItem[]
  tone?: keyof typeof TONE
  align?: keyof typeof ALIGN
  className?: string
}) => {
  if (items.length === 0) return null

  const t = TONE[tone]

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium ${ALIGN[align]}`}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-x-2">
              {item.href && !isLast ? (
                <Link href={item.href} className={`${t.link} transition-colors`}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={t.current}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className={t.separator}>
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
