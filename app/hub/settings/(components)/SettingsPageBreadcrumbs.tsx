'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Gear } from '@phosphor-icons/react'

export function SettingsPageBreadcrumbs() {
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => router.push('/hub/home')}
        className="shrink-0 cursor-pointer text-subtle transition-colors hover:text-muted-foreground"
        aria-label="Home"
      >
        <ArrowLeft size={16} weight="regular" />
      </button>

      <span className="h-4 w-px shrink-0 bg-stroke" aria-hidden="true" />

      <div className="flex min-w-0 items-center gap-2">
        <Gear size={16} weight="bold" className="shrink-0 text-foreground" />
        <span className="truncate text-sm font-semibold text-foreground">Settings</span>
      </div>
    </>
  )
}
