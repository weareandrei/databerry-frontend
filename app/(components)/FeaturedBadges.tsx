'use client'

/** Shared height so image + custom HTML badges align in one row. */
const FEATURED_BADGE_H = 'h-[54px]'

const FEATURED_BADGES = [
  {
    id: 'product-hunt',
    href: 'https://www.producthunt.com/products/databerry?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-databerry',
    label: 'Featured on Product Hunt',
    render: (decorative: boolean) => (
      // eslint-disable-next-line @next/next/no-img-element -- PH CDN not in images.remotePatterns
      <img
        alt={decorative ? '' : 'Databerry - Track all your business data in a single dashboard | Product Hunt'}
        width={250}
        height={54}
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1133651&theme=light&t=1779139221585"
        className={`${FEATURED_BADGE_H} w-auto`}
      />
    ),
  },
  {
    id: 'tiny-startups',
    href: 'https://www.tinystartups.com/startup/databerry',
    label: 'Launched on Tiny Startups',
    render: () => (
      <span
        className={`inline-flex ${FEATURED_BADGE_H} items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#3525E6,#D81FE0,#22B8F0)] px-3 text-white`}
      >
        <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden className="size-8 shrink-0">
          <path
            d="M50 6C52 32 68 48 94 50C68 52 52 68 50 94C48 68 32 52 6 50C32 48 48 32 50 6Z"
            fill="#ffffff"
          />
        </svg>
        <span className="flex flex-col justify-center leading-[1.1] text-left">
          <span className="font-mono text-[7px] font-semibold tracking-[0.18em] uppercase text-white/75">
            Launched on
          </span>
          <span className="text-[13px] font-extrabold tracking-[-0.025em] text-white">
            Tiny Startups
          </span>
          <span className="text-[8px] text-white/75">tinystartups.com</span>
        </span>
      </span>
    ),
  },
  {
    id: 'tinylaunch',
    href: 'https://www.tinylaunch.com/launch/14173',
    label: 'TinyLaunch Badge',
    render: (decorative: boolean) => (
      // eslint-disable-next-line @next/next/no-img-element -- external badge CDN
      <img
        alt={decorative ? '' : 'TinyLaunch Badge'}
        src="https://tinylaunch.com/tinylaunch_badge_1.svg"
        width={202}
        height={54}
        className={`${FEATURED_BADGE_H} w-auto`}
      />
    ),
  },
] as const

function FeaturedBadgeLink({
  badge,
  decorative = false,
}: {
  badge: (typeof FEATURED_BADGES)[number]
  decorative?: boolean
}) {
  return (
    <a
      href={badge.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex ${FEATURED_BADGE_H} shrink-0 items-center no-underline`}
      tabIndex={decorative ? -1 : undefined}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : badge.label}
    >
      {badge.render(decorative)}
    </a>
  )
}

/**
 * Social-proof badges. Desktop: centered static row.
 * Mobile: infinite horizontal marquee.
 */
export function FeaturedBadges() {
  const mobileTrack = [...FEATURED_BADGES, ...FEATURED_BADGES, ...FEATURED_BADGES]

  return (
    <div className="w-full">
      {/* Desktop — static, centered */}
      <div className="hidden md:flex items-center justify-center gap-4">
        {FEATURED_BADGES.map(badge => (
          <FeaturedBadgeLink key={badge.id} badge={badge} />
        ))}
      </div>

      {/* Mobile — infinite marquee */}
      <div className="md:hidden overflow-hidden" aria-label="Featured on">
        <div className="flex w-max animate-featured-badges-marquee gap-6 pr-6">
          {[0, 1].map(copy => (
            <div key={copy} className="flex shrink-0 items-center gap-6">
              {mobileTrack.map((badge, i) => (
                <FeaturedBadgeLink
                  key={`${copy}-${badge.id}-${i}`}
                  badge={badge}
                  decorative={copy === 1 || i >= FEATURED_BADGES.length}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
