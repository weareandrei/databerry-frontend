'use client'

/**
 * The `[project]/overview` page body: an optional folder-breadcrumb
 * row above `<ProjectBody>` (folders row + draggable views grid).
 * "Create view" lives in the `<ProjectSidebar>` now, not here.
 *
 * Renders chrome-free — the overview page provides the white panel
 * and the scroll container; the project's identity (icon + name +
 * 3-dots menu) lives in `<ProjectSidebar>`.
 *
 * History note: this used to be a 1,100-line multi-mode card (sticky
 * header + collapse) rendered per-project on the old all-projects
 * home page. That surface is gone; what remains is the standalone
 * overview body, with the state hook in `useProjectView.ts` and the
 * grid in `ProjectBodyViews.tsx`.
 */

import { ProjectViewBreadCrumbs } from './ProjectViewBreadCrumbs'
import { ProjectBody } from './ProjectBody'
import { useProjectView } from './useProjectView'
import type { Project } from '@/types/project'

interface ProjectViewProps {
  project: Project
  /**
   * Case-insensitive name filter applied to views + folders (the
   * overview page's search bar). Empty = no filter. While a filter
   * is active drag-reorder is disabled — persisting an order
   * computed from a filtered subset would corrupt the saved order.
   */
  filterQuery?: string
}

export function ProjectView({ project, filterQuery = '' }: ProjectViewProps) {
  const {
    views,
    loading,
    currentFolder,
    subFolders,
    isRange,
    dateFrom,
    dateTo,
    mode,
    tz,
    isEmpty,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleReorder,
    handleFolderClick,
    handleBack,
    foldersCtx,
  } = useProjectView(project)

  // Render-time filter — typing never refetches.
  const normalizedFilter = filterQuery.trim().toLowerCase()
  const visibleViews = normalizedFilter
    ? views.filter(v => v.name.toLowerCase().includes(normalizedFilter))
    : views
  const visibleFolders = normalizedFilter
    ? subFolders.filter(f => f.name.toLowerCase().includes(normalizedFilter))
    : subFolders

  return (
    <article data-project-id={project.id} className="relative flex flex-col">
      {/* Breadcrumb row — only inside a folder (the project name
          lives in the sidebar). At the project root there's no
          toolbar; the body's own padding owns the top spacing. */}
      {currentFolder && (
        <div className="px-5 pt-5 min-h-[36px] flex items-center">
          <ProjectViewBreadCrumbs project={project} folder={currentFolder} />
        </div>
      )}
      <ProjectBody
        projectId={project.id}
        currentFolder={currentFolder}
        handleBack={handleBack}
        subFolders={visibleFolders}
        foldersCtx={foldersCtx}
        loading={loading}
        handleFolderClick={handleFolderClick}
        views={visibleViews}
        isRange={isRange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        mode={mode}
        tz={tz}
        handleUntrack={handleUntrack}
        handlePin={handlePin}
        handleConnectionAssigned={handleConnectionAssigned}
        handleReorder={handleReorder}
        isEmpty={isEmpty}
        sortable={!normalizedFilter}
      />
    </article>
  )
}
