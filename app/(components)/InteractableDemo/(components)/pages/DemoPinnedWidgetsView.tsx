'use client'

/**
 * Demo twin of hub `PinnedWidgetsView` — grey tray, white card,
 * per-project headers + value-tile grid. Fed by DemoContext pins
 * instead of the live pins API.
 */

import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { BaseView } from '@/app/hub/(components)/views/(components)/BaseView'
import { ViewBody } from '@/app/hub/(components)/views/(components)/ViewBody'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'
import { demoProjectLabel } from '../demoProjectUtils'
import { DemoLiveValueWidget } from '../DemoLiveValueWidget'
import { useDemoContext } from '../context/DemoContext'
import type { DemoProject, DemoView } from '../context/DemoContext'

function DemoPinnedSectionHeader({
  project,
  onOpenProject,
}: {
  project: DemoProject
  onOpenProject: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpenProject}
      className="mb-4 flex cursor-pointer items-start gap-3 text-left"
      title={`Open ${demoProjectLabel(project)}`}
    >
      <ProjectIcon
        websiteUrl={project.websiteUrl}
        logoSrc={project.logoSrc}
        size={36}
        pill={false}
      />
      <span>
        <span className="block text-sm font-semibold text-foreground">
          {demoProjectLabel(project)}
        </span>
        <span className="mt-0.5 block text-xs text-subtle">Pinned views</span>
      </span>
    </button>
  )
}

function DemoPinnedGrid({
  pins,
  projectLabel,
  singleColumn,
}: {
  pins: DemoView[]
  projectLabel: string
  singleColumn?: boolean
}) {
  const { togglePin } = useDemoContext()

  return (
    <div
      className={
        singleColumn
          ? 'flex flex-col gap-3'
          : 'grid gap-y-6 gap-x-4 grid-flow-dense grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }
      style={singleColumn ? undefined : { gridAutoRows: '140px' }}
    >
      {pins.map(pin => (
        <DemoLiveValueWidget
          key={pin.id}
          view={pin}
          projectName={projectLabel}
          onPin={() => togglePin(pin.id)}
        />
      ))}
    </div>
  )
}

interface DemoPinnedWidgetsViewProps {
  singleColumn?: boolean
}

export function DemoPinnedWidgetsView({ singleColumn = false }: DemoPinnedWidgetsViewProps) {
  const { views, projects, goToPage } = useDemoContext()

  const pins = views.filter(
    v =>
      v.pinned &&
      v.kind !== 'overview-chart' &&
      v.kind !== 'overview-sources',
  )

  const sections = projects
    .map(project => ({
      project,
      pins: pins.filter(p => p.projectId === project.id),
    }))
    .filter(section => section.pins.length > 0)

  if (sections.length === 0) return null

  return (
    <ViewWrapper>
      <BaseView
        body={
          <ViewBody>
            <div className="flex flex-col gap-8">
              {sections.map(({ project, pins: projectPins }) => (
                <div key={project.id}>
                  <DemoPinnedSectionHeader
                    project={project}
                    onOpenProject={() => goToPage('overview', project.id)}
                  />
                  <DemoPinnedGrid
                    pins={projectPins}
                    projectLabel={demoProjectLabel(project)}
                    singleColumn={singleColumn}
                  />
                </div>
              ))}
            </div>
          </ViewBody>
        }
      />
    </ViewWrapper>
  )
}
