'use client'

import { ProjectPeople } from './ProjectPeople'
import { PROJECT_VIEW_CARD, PROJECT_VIEW_SURFACE_WRAP } from './projectViewUtils'

interface ProjectPeopleSectionProps {
  projectId: string
}

export function ProjectPeopleSection({ projectId }: ProjectPeopleSectionProps) {
  return (
    <div id="project-timeline" className={PROJECT_VIEW_SURFACE_WRAP}>
      <section className={`${PROJECT_VIEW_CARD} p-5`}>
        <ProjectPeople projectId={projectId} />
      </section>
    </div>
  )
}
