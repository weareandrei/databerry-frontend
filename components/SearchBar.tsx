'use client'

/**
 * Dashboard search input — shared by the header toolbar and in-page
 * filters (e.g. People). Matches the dashboard header: `h-8` on md,
 * `h-10` on lg+, `rounded-lg`, `bg-surface`, clear button.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/** Default max width of the header search bar — scales up with viewport. */
export const SEARCH_BAR_MAX_WIDTH_CLASS =
  'max-w-[min(100%,240px)] md:max-w-[300px] lg:max-w-[360px] xl:max-w-[420px]'

function useIsApplePlatform() {
  const [isApple, setIsApple] = useState(false)
  useEffect(() => {
    setIsApple(/Mac|iPhone|iPad|iPod/.test(navigator.platform))
  }, [])
  return isApple
}

/** Keyboard-hint chip for the dashboard header search (`⌘F` / `Ctrl+F`). */
export function SearchFocusShortcutHint({ className }: { className?: string }) {
  const isApple = useIsApplePlatform()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm bg-white px-1 py-0.5 text-[10px] font-medium text-subtle shadow-control lg:px-1.5 lg:text-[11px]',
        className,
      )}
      aria-hidden="true"
    >
      {isApple ? '⌘F' : 'Ctrl+F'}
    </span>
  )
}

export interface SearchBarProps {
  value: string
  onChange?: (next: string) => void
  placeholder?: string
  /** When true, spans the full container width (no 420px cap). */
  fullWidth?: boolean
  /** Visual preset. `default` is the dashboard header style. */
  variant?: 'default'
  readOnly?: boolean
  disabled?: boolean
  /** Trailing chrome — e.g. the `⌘F` hint on the dashboard header. */
  rightSlot?: ReactNode
  /**
   * When true, `⌘F` (macOS) / `Ctrl+F` (Windows/Linux) focuses this
   * input. Intended for the dashboard header search only.
   */
  focusOnShortcut?: boolean
  className?: string
  'aria-label'?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search or ask AI about your data',
  fullWidth = false,
  variant = 'default',
  readOnly = false,
  disabled = false,
  rightSlot,
  focusOnShortcut = false,
  className,
  'aria-label': ariaLabel,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const interactive = Boolean(onChange) && !readOnly && !disabled

  const focusInput = () => {
    if (interactive) inputRef.current?.focus()
  }

  useEffect(() => {
    if (!focusOnShortcut || !interactive) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      if (e.key.toLowerCase() !== 'f') return

      const target = e.target as HTMLElement | null
      if (
        target &&
        target !== inputRef.current &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusOnShortcut, interactive])

  return (
    <label
      htmlFor={inputId}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return
        focusInput()
      }}
      className={cn(
        variant === 'default' &&
          'flex h-8 w-full items-center gap-2 rounded-lg border border-stroke bg-surface px-3 lg:h-10 lg:gap-2.5 lg:px-4',
        interactive && 'cursor-text',
        !fullWidth && SEARCH_BAR_MAX_WIDTH_CLASS,
        className,
      )}
    >
      <MagnifyingGlass
        weight="bold"
        className="size-3.5 shrink-0 text-muted-foreground lg:size-[15px]"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={value}
        onChange={interactive ? e => onChange!(e.target.value) : undefined}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="flex-1 min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-subtle disabled:cursor-not-allowed lg:text-sm"
      />
      {interactive && value.length > 0 ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onChange!('')
            inputRef.current?.focus()
          }}
          aria-label="Clear search"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          <X weight="bold" className="size-3 lg:size-[13px]" />
        </button>
      ) : (
        rightSlot
      )}
    </label>
  )
}

export function SearchBarSkeleton({
  fullWidth = false,
  className,
}: {
  fullWidth?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'h-8 w-full rounded-lg bg-black/[0.05] animate-pulse lg:h-10',
        !fullWidth && SEARCH_BAR_MAX_WIDTH_CLASS,
        className,
      )}
      aria-hidden="true"
    />
  )
}
