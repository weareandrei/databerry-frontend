'use client'

/**
 * Layout for every `/hub/project/[projectId]/*` page. Resolves the
 * project from the URL and bounces to /hub/home when the id is stale.
 * Navigation chrome now lives in the root `<DashboardSidebar>` — this
 * layout only gates on project existence.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()
  const { projects: projectsCtx } = useDashboard()

  const project = projectsCtx.projects.find(p => p.id === projectId) ?? null
  const missing = !projectsCtx.loading && project === null

  useEffect(() => {
    if (missing) router.replace('/hub/home')
  }, [missing, router])

  if (!project && projectsCtx.loading) {
    return null
  }

  if (!project) {
    return null
  }

  return <>{children}</>
}
