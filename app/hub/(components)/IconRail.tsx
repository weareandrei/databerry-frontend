'use client'

/**
 * Left-most icon-only rail — the always-present navigation spine of
 * the new hub layout (the old 256-px labelled sidebar is gone; its
 * project/folder detail moved into the per-project `<ProjectSidebar>`
 * that mounts only inside `/hub/projects/[id]/*`).
 *
 * Top to bottom:
 *   - Databerry logo (→ /hub/home)
 *   - Home
 *   - Connections (the ALL-connections page — per-project pages show
 *     only their own)
 *   - divider
 *   - one icon per project (favicon via `<ProjectIcon>`), active when
 *     the URL is inside that project
 *   - `+` → CreateProjectModal (plan-limit gated)
 *   - bottom: Help us improve (suggest a feature), Subscription
 *     (opens the tier picker), Settings gear, Sign out
 *
 * Desktop-only (`hidden md:flex`) — mobile keeps the burger-sheet
 * navigation (`MobileTopBar` → `SidebarContents`).
 */

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { House, SquaresFour, Plus, Gear, CreditCard, SignOut } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/ProjectIcon'
import { TierPickerSheet } from '@/app/hub/(components)/Sidebar/TierPickerSheet'
import { SuggestFeatureRailButton } from '@/app/hub/(components)/SuggestFeature'
import { useDashboard } from '@/contexts/DashboardContext'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useTierPickerListener } from '@/hooks/useTierPicker'
import { useAccount } from '@/hooks/useAccount'
import { useAuth } from '@/contexts/AuthContext'
import { EVENT, trackEvent } from '@/lib/posthog'

export const ICON_RAIL_WIDTH_CLASS = 'w-16'

function RailButton({
  active,
  danger,
  label,
  onClick,
  children,
}: {
  active?: boolean
  /** Sign-out affordance — adds a red hover so it reads as a "leave"
   *  action rather than navigation. */
  danger?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-colors cursor-pointer ${
        active
          ? 'bg-white border-stroke shadow-sm text-grey-darkest'
          : danger
            ? // Resting gray chip → hover lifts to white + shadow.
              'bg-hover-fill border-transparent text-grey-dark hover:bg-white hover:border-stroke hover:shadow-sm hover:text-destructive'
            : 'bg-hover-fill border-transparent text-grey-dark hover:bg-white hover:border-stroke hover:shadow-sm'
      }`}
    >
      {children}
    </button>
  )
}

export function IconRail() {
  const router = useRouter()
  const pathname = usePathname()
  const { projects: projectsCtx } = useDashboard()
  const { enforceProjectLimit } = usePlanLimits()
  const { signOut } = useAuth()
  // EFFECTIVE plan drives the picker's "current tier" highlight (a
  // trialing user reads as Starter).
  const { planId } = useAccount()
  // The rail is the SOLE owner of the tier picker now — it's mounted
  // on every hub page (and on mobile too, just `hidden`, so its
  // portaled sheet still works there). The Subscription button opens
  // it directly; the global `openTierPicker()` broadcast (limit-error
  // toasts, the "Manage plan" menu item) opens it via the listener
  // below.
  const [tierOpen, setTierOpen] = useState(false)
  useTierPickerListener(() => {
    trackEvent(EVENT.TIER_PICKER_OPENED, { source: 'broadcast' })
    setTierOpen(true)
  })

  const isProjectActive = (id: string) => pathname.startsWith(`/hub/projects/${id}`)

  return (
    <aside
      className={`hidden md:flex flex-col items-center fixed top-0 left-2 h-screen ${ICON_RAIL_WIDTH_CLASS} z-30 py-6 gap-2`}
    >
      {/* Logo — doubles as the "take me home" affordance. */}
      <button
        type="button"
        onClick={() => router.push('/hub/home')}
        aria-label="Databerry home"
        className="mb-3 cursor-pointer"
      >
        <Image
          src="/databerry_logo_v2.svg"
          alt="Databerry"
          width={30}
          height={30}
          className="rounded-lg"
          priority
        />
      </button>

      <RailButton
        label="Home"
        active={pathname.startsWith('/hub/home') || pathname.startsWith('/hub/agent-chat')}
        onClick={() => router.push('/hub/home')}
      >
        <House size={18} weight="bold" />
      </RailButton>
      <RailButton
        label="Connections"
        active={pathname.startsWith('/hub/connections')}
        onClick={() => router.push('/hub/connections')}
      >
        <SquaresFour size={18} weight="bold" />
      </RailButton>

      <div className="w-7 border-t border-stroke my-2" />

      {/* Project icons — scrolls if the list outgrows the rail. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-2 [scrollbar-width:none]">
        {projectsCtx.projects.map(project => (
          <RailButton
            key={project.id}
            label={project.name}
            active={isProjectActive(project.id)}
            onClick={() => router.push(`/hub/projects/${project.id}/overview`)}
          >
            <ProjectIcon websiteUrl={project.websiteUrl} size={20} pill={false} />
          </RailButton>
        ))}
        <RailButton
          label="New project"
          onClick={() => {
            if (!enforceProjectLimit()) return
            projectsCtx.openModal()
          }}
        >
          <Plus size={16} weight="bold" />
        </RailButton>
      </div>

      {/* Bottom utility group — suggest a feature, subscription,
          settings, sign out. The suggest button is brand-orange (white
          glyph) and reveals the full "Help us improve" card on hover. */}
      <div className="flex flex-col items-center gap-2">
        <SuggestFeatureRailButton />
        <RailButton
          label="Subscription"
          onClick={() => {
            trackEvent(EVENT.TIER_PICKER_OPENED, { source: 'rail_button' })
            setTierOpen(true)
          }}
        >
          <CreditCard size={18} weight="bold" />
        </RailButton>
        <RailButton
          label="Settings"
          active={pathname.startsWith('/hub/settings')}
          onClick={() => router.push('/hub/settings')}
        >
          <Gear size={18} weight="bold" />
        </RailButton>
        <RailButton label="Sign out" danger onClick={() => void signOut()}>
          <SignOut size={18} weight="bold" />
        </RailButton>
      </div>

      {/* Picker sheet — portals to the document root, so the rail's
          `hidden md:flex` doesn't clip it. */}
      <TierPickerSheet open={tierOpen} onOpenChange={setTierOpen} currentPlanId={planId} />
    </aside>
  )
}
