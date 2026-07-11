'use client'

/**
 * Legacy `/hub/project/[id]/pinned` — pinned views now live on the
 * dashboard home only. Redirect old bookmarks and sidebar history.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LegacyProjectPinnedRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/hub/home')
  }, [router])

  return null
}
