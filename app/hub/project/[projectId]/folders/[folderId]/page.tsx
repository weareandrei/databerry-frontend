'use client'

/**
 * Legacy `/hub/project/[id]/folders/[folderId]` → singular `folder`.
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function LegacyProjectFolderRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace(
      `/hub/project/${params.projectId as string}/folder/${params.folderId as string}`,
    )
  }, [params.projectId, params.folderId, router])

  return null
}
