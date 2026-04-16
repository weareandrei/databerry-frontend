'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowUp } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function AgentChat() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const didSendInitial = useRef(false)

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const userMsg: Message = { role: 'user', content: content.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = session?.access_token ? `Bearer ${session.access_token}` : ''

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authToken },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  // Send initial query from home page redirect
  useEffect(() => {
    if (initialQuery && !didSendInitial.current) {
      didSendInitial.current = true
      sendMessage(initialQuery)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Ask anything about your business...
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-black text-white rounded-br-sm'
                  : 'bg-accent text-accent-foreground rounded-bl-sm',
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-accent rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Fixed input */}
      <div className="shrink-0 border-t bg-background px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3 rounded-2xl border bg-background px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring transition-shadow">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up..."
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white disabled:opacity-30 hover:opacity-75 transition-opacity shrink-0 mb-0.5"
          >
            <ArrowUp size={15} weight="bold" />
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

export default function AgentChatPage() {
  return (
    <Suspense>
      <AgentChat />
    </Suspense>
  )
}
