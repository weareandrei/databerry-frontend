'use client'

/**
 * `[project]/agent-chat` — the same agent surface as the workspace
 * `/hub/agent-chat`, scoped to one project: separate conversation
 * history per project, and the project id travels with every send so
 * the backend can focus on that project's data. Reuses
 * `<AgentChatBody>` wholesale; per the layout spec this page renders
 * NO search/date chrome.
 */

import { useParams } from 'next/navigation'
import { AgentChatBody } from '@/app/hub/agent-chat/AgentChatBody'

export default function ProjectAgentChatPage() {
  const params = useParams()
  const projectId = params.projectId as string
  return (
    // The chat card's own `mt-4/mb-4` provides the vertical margins —
    // the page just pins the column to one viewport height.
    <div className="flex flex-col h-[calc(100dvh-60px)] md:h-screen">
      <AgentChatBody projectId={projectId} showChrome />
    </div>
  )
}
