'use client'

import { useEffect } from 'react'
import { FoldersView } from '@/app/hub/(components)/views/FoldersView'
import { WidgetsView } from '@/app/hub/(components)/views/WidgetsView'
import { ProjectOverviewWidget } from '@/app/hub/project/(components)/ProjectOverviewWidget'
import { PeopleWidget } from '@/app/hub/project/(components)/PeopleWidget'
import { ProjectScrollBody } from '@/app/hub/project/(components)/ProjectScrollBody'
import { getProjectTilesEmptyMessage } from '@/app/hub/project/(components)/projectViewUtils'
import { useProjectView } from '@/app/hub/project/(components)/useProjectView'
import type { Project } from '@/types/project'

interface ProjectViewProps {
  project: Project
  folderId: string | null
}

/** Full project page view — folders, overview, people, and widget grid. */
export function ProjectView({ project, folderId }: ProjectViewProps) {
  const {
    loading,
    visibleFolders,
    isRange,
    dateFrom,
    dateTo,
    mode,
    tz,
    visibleViews,
    chartView,
    sourcesView,
    showOverviewBlock,
    handleUntrack,
    handlePin,
    handleConnectionAssigned,
    handleReorder,
    openCreateViewModal,
    openFolder,
    foldersCtx,
  } = useProjectView(project, folderId)

  useEffect(() => {
    if (folderId != null || typeof window === 'undefined') return
    if (window.location.hash !== '#timeline') return
    const el = document.getElementById('project-timeline')
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [folderId, project.id])

  return (
    <ProjectScrollBody onCreateView={openCreateViewModal}>
      <FoldersView
        folders={visibleFolders}
        onDeleteFolder={foldersCtx.deleteFolder}
        onRenameFolder={foldersCtx.renameFolder}
        onCreateSubfolder={foldersCtx.openModal}
        onCreateFolder={() => foldersCtx.openModal(folderId, project.id)}
        onFolderClick={openFolder}
      />

      {folderId == null && (
        <ProjectOverviewWidget
          showOverviewBlock={showOverviewBlock}
          loading={loading}
          chartView={chartView}
          sourcesView={sourcesView}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          onUntrack={handleUntrack}
        />
      )}

      {folderId == null && <PeopleWidget projectId={project.id} />}

      <WidgetsView
        widgets={visibleViews}
        loading={loading}
        emptyMessage={getProjectTilesEmptyMessage(isRange)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        mode={mode}
        tz={tz}
        isRange={isRange}
        onUntrack={handleUntrack}
        onPin={handlePin}
        onConnectionAssigned={handleConnectionAssigned}
        onReorder={handleReorder}
      />
    </ProjectScrollBody>
  )
}
