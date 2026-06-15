'use client'

// ── "Connecting <tool>" step ────────────────────────────────────────────────

import { ArrowLeft } from '@phosphor-icons/react'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import {
  PostHogForm,
  PostHogProjectSelectForm,
  StripeManualForm,
} from '@/components/connections/ConnectionForms'
import type {
  OAuthConnectionType,
  PosthogProjectOption,
} from '@/lib/connections/connectionFlows'
import { TOOL_LABELS } from './constants'
import { PrimaryCta, SkipLink } from './OnboardingControls'

/**
 * One tool in the connect sequence: "Go back" link, brand icon +
 * "Connecting <Tool>" heading, position counter, the per-tool form
 * (PostHog key → project picker, Stripe key, or an OAuth hand-off),
 * and a per-tool skip escape hatch (a stuck user — key they can't
 * find, account they don't own — must never be trapped).
 *
 * Form state + submit handlers live in the page (the orchestrator);
 * this component is presentational, grouping its inputs by tool.
 */
export function ConnectingStep({
  tool,
  position,
  total,
  busy,
  onBack,
  onSkipTool,
  posthog,
  stripe,
  onOAuthConnect,
}: {
  tool: string
  position: number
  total: number
  busy: boolean
  onBack: () => void
  onSkipTool: () => void
  posthog: {
    projects: PosthogProjectOption[] | null
    selectedId: string
    onSelect: (id: string) => void
    apiKey: string
    host: string
    error: string | null
    onApiKeyChange: (value: string) => void
    onHostChange: (value: string) => void
    onDone: () => void
  }
  stripe: {
    name: string
    apiKey: string
    error: string | null
    onNameChange: (value: string) => void
    onApiKeyChange: (value: string) => void
    onDone: () => void
  }
  onOAuthConnect: (type: OAuthConnectionType) => void
}) {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-grey-light hover:text-grey-darkest transition-colors cursor-pointer disabled:opacity-50 mb-3"
      >
        <ArrowLeft size={12} weight="bold" />
        Go back
      </button>

      <h1
        className="flex items-center gap-3 text-3xl md:text-4xl font-semibold tracking-tight text-gray-900"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        <ConnectionIcon type={tool} size={32} />
        Connecting {TOOL_LABELS[tool] ?? tool}
      </h1>
      {total > 1 && (
        <p className="mt-2 text-xs text-grey-light">
          Tool {position} of {total}
        </p>
      )}

      {/* `text-left` undoes the wrapper's `text-center` for the form
          content — per the design, ONLY the heading + bottom CTA are
          centered; the prerequisites card, steps and inputs read as a
          left-aligned column (centered as a block via items-center). */}
      <div className="mt-8 w-full flex flex-col items-center text-left">
        {tool === 'posthog' &&
          (posthog.projects ? (
            <div className="w-full max-w-md text-left">
              <p className="mb-2 text-sm font-semibold text-grey-darkest">
                Pick the PostHog project to track
              </p>
              <PostHogProjectSelectForm
                projects={posthog.projects}
                selectedId={posthog.selectedId}
                onSelect={posthog.onSelect}
              />
            </div>
          ) : (
            <PostHogForm
              apiKey={posthog.apiKey}
              host={posthog.host}
              error={posthog.error}
              onApiKeyChange={posthog.onApiKeyChange}
              onHostChange={posthog.onHostChange}
            />
          ))}

        {tool === 'stripe' && (
          <StripeManualForm
            name={stripe.name}
            apiKey={stripe.apiKey}
            error={stripe.error}
            onNameChange={stripe.onNameChange}
            onApiKeyChange={stripe.onApiKeyChange}
          />
        )}

        {(tool === 'sentry' || tool === 'google_analytics') && (
          <p className="max-w-sm text-sm text-gray-500 leading-relaxed">
            We&apos;ll send you to{' '}
            <span className="font-semibold text-grey-darkest">
              {TOOL_LABELS[tool]}
            </span>{' '}
            to authorize read-only access, then bring you right
            back here.
          </p>
        )}

        {/* Done / Connect CTA per tool */}
        {tool === 'posthog' && (
          <PrimaryCta
            label={
              busy
                ? 'Working…'
                : posthog.projects
                  ? 'Done'
                  : 'Continue'
            }
            onClick={posthog.onDone}
            disabled={
              busy ||
              (posthog.projects ? !posthog.selectedId : !posthog.apiKey.trim())
            }
            className="mt-8"
          />
        )}
        {tool === 'stripe' && (
          <PrimaryCta
            label={busy ? 'Working…' : 'Done'}
            onClick={stripe.onDone}
            disabled={busy || !stripe.apiKey.trim()}
            className="mt-8"
          />
        )}
        {(tool === 'sentry' || tool === 'google_analytics') && (
          <PrimaryCta
            label={busy ? 'Opening…' : `Connect ${TOOL_LABELS[tool]}`}
            onClick={() => onOAuthConnect(tool as OAuthConnectionType)}
            disabled={busy}
            className="mt-8"
          />
        )}
      </div>

      <SkipLink label="Skip this tool" onClick={onSkipTool} disabled={busy} />
    </div>
  )
}
