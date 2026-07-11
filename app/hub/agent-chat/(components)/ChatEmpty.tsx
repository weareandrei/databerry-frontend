'use client'

/**
 * Empty-state surface for the Agent page — what the user sees BEFORE
 * any messages have been sent. Vertically-centred title, the chat
 * input inline below it, the AI-disclaimer line under the input,
 * and a row of MCP-connection chips at the bottom (their own MCPs
 * + an always-trailing "Config MCP's" affordance that routes to
 * Connections).
 *
 * The input is NOT shared with the bottom-pinned `<ChatInput>` —
 * once the first message lands, `<AgentChatBody>` switches layouts
 * to the active chat (messages stream + bottom input) and this
 * surface unmounts entirely. So the textarea here is local and
 * single-use: value lives in the parent so a half-typed prompt
 * survives the empty→active switch.
 *
 * Title font: Bricolage Grotesque, the same display face used on
 * the landing page hero / section titles, so the page feels like
 * a peer of those rather than a generic dashboard surface.
 */

import Image from 'next/image'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, CaretRight, Sparkle } from '@phosphor-icons/react'
import type { Connection } from '@/types/connection'

interface ChatEmptyProps {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  sending: boolean
  /** User's MCP connections (filtered to `type === 'mcp'` by the
   *  caller). First few render as light-grey chips with the MCP
   *  icon + connection name. */
  mcpConnections: Connection[]
  /**
   * Skip the "What do you want to know ?" heading. The home page
   * embeds this surface as a compact launcher under its own "Chat
   * with Agent" button — a second heading there would double up.
   * The standalone agent pages keep the default (title shown).
   */
  hideTitle?: boolean
  /** Override the trailing MCP CTA label (mobile home → "Connect
   *  MCPs"). Defaults to "Config MCP's". */
  mcpCtaLabel?: string
  /**
   * Embed tightly inside a bordered card (the mobile home launcher
   * wraps this in a white card with its own "Chat with Agent"
   * button). Drops the full-page vertical centering + outer padding
   * so the card's padding owns the spacing, and tightens the MCP row.
   */
  compact?: boolean
  /**
   * Show ONLY the trailing config CTA — hide the per-connection MCP
   * chips. The mobile home launcher uses this so it reads as a single
   * "Connect MCPs" button; the full agent page lists every connection
   * as normal.
   */
  hideUserMcps?: boolean
}

// We only show the first N MCP chips before the "Config MCP's"
// trailing chip — more than ~4 chips at typical sidebar widths
// would wrap awkwardly. The user can manage everything from
// Connections via the trailing chip.
const MAX_USER_MCP_CHIPS = 4

export function ChatEmpty({
  value,
  onChange,
  onSubmit,
  sending,
  mcpConnections,
  hideTitle = false,
  mcpCtaLabel,
  compact = false,
  hideUserMcps = false,
}: ChatEmptyProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const router = useRouter()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits; Shift+Enter inserts a newline — matches the
    // bottom-pinned `<ChatInput>` convention so muscle memory
    // carries over once the user is in the active chat. IME-safe
    // (skip submit if the user is mid-composition, e.g. picking a
    // CJK candidate).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (value.trim() && !sending) onSubmit()
    }
  }

  const visibleMcps = mcpConnections.slice(0, MAX_USER_MCP_CHIPS)

  return (
    <div
      className={
        compact
          ? 'w-full flex flex-col items-center'
          : 'flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-10'
      }
    >
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Title — Inter, inherited from the hub shell. */}
        {!hideTitle && (
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-6 text-center tracking-tight">
            What do you want to know ?
          </h1>
        )}

        {/* ── Chat input ──────────────────────────────────────────
            Soft grey background (`bg-surface`, our existing page-bg
            token — same colour the page sits on, so the input reads
            as inset rather than as a separate floating card on a
            white background). Sparkle icon top-left is purely
            decorative (the AI affordance), the send button sits at
            bottom-right as a small brand-orange square. */}
        <div className="w-full relative rounded-2xl bg-surface border border-stroke px-4 pt-4 pb-3 min-h-[120px]">
          <div className="flex items-start gap-2.5">
            <Sparkle
              size={18}
              weight="fill"
              className="text-primary shrink-0 mt-0.5"
            />
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              rows={2}
              disabled={sending}
              className="flex-1 bg-transparent outline-none resize-none text-sm text-foreground placeholder:text-subtle disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (value.trim() && !sending) onSubmit()
            }}
            disabled={!value.trim() || sending}
            aria-label="Send message"
            className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-8 h-8 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-default cursor-pointer transition-colors"
          >
            <ArrowUp size={14} weight="bold" />
          </button>
        </div>

        {/* AI disclaimer — small, muted, under the input. */}
        <p className="mt-3 text-[11px] text-subtle text-center">
          Databerry AI copilot can be inaccurate. Please double-check responses.
        </p>

        {/* ── MCP chips row ──────────────────────────────────────
            User's MCP connections (light-grey chips) then a
            trailing "Config MCP's" CTA that routes to Connections.
            Wrap on narrow viewports so the trailing chip stays in
            view. `gap-3` keeps a comfortable rhythm without making
            the row feel sparse. */}
        <div
          className={`${compact ? 'mt-4' : 'mt-8'} w-full flex items-center justify-center flex-wrap gap-3`}
        >
          {!hideUserMcps &&
            visibleMcps.map(conn => <UserMcpChip key={conn.id} name={conn.name} />)}
          <ConfigMcpChip
            onClick={() => router.push('/hub/connections')}
            label={mcpCtaLabel}
          />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────
