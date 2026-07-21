'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, CaretRight, ChatsTeardrop } from '@phosphor-icons/react'
import { ProjectIcon } from '@/app/hub/(components)/icons/ProjectIcon'
import { projectDisplayLabel } from '@/app/hub/project/(components)/projectViewUtils'
import type { Project } from '@/types/project'

/**
 * Breadcrumbs for the agent-chat surface.
 * Workspace route: Home ← Ask agent
 * Project route:   Home ← Project › Ask agent
 */
export function AgentChatBreadcrumbs({ project }: { project?: Project | null }) {
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => router.push('/hub/home')}
        className="shrink-0 cursor-pointer text-subtle transition-colors hover:text-muted-foreground"
        aria-label="Home"
      >
        <ArrowLeft size={16} weight="regular" />
      </button>

      <span className="h-4 w-px shrink-0 bg-stroke" aria-hidden="true" />

      {project ? (
        <>
          <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
            <ProjectIcon websiteUrl={project.websiteUrl} size={20} pill={false} />
            <span className="truncate text-sm font-semibold text-foreground">
              {projectDisplayLabel(project)}
            </span>
          </div>

          <CaretRight size={10} weight="bold" className="shrink-0 text-subtle" aria-hidden="true" />

          <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
            <ChatsTeardrop size={16} weight="bold" className="shrink-0 text-foreground" />
            <span className="truncate text-sm font-semibold text-foreground">Ask agent</span>
          </div>
        </>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <ChatsTeardrop size={16} weight="bold" className="shrink-0 text-foreground" />
          <span className="truncate text-sm font-semibold text-foreground">Ask agent</span>
        </div>
      )}
    </>
  )
}
