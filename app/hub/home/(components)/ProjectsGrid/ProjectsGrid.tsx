import { useSelector } from 'react-redux'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { ProjectView } from './ProjectView/ProjectView'
import type { Project } from '@/types/project'
import type { RootState } from '@/store'

interface ProjectsGridProps {
  projects: Project[]
  loading?: boolean
}

/**
 * Vertical list of project cards. Each `<ProjectView>` brings its own
 * card chrome (border + rounded + shadow); we just space them out
 * with `gap-5`.
 *
 * Zero-projects empty state is handled at the page level
 * (`home/page.tsx` swaps in `<WelcomeEmpty>` before reaching this
 * component), so this grid only needs the loading branch and the
 * happy-path map.
 *
 * Per-project `initialFolderId` comes from the sidebar's nav intent:
 * when a user clicks a folder in the sidebar, that intent says "open
 * project X with folder Y pre-opened". We forward `folderId` only to
 * the matching project — every other project gets `null` so its
 * folder state is unaffected.
 */
export function ProjectsGrid({ projects, loading = false }: ProjectsGridProps) {
  const navIntent = useSelector((s: RootState) => s.ui.projectNavIntent)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {projects.map(project => (
        <ProjectView
          key={project.id}
          project={project}
          initialFolderId={
            project.id === navIntent.projectId ? navIntent.folderId : null
          }
          /*
           * Pass the nonce so `ProjectView` can re-sync to the
           * intent on each click — even when the same folderId is
           * re-clicked. Without this, `useEffect([initialFolderId])`
           * wouldn't fire on a re-click.
           */
          navNonce={navIntent.nonce}
        />
      ))}
    </div>
  )
}
