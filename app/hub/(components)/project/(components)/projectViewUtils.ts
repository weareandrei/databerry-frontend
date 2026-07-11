import type { Folder } from '@/types/folder'
import type { Project } from '@/types/project'
import type { View } from '@/types/view'

export const PROJECT_VIEW_CARD =
  'bg-white rounded-2xl border border-stroke shadow-card'

/** Grey tray around each project-body block (folders, overview, people, tiles). */
export const PROJECT_VIEW_SURFACE_WRAP = 'rounded-xl bg-surface p-4'

/** White pane inside the overview tray (chart / sources split). */
export const PROJECT_OVERVIEW_PANE =
  'bg-white rounded-2xl border border-stroke shadow-card flex flex-col min-h-[420px] overflow-hidden'

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

export function deriveOverviewComposite(visibleViews: View[]) {
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
