'use client'

/**
 * Edit-funnel modal — opened from the funnel card's dropdown menu.
 *
 * Loads the view's current funnel config (`steps` + `conversionWindowSeconds`),
 * fetches the connection's available PostHog events for the step dropdowns,
 * and lets the user add/remove/reorder/change steps before saving via the
 * generic `PATCH /views/:id` endpoint.
 *
 * Mirrors the funnel-picker UI inside `<CreateViewModal>` but as a
 * standalone modal that targets an EXISTING view — no folder/project
 * picking, no event-tracking flow, just config editing.
 *
 * After save, calls `onSaved(updatedView)` so the parent can:
 *   1. patch its local view state (so the dropdown reads the new
 *      config immediately without a page reload)
 *   2. trigger a re-fetch of the funnel data (the funnel data hook
 *      keys on `view.id` only, so a config change without a manual
 *      refresh would otherwise return stale step counts)
 */

import { useEffect, useRef, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, X } from '@phosphor-icons/react'
import { BottomDialog } from '@/components/ui/Dialog/BottomDialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ALGORITHM,
  type PosthogEventDefinition,
} from '@/lib/api'
import type { Widget } from '@/types/widget'
import { cn } from '@/lib/utils'

const CONVERSION_WINDOW_OPTIONS: { label: string; seconds: number }[] = [
  { label: '1 hour', seconds: 60 * 60 },
  { label: '24 hours', seconds: 60 * 60 * 24 },
  { label: '7 days', seconds: 60 * 60 * 24 * 7 },
  { label: '30 days', seconds: 60 * 60 * 24 * 30 },
]

const MIN_STEPS = 2
const MAX_STEPS = 5

/**
 * Shape of the `posthog_funnel` view config that this modal reads and
 * writes. Mirrors the backend's `FunnelStepConfig` (see
 * `backend/src/posthog/views/live/funnel.ts`) — kept inline here
 * because the frontend doesn't import backend types.
 */
interface FunnelConfig {
  steps: Array<{ eventName: string }>
  conversionWindowSeconds: number
}

function readFunnelConfig(view: Widget): FunnelConfig {
  const cfg = (view.config ?? {}) as Partial<FunnelConfig>
  const steps = Array.isArray(cfg.steps) ? cfg.steps : []
  return {
    steps: steps.length >= MIN_STEPS
      ? steps.map(s => ({ eventName: s?.eventName ?? '' }))
      // Defensive fallback — a corrupted config shouldn't crash the
      // modal. Two empty rows let the user start fresh.
      : [{ eventName: '' }, { eventName: '' }],
    conversionWindowSeconds:
      typeof cfg.conversionWindowSeconds === 'number'
        ? cfg.conversionWindowSeconds
        : 60 * 60 * 24 * 7,
  }
}

interface Props {
  view: Widget
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fires with the freshly-PATCHed view after a successful save. */
  onSaved?: (updated: Widget) => void
  /** Optional container element — same plumbing as the demo's modals
   *  for rendering inside a confined surface. Omit in real-dashboard
   *  usage to portal to <body>. */
  container?: HTMLElement | null
}

