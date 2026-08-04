'use client'

/**
 * Onboarding flow-position persistence + restore.
 *
 * localStorage persistence. Flow POSITION only — never credentials.
 * `oauthPending` records "we redirected away for this tool's consent
 * screen"; on restore we VERIFY a connection of that type actually
 * exists server-side — advance past it if so, resume AT it (retry /
 * skip) if not.
 *
 * The hook owns exactly the state that round-trips through
 * localStorage (step, selections, connect-queue position, the
 * lazily-created project, the picked PostHog event) plus the
 * `restoring` gate. Transient/credential state (API keys, busy flags)
 * deliberately lives in the page and is never persisted.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ALGORITHM } from '@/lib/api'
import { TOOL_LABELS, type Step } from './constants'

const STORAGE_KEY = 'db_onboarding_v1'

export interface SavedProgress {
  step: Step
  selectedTools: string[]
  selectedViews: string[]
  queue: string[]
  queueIndex: number
  oauthPending: string | null
  /** The project created on the "Your project" step — persisted so
   *  the OAuth round-trip doesn't lose it and connections/views keep
   *  landing in the SAME project. */
  projectId?: string | null
  /** Draft name/website from the project step — kept so a mid-flow
   *  reload still shows what the user typed before Continue created
   *  (or updated) the project. */
  projectName?: string
  projectWebsiteUrl?: string
  /** Event picked for the "Track event" view — persisted so an
   *  OAuth round-trip (or tab close) on the views step doesn't
   *  silently fall back to $pageview. */
  posthogEventName?: string | null
}

export function saveProgress(p: SavedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* private mode — flow still works, just won't survive reloads */
  }
}

function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedProgress
  } catch {
    return null
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function useOnboardingProgress() {
  const [step, setStep] = useState<Step>('welcome')
  // TRUE until the mount-time restore (localStorage + the OAuth
  // verification fetch) has decided which step is real. Gates the
  // step UI so the user never sees — or interacts with — the
  // Welcome step when they're actually mid-flow.
  const [restoring, setRestoring] = useState(true)
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set())
  const [selectedViews, setSelectedViews] = useState<Set<string>>(new Set())

  // `queue` = the selected tools in TOOLS order; `queueIndex` = which
  // one the user is currently connecting.
  const [queue, setQueue] = useState<string[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  // The onboarding project every connection + view gets assigned to.
  // Created on the "Your project" step (or lazily at Finish / tools
  // continue for older in-flight progress); persisted in SavedProgress
  // so the OAuth round-trip keeps the same one.
  const [onbProjectId, setOnbProjectId] = useState<string | null>(null)
  // Draft name + website from the project step (persisted so a reload
  // mid-step doesn't wipe the form).
  const [projectName, setProjectName] = useState('')
  const [projectWebsiteUrl, setProjectWebsiteUrl] = useState('')
  // Event picked for the "Track event" view; persisted so the OAuth
  // round-trip (or a tab close) on the views step doesn't lose it.
  const [pickedEventName, setPickedEventName] = useState<string | null>(null)

  // ── Restore saved progress (once, on mount) ────────────────────
  // Covers both "closed the tab mid-flow" and "OAuth consent
  // round-trip landed me back here via the hub gate".
  //
  // The OAuth case is VERIFIED, not assumed: a pending tool only
  // counts as connected if a connection of its type actually exists
  // server-side. Cancelled/failed consent leaves none → we resume AT
  // that tool (with a toast) so the user can retry or explicitly
  // skip — previously we advanced optimistically and a failed GA
  // landed the user on the views step as if it had worked.
  //
  // `restoring` gates the step UI: until this finishes, the page
  // shows a small "restoring" state instead of flashing the Welcome
  // step (which is just the initial useState value, not the truth).
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const saved = loadProgress()
      if (!saved || saved.step === 'welcome') {
        setRestoring(false)
        return
      }

      setSelectedTools(new Set(saved.selectedTools))
      setSelectedViews(new Set(saved.selectedViews))
      setQueue(saved.queue)
      setOnbProjectId(saved.projectId ?? null)
      setProjectName(saved.projectName ?? '')
      setProjectWebsiteUrl(saved.projectWebsiteUrl ?? '')
      setPickedEventName(saved.posthogEventName ?? null)

      if (saved.oauthPending) {
        const label = TOOL_LABELS[saved.oauthPending] ?? saved.oauthPending
        // Did the consent round-trip actually create the connection?
        // Fresh onboarding accounts have no pre-existing connections,
        // so "any connection of this type exists" is a reliable
        // signal. If the check itself fails, resume AT the tool —
        // re-showing a connect screen is recoverable; skipping a
        // tool that never connected is not.
        let connected = false
        try {
          const conns = await ALGORITHM.getConnections()
          connected = conns.some(c => c.type === saved.oauthPending)
        } catch {
          connected = false
        }
        if (cancelled) return

        if (connected) {
          toast.success(`${label} connected.`)
          const next = saved.queueIndex + 1
          if (next < saved.queue.length) {
            setQueueIndex(next)
            setStep('connecting')
          } else {
            setQueueIndex(0)
            setStep('views')
          }
        } else {
          toast.error(
            `${label} wasn't connected — you can retry now or skip it.`,
          )
          setQueueIndex(saved.queueIndex)
          setStep('connecting')
        }
      } else {
        setQueueIndex(saved.queueIndex)
        setStep(saved.step)
      }
      setRestoring(false)
    }

    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Persist progress on every flow-position change ─────────────
  useEffect(() => {
    if (step === 'welcome') return
    saveProgress({
      step,
      selectedTools: Array.from(selectedTools),
      selectedViews: Array.from(selectedViews),
      queue,
      queueIndex,
      oauthPending: null,
      projectId: onbProjectId,
      projectName,
      projectWebsiteUrl,
      posthogEventName: pickedEventName,
    })
  }, [
    step,
    selectedTools,
    selectedViews,
    queue,
    queueIndex,
    onbProjectId,
    projectName,
    projectWebsiteUrl,
    pickedEventName,
  ])

  return {
    step,
    setStep,
    restoring,
    selectedTools,
    setSelectedTools,
    selectedViews,
    setSelectedViews,
    queue,
    setQueue,
    queueIndex,
    setQueueIndex,
    onbProjectId,
    setOnbProjectId,
    projectName,
    setProjectName,
    projectWebsiteUrl,
    setProjectWebsiteUrl,
    pickedEventName,
    setPickedEventName,
  }
}
