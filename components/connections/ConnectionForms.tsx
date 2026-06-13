'use client'

/**
 * Shared connection-setup forms — extracted from
 * CreateConnectionModal so the SAME instruction cards + inputs render
 * in every surface that creates connections (the dashboard modal,
 * /onboarding's "Connecting <tool>" sequence, anything future).
 *
 * All components are CONTROLLED — they own no fetch/submit logic.
 * Values + errors come in as props; changes go out via callbacks.
 * The actual flows (validate key, create connection, OAuth URLs)
 * live in `lib/connections/connectionFlows.ts`; hosts of these forms
 * wire the two together however their UI demands (modal header
 * Save/Cancel cluster vs onboarding's bottom Done button).
 *
 * The instruction primitives (`PrerequisitesCard`, `SetupStep`)
 * exist because session replays showed users connecting correctly
 * but with nothing to show (no events flowing yet), or stumbling on
 * silent failure modes (PostHog personal-vs-project key, wrong
 * region). Each form leads with "what you need" and then walks the
 * key-creation steps inline, with the inputs INSIDE the relevant
 * step so the page reads top-to-bottom as one sequence.
 */

import { useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InlineErrorBanner } from '@/app/hub/(components)/modals/InlineErrorBanner'
import { cn } from '@/lib/utils'
import {
  POSTHOG_HOSTS,
  type PosthogProjectOption,
  type VercelProjectOption,
} from '@/lib/connections/connectionFlows'

// ── Setup-instruction primitives ────────────────────────────────────────────

export function PrerequisitesCard({ items }: { items: React.ReactNode[] }) {
  // `max-w-md` keeps the card from stretching the full form width — it
  // sizes to a comfortable reading column instead.
  return (
    <div className="max-w-md rounded-2xl border border-stroke bg-main/40 p-3 md:p-4">
      <p className="text-sm font-medium text-grey-light mb-2.5">Pre-requisites</p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <PrerequisiteItem key={i}>{it}</PrerequisiteItem>
        ))}
      </div>
    </div>
  )
}

/**
 * One pre-requisite row. The circle is a real toggle the user can
 * tick — purely cosmetic ("let me check these off"), it gates
 * nothing and isn't read anywhere. Local state only.
 */
function PrerequisiteItem({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setChecked(c => !c)}
      aria-pressed={checked}
      className="flex w-full items-center gap-3 rounded-xl border border-stroke bg-white px-3 py-2.5 text-left transition-colors hover:bg-hover-fill cursor-pointer"
    >
      <span
        className={cn(
          'shrink-0 grid place-items-center w-4 h-4 rounded-full border-2 transition-colors',
          checked ? 'border-brand bg-brand text-white' : 'border-stroke',
        )}
      >
        {checked && <Check size={10} weight="bold" />}
      </span>
      <span className="text-sm font-semibold text-grey-darkest leading-snug">
        {children}
      </span>
    </button>
  )
}

export function SetupStep({
  n,
  title,
  children,
}: {
  n: number
  title: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-sm font-medium text-grey-light mb-1">Step {n}</p>
      <div className="text-sm font-semibold text-grey-darkest leading-snug">
        {title}
      </div>
      {children ? <div className="mt-2.5">{children}</div> : null}
    </div>
  )
}

// ── PostHog ─────────────────────────────────────────────────────────────────

export function PostHogForm({
  apiKey,
  host,
  error,
  onApiKeyChange,
  onHostChange,
}: {
  apiKey: string
  host: string
  /**
   * Inline error from the most recent fetch attempt. Stays visible
   * while the user edits the form so they can re-read the hint
   * (typo? wrong region?). Cleared by the parent on the next attempt.
   */
  error: string | null
  onApiKeyChange: (v: string) => void
  onHostChange: (v: string) => void
}) {
  return (
    <div className="space-y-6 max-w-md">
      <PrerequisitesCard
        items={[
          'You have a PostHog account with a project set up',
          "You've added PostHog to your code and it's capturing events",
        ]}
      />

      <SetupStep
        n={1}
        title={
          <>
            Create an API key under{' '}
            <a
              href="https://app.posthog.com/settings/user-api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-grey-darkest transition-colors"
            >
              Personal API Keys
            </a>
            .
          </>
        }
      >
        <p className="text-sm text-grey-dark">Give it the following access:</p>
        <ul className="mt-1 list-disc pl-5 text-sm text-grey-darkest">
          <li>
            <span className="font-semibold">Read</span> access to Project,
            Query, and Event definition.
          </li>
        </ul>
        <p className="mt-2 text-xs text-grey-light">
          It&apos;s read-only. We never write anything to your PostHog account.
        </p>
      </SetupStep>

      <SetupStep n={2} title="Paste your API key below">
        <Input
          placeholder="phx_xxxxxxxxxxxxxxxxxxxx"
          value={apiKey}
          onChange={e => onApiKeyChange(e.target.value)}
          autoFocus
        />
      </SetupStep>

      <SetupStep n={3} title="Select your region">
        <p className="text-xs text-grey-light mb-2.5">
          Find it in your PostHog URL —{' '}
          <code className="bg-muted px-1 rounded">us.posthog.com</code> or{' '}
          <code className="bg-muted px-1 rounded">eu.posthog.com</code>.
        </p>
        {/* Content-width row (not a full-width 2-col grid) so the two
            region buttons sit compactly side by side instead of
            stretching across the form. */}
        <div className="flex flex-wrap gap-2">
          {POSTHOG_HOSTS.map(h => (
            <Button
              key={h.id}
              type="button"
              variant="outline"
              onClick={() => onHostChange(h.id)}
              className={`h-auto py-2 px-4 text-sm ${
                host === h.id ? 'border-foreground bg-muted' : ''
              }`}
            >
              {h.label}
            </Button>
          ))}
        </div>
      </SetupStep>

      <InlineErrorBanner message={error} />
    </div>
  )
}

