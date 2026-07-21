'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  CaretDown,
  CreditCard,
  Gear,
  House,
  List,
  SignOut,
} from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import {
  AskAgentNavIcon,
  ConnectionsNavIcon,
  OverviewNavIcon,
  TimelineNavIcon,
} from '@/app/hub/(components)/navigation/(components)/SidebarWorkspaceIcons'
import { DemoGlobalDateModeDropdown } from './DemoGlobalDateControls'
import { DemoProjectSelect } from './DemoProjectSelect'
import { useDemoContext } from './context/DemoContext'
import type { DemoPage } from './context/DemoContext'
import { cn } from '@/lib/utils'

const UNSUPPORTED = "This feature isn't available in the demo."

type Variant =
  | { variant: 'home' }
  | {
      variant: 'project'
      projectName: string
      projectWebsiteUrl?: string | null
      projectLogoSrc?: string | null
    }
  | {
      variant: 'page'
      title: string
      rightSlot?: React.ReactNode
      onBack?: () => void
    }

function modeLabel(mode: 'daily' | 'weekly' | 'monthly'): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

export function DemoMobileTopBar(props: Variant) {
  const {
    currentProjectId,
    pageOpen,
    goToPage,
    showNotice,
    dialogContainer,
    globalDate,
  } = useDemoContext()
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const navigate = (page: DemoPage, projectId: string | null = null) => {
    goToPage(page, projectId)
    setBurgerOpen(false)
  }

  const showDateButton = props.variant === 'home' || props.variant === 'project'
  const backHandler = props.variant === 'page' ? props.onBack : undefined
  const showsBurger = !backHandler
  const showProjectMenu =
    Boolean(currentProjectId) &&
    (props.variant === 'project' ||
      pageOpen === 'overview' ||
      pageOpen === 'timeline' ||
      pageOpen === 'agent' ||
      (pageOpen === 'connections' && Boolean(currentProjectId)))

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex h-[60px] shrink-0 items-center gap-2 border-b border-stroke bg-white px-3">
        {showsBurger ? (
          <button
            type="button"
            onClick={() => setBurgerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-foreground shadow-pill"
          >
            <List size={16} weight="bold" />
          </button>
        ) : (
          <button
            type="button"
            onClick={backHandler}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-foreground shadow-pill"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
        )}

        {props.variant === 'project' && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ProjectIcon
              websiteUrl={props.projectWebsiteUrl}
              logoSrc={props.projectLogoSrc}
              size={20}
              pill={false}
            />
            <span className="truncate text-sm font-semibold text-foreground">
              {props.projectName}
            </span>
          </div>
        )}

        {props.variant === 'page' && (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {props.title}
          </span>
        )}

        {props.variant === 'home' && <div className="flex-1" />}

        {showDateButton ? (
          <button
            type="button"
            onClick={() => setDateOpen(true)}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-stroke bg-white px-2.5 text-xs font-medium text-foreground shadow-sm"
          >
            {modeLabel(globalDate.mode)}
            <CaretDown size={10} weight="bold" className="text-subtle" />
          </button>
        ) : (
          props.variant === 'page' && props.rightSlot
        )}
      </header>

      <BottomDialog open={dateOpen} onOpenChange={setDateOpen} container={dialogContainer}>
        <BottomDialog.Page title="Date range" bodyVariant="plain">
          <div className="flex justify-center py-2">
            <DemoGlobalDateModeDropdown />
          </div>
        </BottomDialog.Page>
      </BottomDialog>

      <BottomDialog
        open={burgerOpen}
        onOpenChange={setBurgerOpen}
        container={dialogContainer}
        className="bg-white"
      >
        <BottomDialog.Page
          bodyVariant="plain"
          headerLeft={
            <div
              className="w-fit max-w-full min-w-0"
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              <DemoProjectSelect />
            </div>
          }
        >
          <div className="flex flex-col bg-white">
            <nav className="flex flex-col">
              {showProjectMenu && currentProjectId ? (
                <>
                  <DemoNavLink
                    label="Overview"
                    icon={<OverviewNavIcon />}
                    active={pageOpen === 'overview'}
                    onClick={() => navigate('overview', currentProjectId)}
                  />
                  <DemoNavLink
                    label="Connections"
                    icon={<ConnectionsNavIcon />}
                    active={pageOpen === 'connections'}
                    onClick={() => navigate('connections', currentProjectId)}
                  />
                  <DemoNavLink
                    label="Timeline"
                    icon={<TimelineNavIcon />}
                    active={pageOpen === 'timeline'}
                    onClick={() => navigate('timeline', currentProjectId)}
                  />
                  <DemoNavLink
                    label="Ask agent"
                    icon={<AskAgentNavIcon />}
                    active={pageOpen === 'agent'}
                    onClick={() => navigate('agent', currentProjectId)}
                  />
                </>
              ) : (
                <>
                  <DemoNavLink
                    label="Home"
                    icon={<House size={20} weight="regular" />}
                    active={pageOpen === 'home'}
                    onClick={() => navigate('home')}
                  />
                  <DemoNavLink
                    label="Connections"
                    icon={<ConnectionsNavIcon />}
                    active={pageOpen === 'connections' && !currentProjectId}
                    onClick={() => navigate('connections', null)}
                  />
                </>
              )}
            </nav>

            <div className="my-5 border-t border-stroke" />

            <div className="flex flex-col gap-3 pb-2">
              <DemoFooterButton
                label="Settings"
                icon={<Gear size={18} weight="regular" />}
                variant="outline"
                onClick={() => {
                  showNotice(UNSUPPORTED)
                  setBurgerOpen(false)
                }}
              />
              <DemoFooterButton
                label="Subscription"
                icon={<CreditCard size={18} weight="regular" />}
                variant="outline"
                onClick={() => {
                  showNotice(UNSUPPORTED)
                  setBurgerOpen(false)
                }}
              />
              <DemoFooterButton
                label="Sign out"
                icon={<SignOut size={18} weight="regular" />}
                variant="solid"
                onClick={() => {
                  showNotice(UNSUPPORTED)
                  setBurgerOpen(false)
                }}
              />
            </div>
          </div>
        </BottomDialog.Page>
      </BottomDialog>
    </>
  )
}

function DemoNavLink({
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

function DemoFooterButton({
  label,
  icon,
  variant,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  variant: 'outline' | 'solid'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold transition-colors cursor-pointer',
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