// Exported so the active-chat footer (`<AgentChatBody>` post-first-
// message) can reuse the same chip row without copy-pasting markup.

// Shared chip chrome — every chip in this row uses the SAME outer
// shape so they line up horizontally with no height drift. Only the
// icon tile colour + content vary between the two variants.
const CHIP_OUTER =
  'inline-flex items-center gap-2.5 rounded-xl bg-white border border-stroke shadow-sm px-3 py-2'
const CHIP_ICON_TILE =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0'
const CHIP_LABEL = 'text-sm font-semibold text-foreground'

/**
 * One of the user's existing MCP connections. White outer pill
 * matching the trailing Config chip — only the icon tile differs
 * (light-grey `bg-surface` here vs. brand-orange there). Single line of
 * content (name) so the chip's height matches the Config chip
 * exactly; previously the User chip was shorter (`w-7 h-7` icon, no
 * shadow) and the row read as a height-jitter mess.
 *
 * Visible at every breakpoint. Whether this row of "you have these
 * MCP servers" chips appears at all is the CALLER's decision via
 * `<ChatEmpty hideUserMcps>`: the mobile home launcher hides them
 * (single "Connect MCPs" CTA only — a row of inventory chips reads
 * as clutter in that tight column), while the agent page lists every
 * connection as normal on phone and desktop alike.
 *
 * No click handler today — these are informational; the "Config
 * MCP's" chip on the trailing edge is the actual action.
 */
export function UserMcpChip({ name }: { name: string }) {
  return (
    <div className={CHIP_OUTER}>
      <span className={`${CHIP_ICON_TILE} bg-surface`}>
        <Image
          src="/icons/mcp.svg"
          alt=""
          width={16}
          height={16}
          className="opacity-90"
        />
      </span>
      <span className={`${CHIP_LABEL} truncate max-w-[140px]`}>{name}</span>
    </div>
  )
}

/**
 * Trailing "Config MCP's" affordance — always present, regardless of
 * how many MCPs the user has connected. Same outer chrome as the
 * `UserMcpChip` so the row reads as one consistent family; differs
 * only in:
 *   1. Icon tile is brand-orange + the MCP svg is rendered WHITE
 *      (via a `filter: brightness(0) invert(1)` trick on the svg
 *      image, since we don't have a per-colour svg variant).
 *   2. Trailing `>` caret signals "this is a navigation, not a
 *      tile" — clicking routes to `/hub/connections` where the user
 *      manages MCP connections.
 *
 * Single-line content (no description) so the chip's height matches
 * the User chips exactly.
 */
export function ConfigMcpChip({
  onClick,
  label = 'Config MCP’s',
}: {
  onClick: () => void
  /** Override the default "Config MCP's" wording (mobile home uses
   *  "Connect MCPs"). */
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group ${CHIP_OUTER} transition-colors hover:bg-hover-fill cursor-pointer`}
    >
      <span className={`${CHIP_ICON_TILE} bg-primary`}>
        {/* The svg ships as black; `brightness(0) invert(1)` flips
            it to pure white so it reads cleanly on the brand-orange
            tile. Cheaper than maintaining a second white variant. */}
        <Image
          src="/icons/mcp.svg"
          alt=""
          width={16}
          height={16}
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </span>
      <span className={CHIP_LABEL}>{label}</span>
      <CaretRight
        size={14}
        weight="bold"
        className="text-foreground shrink-0 ml-1 transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </button>
  )
}