export function PostHogProjectSelectForm({
  projects,
  selectedId,
  onSelect,
}: {
  projects: PosthogProjectOption[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No projects on this PostHog account. Create one in PostHog and try again.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {projects.map(p => (
          <Button
            key={p.id}
            variant="outline"
            onClick={() => onSelect(p.id)}
            className={`w-full justify-start h-auto px-3 py-2.5 text-sm ${
              selectedId === p.id ? 'border-foreground bg-muted' : ''
            }`}
          >
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span className="font-medium">{p.name}</span>
              {p.organization && (
                <span className="text-xs text-muted-foreground">
                  {p.organization}
                </span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}

// ── Stripe (manual API key) ─────────────────────────────────────────────────

export function StripeManualForm({
  name,
  apiKey,
  error,
  onNameChange,
  onApiKeyChange,
}: {
  name: string
  apiKey: string
  /** Inline error from the most recent save attempt. */
  error: string | null
  onNameChange: (v: string) => void
  onApiKeyChange: (v: string) => void
}) {
  return (
    <div className="space-y-6 max-w-md">
      <PrerequisitesCard
        items={[
          'You have a Stripe account with charges or customers',
          "You're an admin who can create API keys on it",
        ]}
      />

      <SetupStep
        n={1}
        title={
          <>
            Create a{' '}
            <a
              href="https://dashboard.stripe.com/apikeys/create"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-grey-darkest transition-colors"
            >
              Stripe Restricted Key
            </a>
            .
          </>
        }
      >
        <p className="text-sm text-grey-dark">Give it Read access to:</p>
        <ul className="mt-1 list-disc pl-5 text-sm text-grey-darkest">
          <li>Charges, Customers, Subscriptions, and Products.</li>
        </ul>
        <p className="mt-2 text-xs text-grey-light">
          It&apos;s read-only. We never write anything to your Stripe account.
        </p>
      </SetupStep>

      <SetupStep n={2} title="Paste your Restricted Key below">
        <Input
          placeholder="rk_live_xxxxxxxxxxxxxxxxxxxx"
          value={apiKey}
          onChange={e => onApiKeyChange(e.target.value)}
          autoFocus
        />
      </SetupStep>

      <SetupStep n={3} title="Name this connection">
        <Input
          placeholder="Stripe"
          value={name}
          onChange={e => onNameChange(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-grey-light">
          Helps you tell multiple Stripe accounts apart later.
        </p>
      </SetupStep>

      <InlineErrorBanner message={error} />
    </div>
  )
}

// ── Vercel ──────────────────────────────────────────────────────────────────

export function VercelTokenForm({
  token,
  error,
  onTokenChange,
}: {
  token: string
  /** Inline error from the most recent fetch attempt. Cleared by
   *  the parent on the next submit so the user sees a fresh state
   *  per try. */
  error: string | null
  onTokenChange: (v: string) => void
}) {
  return (
    <div className="space-y-6 max-w-md">
      <PrerequisitesCard
        items={['You have a Vercel account with at least one project']}
      />

      <SetupStep
        n={1}
        title={
          <>
            Create a Personal Access Token at{' '}
            <a
              href="https://vercel.com/account/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-grey-darkest transition-colors"
            >
              vercel.com/account/tokens
            </a>
            .
          </>
        }
      >
        <p className="text-xs text-grey-light">
          Make sure it&apos;s a{' '}
          <span className="font-semibold text-grey-darkest">Personal</span>{' '}
          token — not Team or Project scope.
        </p>
      </SetupStep>

      <SetupStep n={2} title="Paste your token below">
        <Input
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={e => onTokenChange(e.target.value)}
          autoFocus
        />
      </SetupStep>

      <InlineErrorBanner message={error} />
    </div>
  )
}

export function VercelProjectSelectForm({
  projects,
  selectedId,
  error,
  onSelect,
}: {
  projects: VercelProjectOption[]
  selectedId: string
  error: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {projects.map(p => (
          <Button
            key={p.id}
            variant="outline"
            onClick={() => onSelect(p.id)}
            className={`w-full justify-start h-auto px-3 py-2.5 text-sm ${
              selectedId === p.id ? 'border-foreground bg-muted' : ''
            }`}
          >
            {p.name}
          </Button>
        ))}
      </div>
      <InlineErrorBanner message={error} />
    </div>
  )
}

// ── Webhook ─────────────────────────────────────────────────────────────────

export function WebhookForm({
  name,
  error,
  onNameChange,
}: {
  name: string
  /** Inline error from the most recent connect attempt. Webhooks
   *  used to fail silently — bad DB writes / failed key generation
   *  closed the modal with no surface. */
  error: string | null
  onNameChange: (v: string) => void
}) {
  return (
    <div className="space-y-6 max-w-md">
      <PrerequisitesCard
        items={[
          'You have a tool or service that can send HTTP POST requests (Zapier, a cron job, your backend…)',
        ]}
      />

      <SetupStep n={1} title="Name this webhook">
        <Input
          placeholder="My Webhook"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          autoFocus
        />
        <p className="mt-1.5 text-xs text-grey-light">
          After connecting you&apos;ll get a unique webhook URL + API key.
          Point your tool at that URL and send it data.
        </p>
      </SetupStep>

      <InlineErrorBanner message={error} />
    </div>
  )
}