export function EditFunnelModal({
  view,
  open,
  onOpenChange,
  onSaved,
  container,
}: Props) {
  // Local editable copy. Re-seeded from `view.config` every time the
  // modal opens so editing, closing without saving, and re-opening
  // shows the persisted config again (not the abandoned edits).
  const [steps, setSteps] = useState<string[]>(() =>
    readFunnelConfig(view).steps.map(s => s.eventName),
  )
  const [conversionWindowSeconds, setConversionWindowSeconds] = useState<number>(
    () => readFunnelConfig(view).conversionWindowSeconds,
  )
  const [events, setEvents] = useState<PosthogEventDefinition[] | null>(null)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Synchronous re-entry gate. `saving` state alone isn't enough — a
  // user spamming the Save button fires multiple click handlers before
  // React applies the disabled state to the DOM, and each handler reads
  // `canSave` (which closes over the pre-update state) as `true`. The
  // ref flips synchronously so the second click bails out instantly.
  const savingRef = useRef(false)

  // Re-seed editable state + (re-)fetch events on each open.
  useEffect(() => {
    if (!open) return
    const cfg = readFunnelConfig(view)
    setSteps(cfg.steps.map(s => s.eventName))
    setConversionWindowSeconds(cfg.conversionWindowSeconds)

    const connectionId = view.connectionId
    if (!connectionId) {
      setEventsError('No PostHog connection attached to this view.')
      return
    }
    let cancelled = false
    setLoadingEvents(true)
    setEventsError(null)
    ALGORITHM.getPosthogEventDefinitions(connectionId)
      .then(list => {
        if (cancelled) return
        setEvents(list)
        setLoadingEvents(false)
      })
      .catch(err => {
        if (cancelled) return
        setEvents(null)
        setEventsError(err instanceof Error ? err.message : 'Failed to load events')
        setLoadingEvents(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, view])

  const filledSteps = steps.map(s => s.trim()).filter(s => s.length > 0)
  const canSave = filledSteps.length >= MIN_STEPS && !saving

  // ── Step mutations ─────────────────────────────────────────────────
  const updateStep = (idx: number, eventName: string) =>
    setSteps(prev => prev.map((s, i) => (i === idx ? eventName : s)))

  const addStep = () =>
    setSteps(prev => (prev.length < MAX_STEPS ? [...prev, ''] : prev))

  const removeStep = (idx: number) =>
    setSteps(prev => (prev.length > MIN_STEPS ? prev.filter((_, i) => i !== idx) : prev))

  const moveStep = (idx: number, direction: -1 | 1) =>
    setSteps(prev => {
      const target = idx + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })

  // ── Save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const nextConfig: FunnelConfig = {
        steps: filledSteps.map(eventName => ({ eventName })),
        conversionWindowSeconds,
      }
      // Cast to the generic record shape `updateView` expects —
       // the backend just patches `config` as opaque JSON, so the
       // structural-vs-Record mismatch is purely a TS-side wart.
       const updated = await ALGORITHM.updateView(view.id, {
         config: nextConfig as unknown as Record<string, unknown>,
       })
      onSaved?.(updated)
      toast.success('Funnel updated')
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? `Save failed — ${err.message}` : 'Save failed',
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <BottomDialog open={open} onOpenChange={onOpenChange} container={container}>
      <BottomDialog.Page
        title="Edit funnel"
        bodyMaxWidth="38rem"
        headerRight={() => (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      >
        <p className="text-sm text-muted-foreground -mt-1 mb-4">
          Pick 2–5 events in the order users should complete them. Each step
          counts users who fired the event after completing every previous
          step within the conversion window.
        </p>

        {loadingEvents && (
          <p className="text-sm text-subtle py-4 text-center">Loading events…</p>
        )}
        {eventsError && (
          <p className="text-sm text-destructive py-4 text-center">{eventsError}</p>
        )}
        {events && events.length === 0 && (
          <p className="text-sm text-subtle py-4 text-center">
            No events found in this PostHog project.
          </p>
        )}

        {events && events.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {steps.map((stepEvent, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground text-right">
                    {idx + 1}.
                  </span>
                  <select
                    className="flex-1 text-sm border rounded-md px-2 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                    value={stepEvent}
                    onChange={e => updateStep(idx, e.target.value)}
                  >
                    <option value="">Select an event…</option>
                    {events.map(def => (
                      <option key={def.id ?? def.name} value={def.name}>
                        {def.name}
                      </option>
                    ))}
                  </select>
                  {/* Reorder buttons — up/down. Each disabled at the
                      edge of the list to give clear "you've reached
                      the end" affordance. */}
                  <button
                    type="button"
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0}
                    className={cn(
                      'shrink-0 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground',
                      idx === 0
                        ? 'opacity-30 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-muted hover:text-foreground',
                    )}
                    aria-label={`Move step ${idx + 1} up`}
                  >
                    <ArrowUp size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === steps.length - 1}
                    className={cn(
                      'shrink-0 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground',
                      idx === steps.length - 1
                        ? 'opacity-30 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-muted hover:text-foreground',
                    )}
                    aria-label={`Move step ${idx + 1} down`}
                  >
                    <ArrowDown size={14} weight="bold" />
                  </button>
                  {/* Remove — only when above the minimum step count
                      so the user can't accidentally invalidate the
                      funnel by dropping below 2 steps. */}
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    disabled={steps.length <= MIN_STEPS}
                    className={cn(
                      'shrink-0 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground',
                      steps.length <= MIN_STEPS
                        ? 'opacity-30 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-muted hover:text-destructive',
                    )}
                    aria-label={`Remove step ${idx + 1}`}
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
              ))}
            </div>

            {steps.length < MAX_STEPS && (
              <button
                type="button"
                onClick={addStep}
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Plus size={11} weight="bold" />
                Add step
              </button>
            )}

            <div className="mt-5 space-y-1.5">
              <label className="text-sm font-medium">Conversion window</label>
              <select
                className="w-full text-sm border rounded-md px-2 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                value={conversionWindowSeconds}
                onChange={e => setConversionWindowSeconds(Number(e.target.value))}
              >
                {CONVERSION_WINDOW_OPTIONS.map(opt => (
                  <option key={opt.seconds} value={opt.seconds}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                A user must complete every step within this time of starting
                the funnel to count toward conversion.
              </p>
            </div>

            {filledSteps.length < MIN_STEPS && (
              <p className="mt-4 text-xs text-amber-600">
                Pick an event for at least {MIN_STEPS} steps to save.
              </p>
            )}
          </>
        )}
      </BottomDialog.Page>
    </BottomDialog>
  )
}
