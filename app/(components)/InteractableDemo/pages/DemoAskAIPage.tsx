'use client'

/**
 * Demo Ask-AI page — same chat surface the real `/hub/agent-chat`
 * uses, wired to a preconfigured Q&A list instead of a backend.
 *
 * Layout flow (mirrors real):
 *   header → beta banner → message log → input + suggestion chips
 *
 * The real chat sub-components (`ChatHeader`, `ChatMessage`,
 * `ChatTypingIndicator`, `ChatEmpty`, `ChatInput`) are all
 * provider-free, so the demo reuses them verbatim. Demo state lives
 * in `DemoContext` (`chat`, `sendChatMessage`, `clearChat`); typing
 * a message goes through the context's `sendChatMessage`, which
 * matches the input against the preconfigured list and replies (or
 * falls back to "this is a demo" copy).
 *
 * `chatMessages` are typed as `Msg` from the real page so
 * `<ChatMessage>` accepts them — the demo's `DemoChatMessage` shape
 * is strictly compatible (no `toolCalls`, but that's optional).
 */

import { useEffect, useRef, useState } from 'react'
import { Warning } from '@phosphor-icons/react'
import { ChatHeader } from '@/app/hub/agent-chat/(components)/ChatHeader'
import { ChatEmpty } from '@/app/hub/agent-chat/(components)/ChatEmpty'
import { ChatMessage } from '@/app/hub/agent-chat/(components)/ChatMessage'
import { ChatTypingIndicator } from '@/app/hub/agent-chat/(components)/ChatTypingIndicator'
import { ChatInput } from '@/app/hub/agent-chat/(components)/ChatInput'
import type { ChatMessage as Msg } from '@/app/hub/agent-chat/(components)/types'
import { PRECONFIGURED_QA, useDemoContext } from '../context/DemoContext'

export function DemoAskAIPage() {
  const { chat, sendChatMessage, clearChat } = useDemoContext()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll on every message change so the latest reply stays
  // in view. Same UX as the real page.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  // The "sending" state in the real page covers the request
  // round-trip. In the demo we mock a 600ms delay, so the typing
  // indicator should show while the assistant reply is pending —
  // detect that by checking the last message's role.
  const sending =
    chat.length > 0 && chat[chat.length - 1]!.role === 'user'

  // Bridge: `DemoChatMessage[]` → real `Msg[]`. Same shape minus
  // the optional `toolCalls`, which the demo never produces.
  const messages: Msg[] = chat

  const submit = () => {
    if (!input.trim() || sending) return
    sendChatMessage(input)
    setInput('')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* On mobile the demo sidebar's burger button overlays the
          top-left corner of the demo card — `pl-10` here pushes the
          shared `<ChatHeader>` (which has no built-in left padding
          since the real app's mobile chrome handles that via
          `<MobileTopBar>`) out from under it. Desktop has no burger,
          so the wrapper collapses back to no padding. */}
      <div className="pl-10 md:pl-0">
        <ChatHeader hasMessages={chat.length > 0} onClear={clearChat} />
      </div>

      {/* Beta banner — same chrome as real, kept here so visitors
          see it on the demo too. */}
      <div className="shrink-0 mx-3 mb-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
        <Warning size={11} weight="bold" className="shrink-0" />
        <span>
          Demo only — questions match a preset list. Real Ask AI uses
          your live data.
        </span>
      </div>

      {/* Scrollable message stream. `min-h-0` is the flex-child
          shrink trick — same as the real page. */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3">
        <div className="max-w-2xl mx-auto py-3 space-y-3">
          {messages.length === 0 && !sending ? (
            <ChatEmpty />
          ) : (
            messages.map(m => <ChatMessage key={m.id} message={m} />)
          )}
          {sending && <ChatTypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={submit}
        sending={sending}
        showSuggestions
        // Suggestion chips show the preconfigured questions so taps
        // fill the textarea with a prompt the demo can actually
        // answer. Empty when the user hasn't filled in `PRECONFIGURED_QA`
        // yet — `<ChatInput>` hides the chip row in that case.
        suggestions={PRECONFIGURED_QA.map(p => p.q)}
      />
    </div>
  )
}
