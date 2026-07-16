'use client'

/**
 * Mobile navigation body for the burger bottom-sheet.
 *
 * Layout (Untitled-UI style):
 *   - Large primary nav rows (Overview / Connections / …)
 *   - Divider
 *   - Full-width footer buttons: Settings, Subscription, Sign out
 *
 * No folders — those live on the project overview page only.
 * Project switching lives in the sheet header's `<ProjectSelect>`.
 */

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  CreditCard,
  Gear,
  House,
  SignOut,
} from '@phosphor-icons/react'
import {
  AskAgentNavIcon,
  ConnectionsNavIcon,
  OverviewNavIcon,
  TimelineNavIcon,
} from './(components)/SidebarWorkspaceIcons'
import { useAuth } from '@/contexts/AuthContext'
import { openTierPicker } from '@/hooks/useTierPicker'
import { cn } from '@/lib/utils'

export function MobileNav({
  onNavigate,
  bounded = true,
  projectId,
}: {
  onNavigate?: () => void
  bounded?: boolean
  /** When set, render the project workspace links. */
  projectId?: string
}) {
  const { signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)

  const base = projectId ? `/hub/project/${projectId}` : null
  const isActive = (sub: string) => (base ? pathname === `${base}${sub}` : false)
  const isProjectRoot =
    base != null && (pathname === base || pathname === `${base}/`)

  const go = (href: string) => {
    router.push(href)
    onNavigate?.()
  }

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
      onNavigate?.()
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-white text-foreground',
        bounded && 'flex-1 min-h-0 overflow-hidden',
      )}
    >
      <nav className="flex flex-col">
        {base ? (
          <>
            <MobileNavLink
              label="Overview"
              icon={<OverviewNavIcon />}
              active={isProjectRoot}
              onClick={() => go(base)}
            />
            <MobileNavLink
              label="Connections"
              icon={<ConnectionsNavIcon />}
              active={isActive('/connections')}
              onClick={() => go(`${base}/connections`)}
            />
            <MobileNavLink
              label="Timeline"
              icon={<TimelineNavIcon />}
              active={isActive('/timeline')}
              onClick={() => go(`${base}/timeline`)}
            />
            <MobileNavLink
              label="Ask agent"
              icon={<AskAgentNavIcon />}
              active={isActive('/agent-chat')}
              onClick={() => go(`${base}/agent-chat`)}
            />
          </>
        ) : (
          <>
            <MobileNavLink
              label="Home"
              icon={<House size={20} weight="regular" />}
              active={pathname === '/hub/home'}
              onClick={() => go('/hub/home')}
            />
            <MobileNavLink
              label="Connections"
              icon={<ConnectionsNavIcon />}
              active={
                pathname === '/hub/connections' ||
                pathname.startsWith('/hub/connections/')
              }
              onClick={() => go('/hub/connections')}
            />
          </>
        )}
      </nav>

      <div className="my-5 border-t border-stroke" />

      <div className="flex flex-col gap-3 pb-2">
        <MobileFooterButton
          label="Settings"
          icon={<Gear size={18} weight="regular" />}
          variant="outline"
          onClick={() => go('/hub/settings')}
        />
        <MobileFooterButton
          label="Subscription"
          icon={<CreditCard size={18} weight="regular" />}
          variant="outline"
          onClick={() => {
            openTierPicker()
            onNavigate?.()
          }}
        />
        <MobileFooterButton
          label={signingOut ? 'Signing out…' : 'Sign out'}
          icon={<SignOut size={18} weight="regular" />}
          variant="solid"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        />
      </div>
    </div>
  )
}

function MobileNavLink({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-base font-medium transition-colors cursor-pointer',
        active
          ? 'bg-hover-fill text-foreground'
          : 'text-foreground hover:bg-hover-fill/70',
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

function MobileFooterButton({
  label,
  icon,
  variant,
  onClick,
  disabled,
}: {
  label: string
  icon: React.ReactNode
  variant: 'outline' | 'solid'
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors cursor-pointer disabled:opacity-60',
        variant === 'solid'
          ? 'bg-foreground text-white hover:bg-foreground/90'
          : 'border border-stroke bg-white text-foreground hover:bg-hover-fill',
      )}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      {label}
    </button>
  )
}
