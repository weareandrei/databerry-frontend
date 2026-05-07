'use client'

/**
 * Mobile project page (`/hub/project/[projectId]`).
 *
 * Mobile-first by design: the desktop home page (`/hub/home`) already
 * scrolls inline to a tapped project, so phones are the only form
 * factor that benefits from a dedicated route. Desktop visitors who
 * paste the URL get the same render — readable but not the optimised
 * experience. We don't redirect to `/hub/home?project=X` because it'd
 * surprise the URL-paster and adds routing complexity for a follow-up
 * decision; we'll revisit if a desktop-tuned variant is needed.
 *
 * Top bar: `<MobileTopBar variant="project">` with a back arrow that
 * pushes back to `/hub/home`. The bar itself is `md:hidden` — desktop
 * never paints it.
 *
 * Body: `<MobileProjectBody>` (folders + overview + other-views white
 * cards, single-column tiles).
 */

import { useParams, useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar'
import { MobileProjectBody } from '@/app/hub/(components)/mobile/MobileProjectBody'

export default function ProjectPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const { projects: projectsCtx } = useDashboard()
  const project = projectsCtx.projects.find(p => p.id === projectId)

  // Loading state — projects haven't hydrated yet. The dashboard
  // provider populates this on mount; rendering null is fine because
  // the layout's `bg-main` fills the viewport in the meantime. A
  // spinner would flash for one frame on warm caches; we skip it.
  if (projectsCtx.loading) return null

  if (!project) {
    return (
      <div className="flex flex-col flex-1">
        <MobileTopBar
          variant="project"
          projectName="Not found"
          onBack={() => router.push('/hub/home')}
        />
        <p className="px-4 py-8 text-sm text-muted-foreground">
          This project doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <MobileTopBar
        variant="project"
        projectName={project.name}
        onBack={() => router.push('/hub/home')}
      />
      <MobileProjectBody project={project} />
    </div>
  )
}
