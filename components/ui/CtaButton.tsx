import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/**
 * The landing page's call-to-action button — the hero's "Get started",
 * made reusable. A solid rounded button sitting in a ring tinted with a
 * quarter of its own colour, with a soft shadow and a trailing arrow.
 *
 * Every CTA on the landing page is this component: hero, Connect, Pricing,
 * FAQ, Contact, the mobile demo teaser, the footer and the navbar. Only the
 * label changes, plus — where the surface needs it — the colour (`tone`),
 * the width (`fullWidth`), the size (`size`) and the icon.
 */

const TONES = {
  /** Black — the hero's own colours. For the orange canvas and white bars. */
  black: { ring: 'bg-black/25', pill: 'bg-black text-white' },
  /** Brand orange, for white surfaces. */
  brand: { ring: 'bg-secondary/25', pill: 'bg-secondary text-white' },
  /** White, for the orange footer. */
  white: { ring: 'bg-white/25', pill: 'bg-white text-black' },
} as const

const SIZES = {
  /** The hero's size. */
  md: 'gap-3 px-16 py-3 text-base',
  /** For the navbar, where the hero's size doesn't fit. */
  sm: 'gap-2 px-5 py-2 text-sm',
} as const

interface CommonProps {
  tone?: keyof typeof TONES
  size?: keyof typeof SIZES
  /** Stretch across the container — forms and pricing cards. */
  fullWidth?: boolean
  /** Trailing icon. Defaults to the hero's arrow; `null` for none. */
  icon?: React.ReactNode
  /** Classes for the outer ring: its placement in the layout. */
  className?: string
  children: React.ReactNode
}

interface AsLink extends CommonProps {
  href: string
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
}

interface AsButton extends CommonProps {
  href?: undefined
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export type CtaButtonProps = AsLink | AsButton

export const CtaButton = (props: CtaButtonProps) => {
  const {
    tone = 'black',
    size = 'md',
    fullWidth = false,
    icon = <ArrowRight size={size === 'sm' ? 14 : 18} weight="bold" />,
    className,
    children,
  } = props
  const colours = TONES[tone]

  return (
    <span
      className={cn(
        'items-center rounded-2xl p-1',
        fullWidth ? 'flex w-full' : 'inline-flex',
        colours.ring,
        className,
      )}
    >
      <Inner
        {...props}
        className={cn(
          'group inline-flex items-center justify-center rounded-2xl font-medium shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition-[opacity,scale] duration-150 ease-out hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60',
          SIZES[size],
          colours.pill,
          fullWidth && 'w-full',
        )}
      >
        {children}
        {icon && (
          <span
            aria-hidden
            className="flex transition-transform duration-200 ease-out group-hover:translate-x-0.5"
          >
            {icon}
          </span>
        )}
      </Inner>
    </span>
  )
}

const Inner = (props: CtaButtonProps & { className: string }) => {
  const { className, children } = props

  if (props.href === undefined) {
    return (
      <button
        type={props.type ?? 'button'}
        disabled={props.disabled}
        onClick={props.onClick}
        className={className}
      >
        {children}
      </button>
    )
  }

  // A link to a spot on the same page stays a plain anchor, so the browser
  // does the scrolling itself.
  if (props.href.startsWith('#')) {
    return (
      <a href={props.href} onClick={props.onClick} className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href={props.href} onClick={props.onClick} className={className}>
      {children}
    </Link>
  )
}
