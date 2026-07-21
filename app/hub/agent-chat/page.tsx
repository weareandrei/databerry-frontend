'use client'

/**
 * Standalone Agent route. Thin wrapper around `<AgentChatBody>`
 * with `showChrome` enabled so the mobile top-bar + desktop
 * DashboardHeader (breadcrumbs + New chat) render. All chat state
 * + send logic lives in `AgentChatBody`.
 *
 * `useSearchParams` requires a Suspense boundary in the App
 * Router — only this route reads `?q=`, so the Suspense wrapper
 * stays here rather than inside `AgentChatBody`.
 */

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AgentChatBody } from './AgentChatBody'

function AgentChatRoute() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? undefined
  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] bg-white md:h-screen">
      <AgentChatBody initialQuery={initialQuery} showChrome />
    </div>
  )
}

export default function AgentChatPage() {
  return (
    <Suspense>
      <AgentChatRoute />
    </Suspense>
  )
}
