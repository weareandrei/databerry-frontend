'use client'

/**
 * `/hub/projects/[id]` — bare project URL. Overview is the project's
 * canonical landing sub-page, so bounce there. Client-side replace
 * (not a server redirect) keeps this consistent with the rest of the
 * hub, which is fully client-rendered behind auth.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ProjectIndexPage() {
  const params = useParams()
  const router = useRouter()
  useEffect(() => {
    router.replace(`/hub/projects/${params.projectId as string}/overview`)
  }, [params.projectId, router])
  return null
}
