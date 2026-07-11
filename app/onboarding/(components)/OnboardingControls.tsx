'use client'

/**
 * Small presentational primitives shared by every onboarding step:
 * the primary call-to-action button, the muted "skip" link, and the
 * multi-select row used on the tools + views steps.
 */

import { ArrowRight, Check } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { cn } from '@/lib/utils'

export function PrimaryCta({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold px-16 py-3.5 ring-4 ring-brand/20 transition-all hover:ring-brand/30 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
    >
      {label}
      <ArrowRight
        size={16}
        weight="bold"
        className="transition-transform group-hover:translate-x-0.5"
      />
    </button>
  )
}

export function SkipLink({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
    >
      {label}
      <ArrowRight size={12} weight="bold" />
    </button>
  )
}

export function SelectableRow({
  iconType,
  label,
  desc,
  selected,
  onToggle,
}: {
  iconType: string
  label: string
  desc?: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer',
        selected
          ? 'border-primary/50 bg-primary/[0.04]'
          : 'border-stroke bg-white hover:bg-hover-fill',
      )}
    >
      <span
        className={cn(
          'shrink-0 grid place-items-center w-4 h-4 rounded-full border-2 transition-colors',
          selected ? 'border-primary bg-primary text-white' : 'border-stroke',
        )}
      >
        {selected && <Check size={10} weight="bold" />}
      </span>
      <ConnectionIcon type={iconType} size={18} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground leading-tight">
          {label}
        </span>
        {desc && (
          <span className="block text-xs text-subtle truncate leading-tight mt-0.5">
            {desc}
          </span>
        )}
      </span>
    </button>
  )
}
