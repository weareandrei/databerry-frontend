'use client'

/**
 * Per-message bubble. Two variants:
 *
 *  - `role === 'user'`     — right-aligned, brand-coloured pill.
 *  - `role === 'assistant'` — left-aligned plain text with markdown
 *                             rendering. Tool calls (if any) appear
 *                             below as a collapsible chip.
 *
 * The markdown component map is deliberately small — no GFM, no
 * syntax highlighter, no math. We're optimising for the actual
 * shapes the assistant emits: bold totals, lists, inline code, and
 * the occasional link.
 */

import ReactMarkdown from 'react-markdown'
import { Wrench } from '@phosphor-icons/react'
import type { ChatMessage as Msg } from './types'

const MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="font-mono text-xs px-1 py-0.5 bg-black/[0.04] rounded text-grey-darkest">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="font-mono text-xs p-3 bg-black/[0.04] rounded overflow-x-auto my-2">
      {children}
    </pre>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-grey-darkest">{children}</strong>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-grey-darkest mt-3 mb-1">{children}</h3>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-grey-darkest mt-3 mb-1">{children}</h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-grey-darkest mt-2 mb-1">{children}</h4>
  ),
}

export function ChatMessage({ message }: { message: Msg }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] text-sm text-grey-darkest space-y-2">
        <ReactMarkdown components={MARKDOWN_COMPONENTS}>
          {message.content || '(no response)'}
        </ReactMarkdown>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsChip calls={message.toolCalls} />
        )}
      </div>
    </div>
  )
}

// Collapsed view of which tools were invoked for this turn — click to
// expand and see params + result. `<details>` is the right primitive
// here: zero JS, accessible, keyboard-friendly.
function ToolCallsChip({ calls }: { calls: NonNullable<Msg['toolCalls']> }) {
  return (
    <details className="text-[11px] text-grey-light group">
      <summary className="inline-flex items-center gap-1.5 cursor-pointer hover:text-grey-dark transition-colors select-none">
        <Wrench size={11} weight="bold" />
        Used {calls.length} {calls.length === 1 ? 'tool' : 'tools'} ·{' '}
        <span className="text-grey-dark group-open:hidden">show</span>
        <span className="text-grey-dark hidden group-open:inline">hide</span>
      </summary>
      <div className="mt-2 space-y-1.5 border-l border-stroke pl-3">
        {calls.map((c, i) => (
          <div key={i} className="font-mono">
            <div className="text-grey-dark">
              {c.name}
              <span className="text-grey-light">
                ({Object.entries(c.input)
                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                  .join(', ')})
              </span>
            </div>
            {c.error ? (
              <div className="text-destructive text-[10px] mt-0.5">
                ✗ {c.error}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  )
}
