'use client'

/**
 * `[project]/agent-chat` — the same agent surface as the workspace
 * `/hub/agent-chat`, scoped to one project: separate conversation
 * history per project, and the project id travels with every send so
 * the backend can focus on that project's data. Reuses
 * `<AgentChatBody>` wholesale — chrome is breadcrumbs + New chat
 * (no date picker).
 */

import { useParams } from 'next/navigation'
import { AgentChatBody } from '@/app/hub/agent-chat/AgentChatBody'

export default function ProjectAgentChatPage() {
  const params = useParams()
  const projectId = params.projectId as string
  return (
    // Pin the chat column to one viewport height — the hub layout's
    // main panel already carries the white background + border.
    <div className="flex flex-col h-[calc(100dvh-60px)] bg-white md:h-screen">
      <AgentChatBody projectId={projectId} showChrome />
    </div>
  )
}
