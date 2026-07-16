'use client'

import { ProjectPeople } from './ProjectPeople'
import { ViewWrapper } from '@/app/hub/(components)/views/ViewWrapper'

/** People timeline surface — not a grid widget tile. */
export function PeopleWidget({ projectId }: { projectId: string }) {
  return (
    <ViewWrapper id="project-timeline">
      <section className="rounded-2xl border border-stroke bg-white p-5 shadow-card">
        <ProjectPeople projectId={projectId} />
      </section>
    </ViewWrapper>
  )
}
