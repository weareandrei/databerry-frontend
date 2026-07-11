'use client'

/**
 * Demo home page — mirrors the redesigned real `/hub/home`:
 *
 *   1. Top bar (search + global date controls) — `<DemoTopBar>`.
 *   2. Agent launcher — a "Chat with Agent" pill above an "Ask
 *      anything" box, with the AI disclaimer + MCP chips beneath
 *      (exactly the real home's launcher, which embeds `<ChatEmpty>`).
 *      The box doesn't host the conversation: clicking it (or the
 *      pill) opens the demo Agent page (`goToPage('agent')`), the same
 *      way the real launcher deep-links to `/hub/agent-chat`.
 *   3. Pinned views below.
 *
 * The old Dashboard/Agent toggle + stacked project bodies are gone —
 * projects are reached from the icon rail now, and the agent has its
 * own page.
 */

import { ArrowRight, ArrowUp, Sparkle } from '@phosphor-icons/react'
import { useDemoContext } from '../context/DemoContext'
import { DemoTopBar } from '../DemoTopBar'
import { DemoPinnedViews } from '../projects/DemoPinnedViews'
import { UserMcpChip, ConfigMcpChip } from '@/app/hub/agent-chat/(components)/ChatEmpty'

export function DemoHomePage() {
  const { views, goToPage } = useDemoContext()

  // Hide the pinned section entirely when there's nothing pinned —
  // same affordance the real home has, no orphan label over an empty
  // grid.
  const hasPins = views.some(
    v =>
      v.pinned &&
      v.kind !== 'overview-chart' &&
      v.kind !== 'overview-sources',
  )

  const launchAgent = () => goToPage('agent')

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <DemoTopBar />

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-6 pb-8 flex flex-col gap-9">
          {/* ── Agent launcher ──────────────────────────────────────
              "Chat with Agent" pill over the ask box, mirroring the
              real home. The whole ask box is a button — the demo
              doesn't type here; it opens the Agent page where the
              scripted conversation plays. */}
          <section className="flex flex-col items-center">
            <button
              type="button"
              onClick={launchAgent}
              className="mb-2 inline-flex items-center gap-2.5 rounded-xl border border-stroke bg-white pl-1.5 pr-4 py-1.5 shadow-sm cursor-pointer hover:bg-hover-fill transition-colors"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface text-foreground">
                <ArrowRight size={13} weight="bold" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                Chat with Agent
              </span>
            </button>

            <div className="w-full max-w-2xl flex flex-col items-center">
              {/* Clickable ask box — looks like the real `<ChatEmpty>`
                  input pill, but the whole surface launches the Agent
                  page rather than hosting an inline conversation. */}
              <button
                type="button"
                onClick={launchAgent}
                aria-label="Chat with Agent"
                className="group w-full text-left relative flex flex-col items-stretch rounded-2xl bg-surface border border-stroke px-4 pt-4 pb-3 min-h-[96px] hover:border-subtle transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <Sparkle size={18} weight="fill" className="text-primary shrink-0 mt-0.5" />
                  <span className="flex-1 text-sm text-subtle">Ask anything</span>
                </div>
                <span className="absolute bottom-2.5 right-2.5 flex items-center justify-center w-8 h-8 rounded-md bg-primary text-white group-hover:bg-primary/90 transition-colors">
                  <ArrowUp size={14} weight="bold" />
                </span>
              </button>

              <p className="mt-3 text-[11px] text-subtle text-center">
                Databerry AI copilot can be inaccurate. Please double-check responses.
              </p>

              {/* MCP chips — two fake user MCPs + the trailing "Config
                  MCP's" CTA, which opens the demo Connections page. */}
              <div className="mt-6 w-full flex items-center justify-center flex-wrap gap-3">
                <UserMcpChip name="Beehiiv" />
                <UserMcpChip name="Notion" />
                <ConfigMcpChip onClick={() => goToPage('connections')} />
              </div>
            </div>
          </section>

          {/* ── Pinned views ────────────────────────────────────────── */}
          {hasPins && (
            <section>
              <h2 className="px-1 mb-3 text-[10px] font-medium uppercase tracking-wider text-subtle">
                Pinned views
              </h2>
              <DemoPinnedViews />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
