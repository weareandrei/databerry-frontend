'use client'

/**
 * Zero-projects welcome panel.
 *
 * Rendered by `home/page.tsx` when the signed-in user has no projects
 * yet — instead of showing the "Pinned views" / "Projects" labels with
 * nothing under them. Dispatches the existing `CreateProjectModal` via
 * `projects.openModal()` (the same path the sidebar `+` button uses).
 */

import { Cube, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface WelcomeEmptyProps {
  onCreate: () => void
}

export function WelcomeEmpty({ onCreate }: WelcomeEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white border border-stroke shadow-card flex items-center justify-center mb-5">
        <Cube size={22} weight="bold" className="text-primary" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Welcome to your Databerry dashboard
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
        Databerry brings everything you track day-to-day —
        Stripe, Google Analytics, PostHog, Calendly — into one place.
        Each project gets its own dashboard. Create your first one to get
        started.
      </p>
      <Button
        onClick={onCreate}
        className="bg-primary hover:bg-primary/90 text-white rounded-full px-5"
      >
        <Plus size={14} weight="bold" className="mr-1.5" />
        Create your first project
      </Button>
    </div>
  )
}
