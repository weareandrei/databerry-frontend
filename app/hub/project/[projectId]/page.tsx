'use client'

/**
 * Legacy mobile project route (`/hub/project/[projectId]`, singular).
 *
 * The mobile project page is now the SAME `[project]/overview` screen
 * as desktop (the project sidebar is simply hidden on mobile), so this
 * route just redirects there. Kept as a thin redirect rather than
 * deleted so any old links / history entries still resolve.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function LegacyProjectRedirect() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    router.replace(`/hub/projects/${params.projectId as string}/overview`)
  }, [params.projectId, router])
  return null
}
