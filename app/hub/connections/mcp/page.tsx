'use client'

/**
 * MCP Connections subpage (`/hub/connections/mcp`).
 *
 * Mobile-first: the parent `/hub/connections` page on mobile shows a
 * "MCP Connections →" navigation pill at the top that routes here,
 * mirroring how `/hub/home` lets the user tap into a project to
 * reach `/hub/project/[id]`. Splitting MCP onto its own mobile
 * surface keeps the parent list focused on regular connections —
 * previously the same scroll had both, and on a phone they competed
 * for attention.
 *
 * On desktop, both sections still live on `/hub/connections` (no
 * vertical-space pressure). Visiting `/hub/connections/mcp` directly
 * on desktop still renders cleanly: the same MCP card chrome as the
 * connections page section, just isolated. We don't redirect away
 * because the URL is shareable.
 *
 * Top bar: `<MobileTopBar variant="page">` with `onBack` → back to
 * `/hub/connections`. The `onBack` swaps the burger for an arrow,
 * same chrome the project page uses.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowsClockwise, Cpu, Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import { SectionHeader } from '@/app/hub/(components)/layout/SectionHeader'
import { MobileTopBar } from '@/app/hub/(components)/mobile/MobileTopBar/MobileTopBar'
import { ConnectionDetailModal } from '@/app/hub/(components)/modals/ConnectionDetailModal'
import { AddMcpConnectionModal } from '@/app/hub/connections/(components)/AddMcpConnectionModal'
import { ProjectScopePill } from '@/app/hub/connections/(components)/ProjectScopePill'
import type { Connection } from '@/types/connection'

export default function McpConnectionsPage() {
  const router = useRouter()
  const { connections, projects: projectsCtx } = useDashboard()
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [mcpModalOpen, setMcpModalOpen] = useState(false)

  const mcpConnections = connections.connections.filter(c => c.type === 'mcp')

  return (
    <>
      <MobileTopBar
        variant="page"
        title="MCP Connections"
        // Push to `/hub/connections` rather than `router.back()` so a
        // user landing here from a shared link or a deep refresh
        // still ends up on the parent page (back() would either
        // bounce them out of the dashboard or be a no-op).
        onBack={() => router.push('/hub/connections')}
        rightSlot={
          <button
            type="button"
            onClick={() => setMcpModalOpen(true)}
            aria-label="Add MCP connection"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white shadow-pill hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus size={14} weight="bold" />
          </button>
        }
      />
      {/* Matches the parent Connections page's body container —
          16-px mobile padding, "no-left / 24-px right" on desktop so
          the card sits flush against the sidebar's gutter. */}
      <div className="flex-1 overflow-y-auto md:overflow-visible md:flex-none px-4 pt-4 pb-8 md:px-0 md:pt-6 md:pr-6 md:pb-8 md:max-w-[1600px] flex flex-col">
        <ConnectionDetailModal
          connection={selectedConnection}
          onClose={() => {
            setSelectedConnection(null)
            connections.loadConnections()
          }}
        />

        <div className="flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
          {/* Desktop section header — same chrome as the parent page
              uses for the regular Connections card. Mobile gets the
              header from `<MobileTopBar>` above, so this is gated. */}
          <div className="hidden md:block">
            <SectionHeader
              icon={
                <span className="flex items-center justify-center rounded-full bg-white border border-stroke p-2 shadow-pill">
                  <Cpu size={14} weight="bold" className="text-foreground" />
                </span>
              }
              title={
                <span className="text-base font-bold text-foreground">
                  MCP Connections
                </span>
              }
              rightSlot={
                <Button
                  className="rounded-full gap-1.5 px-4 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => setMcpModalOpen(true)}
                >
                  <Plus size={14} weight="bold" />
                  Add MCP connection
                </Button>
              }
              className="bg-surface"
            />
          </div>

          {connections.loading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowsClockwise
                size={16}
                weight="bold"
                className="text-muted-foreground animate-spin"
              />
            </div>
          ) : mcpConnections.length === 0 ? (
            <p className="text-sm text-subtle px-4 py-5">
              No MCP connections yet.
            </p>
          ) : (
            <div className="divide-y divide-stroke">
              {mcpConnections.map(connection => {
                const projectName = connection.projectId
                  ? projectsCtx.projects.find(p => p.id === connection.projectId)?.name ?? 'Project'
                  : 'Common'
                return (
                  <div
                    key={connection.id}
                    onClick={() => setSelectedConnection(connection)}
                    className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-surface"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ConnectionIcon
                        type={connection.type}
                        size={20}
                        className="text-muted-foreground shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-muted-foreground truncate">
                            {connection.name}
                          </p>
                          <ProjectScopePill
                            connection={connection}
                            projectName={projectName}
                            projects={projectsCtx.projects}
                            onReassign={id =>
                              connections.reassignProject(connection.id, id)
                            }
                          />
                        </div>
                        {/* MCP rows show the server URL underneath the
                            name (instead of the generic "Connected on…"
                            line) — the URL is the identifying piece of
                            info for an MCP connection, much more useful
                            than the creation date. */}
                        <p className="text-xs text-subtle truncate">
                          {connection.mcpServerUrl ?? 'MCP'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm(`Delete "${connection.name}"?`)) {
                            connections.deleteConnection(connection.id)
                          }
                        }}
                        aria-label="Delete connection"
                        className="md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center w-9 h-9 md:w-7 md:h-7 rounded text-subtle hover:text-foreground hover:bg-black/[0.06] transition-colors"
                      >
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <AddMcpConnectionModal open={mcpModalOpen} onOpenChange={setMcpModalOpen} />
      </div>
    </>
  )
}
