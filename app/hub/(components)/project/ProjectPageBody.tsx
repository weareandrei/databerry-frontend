'use client'

import { FolderGridSection } from './(components)/FolderGridSection'
import { ProjectOverviewSection } from './(components)/ProjectOverviewSection'
import { ProjectPeopleSection } from './(components)/ProjectPeopleSection'
import { ProjectScrollBody } from './(components)/ProjectScrollBody'
import { ProjectTilesSection } from './(components)/ProjectTilesSection'
import { getProjectTilesEmptyMessage } from './(components)/projectViewUtils'
import { useProjectView } from './(components)/useProjectView'
import type { Project } from '@/types/project'

interface ProjectPageBodyProps {
  project: Project
  /** `null` = project root; a folder id = inside that folder. */
  folderId: string | null
}

export function ProjectPageBody({ project, folderId }: ProjectPageBodyProps) {
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

  return (
    <ProjectScrollBody onCreateView={openCreateViewModal}>
      <FolderGridSection
        folders={visibleFolders}
        onDeleteFolder={foldersCtx.deleteFolder}
        onRenameFolder={foldersCtx.renameFolder}
        onCreateSubfolder={foldersCtx.openModal}
        onCreateFolder={() => foldersCtx.openModal(folderId, project.id)}
        onFolderClick={openFolder}
      />

      {folderId == null && (
        <ProjectOverviewSection
          showOverviewBlock={showOverviewBlock}
          loading={loading}
          chartView={chartView}
          sourcesView={sourcesView}
          dateFrom={dateFrom}
          dateTo={dateTo}
          mode={mode}
          onUntrack={handleUntrack}
          onPin={handlePin}
        />
      )}

      {folderId == null && <ProjectPeopleSection projectId={project.id} />}

      <ProjectTilesSection
        views={visibleViews}
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
