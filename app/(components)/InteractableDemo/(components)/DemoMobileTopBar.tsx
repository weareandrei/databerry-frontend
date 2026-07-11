'use client'

import { useState } from 'react'
import { ArrowLeft, CaretDown, List, Plus } from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import {
  AskAgentNavIcon,
  ConnectionsNavIcon,
  OverviewNavIcon,
  TimelineNavIcon,
} from '@/app/hub/(components)/Sidebar/(components)/SidebarWorkspaceIcons'
import { DemoGlobalDateModeDropdown } from './DemoGlobalDateControls'
import { useDemoContext } from './context/DemoContext'
import type { DemoPage } from './context/DemoContext'

const UNSUPPORTED = "This feature isn't available in the demo."

type Variant =
  | { variant: 'home' }
  | {
      variant: 'project'
      projectName: string
      projectWebsiteUrl?: string | null
      onBack: () => void
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
    projects,
    currentProjectId,
    pageOpen,
    goToPage,
    showNotice,
    dialogContainer,
    globalDate,
    setGlobalDateMode,
  } = useDemoContext()
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const currentProject = currentProjectId
    ? projects.find(p => p.id === currentProjectId) ?? null
    : null

  const navigate = (page: DemoPage, projectId: string | null = null) => {
    goToPage(page, projectId)
    setBurgerOpen(false)
  }

  const showDateButton = props.variant === 'home' || props.variant === 'project'

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-[60px] shrink-0 items-center gap-2 border-b border-stroke bg-white px-3">
        {props.variant === 'project' ? (
          <button
            type="button"
            onClick={props.onBack}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-foreground shadow-pill"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
        ) : props.variant === 'page' && props.onBack ? (
          <button
            type="button"
            onClick={props.onBack}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-foreground shadow-pill"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setBurgerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-foreground shadow-pill"
          >
            <List size={16} weight="bold" />
          </button>
        )}

        {props.variant === 'project' && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ProjectIcon websiteUrl={props.projectWebsiteUrl} size={20} pill={false} />
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

      <BottomDialog open={burgerOpen} onOpenChange={setBurgerOpen} container={dialogContainer}>
        <BottomDialog.Page title="Menu" bodyVariant="plain">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-stroke bg-white shadow-card overflow-hidden">
              <MobileNavRow
                label="Home"
                active={pageOpen === 'home'}
                onClick={() => navigate('home')}
                divider
              />
              <MobileNavRow
                label="Connections"
                active={pageOpen === 'connections' && !currentProjectId}
                onClick={() => navigate('connections', null)}
              />
            </div>

            {currentProject && (
              <section>
                <p className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-subtle">
                  {currentProject.name}
                </p>
                <div className="rounded-xl border border-stroke bg-white shadow-card overflow-hidden">
                  <MobileNavRow
                    icon={<OverviewNavIcon />}
                    label="Overview"
                    active={pageOpen === 'overview'}
                    onClick={() => navigate('overview', currentProject.id)}
                    divider
                  />
                  <MobileNavRow
                    icon={<ConnectionsNavIcon />}
                    label="Connections"
                    active={pageOpen === 'connections' && currentProjectId === currentProject.id}
                    onClick={() => navigate('connections', currentProject.id)}
                    divider
                  />
                  <MobileNavRow
                    icon={<TimelineNavIcon />}
                    label="Timeline"
                    onClick={() => {
                      navigate('overview', currentProject.id)
                      requestAnimationFrame(() => {
                        document.getElementById('project-timeline')?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        })
                      })
                    }}
                    divider
                  />
                  <MobileNavRow
                    icon={<AskAgentNavIcon />}
                    label="Ask agent"
                    active={pageOpen === 'agent'}
                    onClick={() => navigate('agent', currentProject.id)}
                  />
                </div>
              </section>
            )}

            <section>
              <p className="px-1 mb-2 text-[10px] font-medium uppercase tracking-wider text-subtle">
                Projects
              </p>
              <div className="rounded-xl border border-stroke bg-white shadow-card overflow-hidden">
                {projects.map(project => (
                  <MobileNavRow
                    key={project.id}
                    icon={<ProjectIcon websiteUrl={project.websiteUrl} size={22} pill />}
                    label={project.name}
                    active={currentProjectId === project.id}
                    onClick={() => navigate('overview', project.id)}
                    divider
                  />
                ))}
                <MobileNavRow
                  icon={<Plus size={14} weight="bold" />}
                  label="New project"
                  onClick={() => {
                    showNotice(UNSUPPORTED)
                    setBurgerOpen(false)
                  }}
                />
              </div>
            </section>
          </div>
        </BottomDialog.Page>
      </BottomDialog>
    </>
  )
}

function MobileNavRow({
  icon,
  label,
  active,
  divider,
  onClick,
}: {
  icon?: React.ReactNode
  label: string
  active?: boolean
  divider?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        active ? 'bg-hover-fill' : 'hover:bg-hover-fill'
      } ${divider ? 'border-b border-stroke/60' : ''}`}
    >
      {icon ? (
        <span className="flex w-6 shrink-0 items-center justify-center text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <span
        className={`flex-1 truncate text-sm ${
          active ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
