'use client'

/**
 * Demo create-connection modal.
 *
 * Replaces the OAuth + API-key flow the real app has with a no-op
 * picker: choose an integration, name it, click Add. The new
 * connection drops into the demo's connections list immediately.
 *
 * No backend hit. No API key field. No OAuth. The user explicitly
 * asked for create-connection to work in the demo, but without any
 * way to enter real credentials.
 *
 * Uses the same `BottomDialog` primitive the real dashboard uses, so
 * the demo's bottom-sheet UX matches what users will see once they
 * sign up. Same `Page` slot pattern, same `headerRight` save/cancel
 * cluster — only the underlying logic is mocked.
 */

import { useState } from 'react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { cn } from '@/lib/utils'
import { useDemoContext } from './context/DemoContext'

interface IntegrationOption {
  type: string
  label: string
  description: string
}

const INTEGRATIONS: IntegrationOption[] = [
  { type: 'stripe_manual',     label: 'Stripe',           description: 'Gross volume, MRR, customers' },
  { type: 'posthog',           label: 'PostHog',          description: 'Product analytics + events' },
  { type: 'calendly',          label: 'Calendly',         description: 'Scheduled meetings' },
  { type: 'google_analytics',  label: 'Google Analytics', description: 'GA4 traffic + sources' },
  { type: 'github',            label: 'GitHub',           description: 'Stars, issues, PRs' },
  { type: 'sentry',            label: 'Sentry',           description: 'Errors, perf' },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function DemoCreateConnectionModal({ open, onOpenChange }: Props) {
  const { createConnection, dialogContainer } = useDemoContext()
  const [pickedType, setPickedType] = useState<string | null>(null)
  const [name, setName] = useState('')

  function reset() {
    setPickedType(null)
    setName('')
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  function handleAdd() {
    if (!pickedType) return
    const finalName =
      name.trim() ||
      // Default to "<Integration> connection" when the user hasn't
      // typed anything. Same fallback the real `<CreateConnectionModal>`
      // applies when its OAuth callback didn't return a workspace name.
      `${INTEGRATIONS.find(i => i.type === pickedType)?.label ?? 'New'} connection`
    createConnection(pickedType, finalName)
    handleClose(false)
  }

  return (
    <BottomDialog open={open} onOpenChange={handleClose} container={dialogContainer}>
      <BottomDialog.Page
        title="Add a connection"
        bodyMaxWidth="42rem"
      >
        <p className="text-sm text-muted-foreground -mt-1 mb-4">
          Pick an integration and give it a name. The demo skips OAuth and API
          keys — connections are mock-only.
        </p>

        {/* Integration picker — radio-style cards, two columns to fit
            the dialog width comfortably. */}
        <div className="grid grid-cols-2 gap-2">
          {INTEGRATIONS.map(int => {
            const isSelected = pickedType === int.type
            return (
              <button
                key={int.type}
                type="button"
                onClick={() => setPickedType(int.type)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors cursor-pointer',
                  isSelected
                    ? 'border-foreground bg-foreground/5'
                    : 'bg-card hover:border-foreground/20',
                )}
              >
                <ConnectionIcon type={int.type} size={20} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{int.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {int.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Connection name input — only shows after an integration is
            picked, so the dialog feels natural to skim ("first pick,
            then name"). */}
        {pickedType && (
          <div className="mt-4">
            <label className="block text-xs font-medium mb-1.5 text-foreground">
              Connection name
            </label>
            <Input
              placeholder={`${INTEGRATIONS.find(i => i.type === pickedType)?.label} workspace`}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              No API key in the demo — just pick a label.
            </p>
          </div>
        )}

        {/* Action row pinned at the bottom of the body. The real modal
            puts these in `headerRight`; for a single-page demo dialog
            having them inline at the bottom of the form reads more
            naturally and matches the user's mental "fill in form →
            click confirm at bottom" flow. */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAdd} disabled={!pickedType}>
            Add
          </Button>
        </div>
      </BottomDialog.Page>
    </BottomDialog>
  )
}
