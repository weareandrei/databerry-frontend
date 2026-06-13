'use client'

import { CaretRight } from '@phosphor-icons/react'
import type { Project } from '@/types/project'
import type { Folder } from '@/types/folder'

interface ProjectViewBreadCrumbsProps {
  project: Project
  folder: Folder | null
}

export function ProjectViewBreadCrumbs({ project, folder }: ProjectViewBreadCrumbsProps) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-base font-bold text-grey-darkest shrink-0 truncate max-w-[140px]">
        {project.name}
      </span>
      {folder && (
        <>
          <CaretRight size={10} weight="bold" className="text-grey-light shrink-0" />
          <span className="text-sm text-grey-dark truncate">{folder.name}</span>
        </>
      )}
    </div>
  )
}
