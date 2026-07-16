import type { Folder } from '@/types/folder'
import type { Project } from '@/types/project'
import type { Widget } from '@/types/widget'

/**
 * Overview composite layout — column below 1200px (chart full width,
 * sources underneath), side-by-side at wider widths.
 */
export const PROJECT_OVERVIEW_LAYOUT_GRID =
  'grid grid-cols-1 gap-4 min-[1200px]:grid-cols-[1fr_minmax(240px,320px)]'

/** White pane inside the overview tray (chart / sources split). */
export const PROJECT_OVERVIEW_CHART_PANE =
  'bg-white rounded-2xl border border-stroke shadow-card flex flex-col min-h-[420px] overflow-hidden'

export const PROJECT_OVERVIEW_SOURCES_PANE =
  'bg-white rounded-2xl border border-stroke shadow-card flex flex-col min-h-[420px] overflow-hidden'

/** @deprecated Use `PROJECT_OVERVIEW_CHART_PANE` / `PROJECT_OVERVIEW_SOURCES_PANE`. */
export const PROJECT_OVERVIEW_PANE = PROJECT_OVERVIEW_CHART_PANE

export function projectDisplayLabel(project: Project): string {
  const url = project.websiteUrl?.trim()
  if (url) {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`
    try {
      const host = new URL(withScheme).host.replace(/^www\./i, '')
      if (host) return host
    } catch {
      // fall through to name
    }
  }
  return project.name
}

const OVERVIEW_VIEW_TYPES = new Set(['project_overview', 'project_overview_sources'])

export function isOverviewWidgetType(type: Widget['type']): boolean {
  return OVERVIEW_VIEW_TYPES.has(type)
}

export function filterNonOverviewPins(pins: Widget[]): Widget[] {
  return pins.filter(p => !isOverviewWidgetType(p.type))
}

export function deriveOverviewComposite(visibleViews: Widget[]) {
  const chartView = visibleViews.find(v => v.type === 'project_overview')
  const sourcesView = visibleViews.find(v => v.type === 'project_overview_sources')
  const hasComposite = !!(chartView && sourcesView)
  const tileCount = visibleViews.filter(
    v => v.id !== chartView?.id && v.id !== sourcesView?.id,
  ).length

  return { chartView, sourcesView, hasComposite, tileCount }
}

export function getProjectTilesEmptyMessage(isRange: boolean) {
  if (isRange) return 'No data recorded for this date range.'
  return 'No other views yet. Use “Create view” in the sidebar to add one.'
}

export function getProjectBackPath(
  projectId: string,
  currentFolder: Folder | null,
) {
  const base = `/hub/project/${projectId}`
  return currentFolder?.parentId
    ? `${base}/folder/${currentFolder.parentId}`
    : base
}
