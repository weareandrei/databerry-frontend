'use client'

/**
 * /onboarding — the first-run flow for fresh accounts.
 *
 *   1. Welcome              — set expectations ("under 5 minutes").
 *   2. Connect your tools   — multi-select, then a per-tool
 *      "Connecting <tool>" sequence using the SHARED connection
 *      forms + flows (same code as the dashboard modal).
 *   3. Add data views       — multi-select starter views.
 *
 * Lives OUTSIDE /hub on purpose: the hub layout brings the sidebar,
 * cream background and dashboard providers — none of which belong
 * here. The route relationship is enforced by `<OnboardingGate>` in
 * the hub layout: any /hub visit with `onboarding_complete = false`
 * bounces back here.
 *
 * RESUMABILITY: progress (step, selections, connect queue position)
 * persists to localStorage. Two reasons:
 *   - OAuth tools (Google Analytics, Sentry) NAVIGATE AWAY to a
 *     consent screen and land back on /hub/* — the gate bounces the
 *     user here, and the saved state resumes the sequence right
 *     after the OAuth tool instead of restarting at Welcome.
 *   - Closing the tab mid-flow resumes where they left off.
 * The saved state is cleared on finish/skip. Per-tool credentials
 * (API keys) are intentionally NOT persisted — only flow position.
 *
 * PROJECT: when the connect sequence starts (or at Finish, whichever
 * comes first) we ensure a project named "New Project" exists and
 * assign EVERYTHING to it — manual connections (PostHog/Stripe) are
 * created project-scoped directly; OAuth ones (GA/Sentry) land as
 * Common in the server callback and get re-scoped at Finish; all
 * created views live in it. Plan limits are NOT enforced in
 * onboarding (fresh accounts, nothing to abuse — the dashboard
 * modal still enforces for everyone after).
 *
 * Exit paths (both mark `onboarding_complete = true` in the DB):
 *   - "Skip onboarding" → ONBOARDING_SKIPPED { step } → /hub/home
 *   - "Finish"          → creates every selected view (ensuring a
 *     project exists first — fresh accounts get "My project"), then
 *     ONBOARDING_FINISHED { tools, views, viewsCreated } → /hub/home.
 *     See `handleFinish` for the failure stance: view-creation
 *     errors toast and proceed; they never trap the user here.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, ArrowsClockwise, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { NotchBar } from '@/app/(components)/navbar'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { PosthogEventPickerDialog } from '@/app/hub/(components)/view/PosthogEventPickerDialog'
import {
  PostHogForm,
  PostHogProjectSelectForm,
  StripeManualForm,
} from '@/components/connections/ConnectionForms'
import {
  POSTHOG_HOSTS,
  connectPosthog,
  connectStripeManual,
  fetchPosthogProjects,
  getOAuthUrlFor,
  type OAuthConnectionType,
  type PosthogProjectOption,
} from '@/lib/connections/connectionFlows'
import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent } from '@/lib/posthog'
import { cn } from '@/lib/utils'
import type { View } from '@/types/view'
import type { Connection } from '@/types/connection'

type Step = 'welcome' | 'tools' | 'connecting' | 'views'

const STEPS: { id: 'welcome' | 'tools' | 'views'; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'tools', label: 'Connect your tools' },
  { id: 'views', label: 'Create data views' },
]

/** Which top-bar dot is lit for each flow step. The connecting
 *  sequence is part of "Connect your tools". */
function activeStepIndex(step: Step): number {
  if (step === 'welcome') return 0
  if (step === 'views') return 2
  return 1
}

/** Tools offered on step 2, in queue order. `oauth` tools redirect
 *  to a consent screen instead of rendering a credential form. */
const TOOLS: { type: string; label: string; oauth: boolean }[] = [
  { type: 'posthog', label: 'PostHog', oauth: false },
  { type: 'stripe', label: 'Stripe', oauth: false },
  { type: 'sentry', label: 'Sentry', oauth: true },
  { type: 'google_analytics', label: 'Google Analytics', oauth: true },
]

const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  TOOLS.map(t => [t.type, t.label]),
)

/** Starter views offered on step 3 — each section only shows when
 *  its tool was selected on step 2.
 *
 *  NO "General" section on purpose: the backend's `createProject`
 *  already auto-creates the Project Overview pair (chart + sources)
 *  with every new project, so offering it here would create
 *  duplicates. Only connection-backed extras are offered. */
const VIEW_SECTIONS: {
  section: string
  requiresTool: string | null
  options: { id: string; iconType: string; label: string; desc: string }[]
}[] = [
  {
    section: 'PostHog',
    requiresTool: 'posthog',
    options: [
      {
        id: 'daily_counter',
        iconType: 'posthog',
        label: 'Track event',
        desc: 'Daily chart of an event you pick',
      },
      // NOT offering Funnel here on purpose: a funnel needs 2–5
      // user-picked event steps and there's no sensible default —
      // auto-creating one would render a broken tile. "Recent
      // users" is zero-config and works the moment PostHog is
      // connected.
      {
        id: 'posthog_users',
        iconType: 'posthog',
        label: 'Recent users',
        desc: 'Latest users with sessions & location',
      },
    ],
  },
  {
    section: 'Stripe',
    requiresTool: 'stripe',
    options: [
      {
        id: 'stripe_gross',
        iconType: 'stripe',
        label: 'Gross Volume',
        desc: 'Succeeded charges, charted over time',
      },
      {
        id: 'stripe_mrr',
        iconType: 'stripe',
        label: 'MRR',
        desc: 'Monthly recurring revenue',
      },
    ],
  },
  {
    section: 'Google Analytics',
    requiresTool: 'google_analytics',
    options: [
      {
        id: 'ga_users_today',
        iconType: 'google_analytics',
        label: 'Users',
        desc: 'Unique users, daily chart',
      },
      {
        id: 'ga_pageviews_today',
        iconType: 'google_analytics',
        label: 'Pageviews',
        desc: "Today's page views",
      },
    ],
  },
  {
    section: 'Sentry',
    requiresTool: 'sentry',
    options: [
      {
        id: 'sentry_issues_list',
        iconType: 'sentry',
        label: 'Errors',
        desc: 'Unresolved issues, sorted by recency',
      },
    ],
  },
]

/**
 * localStorage persistence. Flow POSITION only — never credentials.
 * `oauthPending` records "we redirected away for this tool's consent
 * screen"; on restore we VERIFY a connection of that type actually
 * exists server-side — advance past it if so, resume AT it (retry /
 * skip) if not.
 */
const STORAGE_KEY = 'db_onboarding_v1'

interface SavedProgress {
  step: Step
  selectedTools: string[]
  selectedViews: string[]
  queue: string[]
  queueIndex: number
  oauthPending: string | null
  /** The "New Project" created when the connect sequence started —
   *  persisted so the OAuth round-trip doesn't lose it and
   *  connections/views keep landing in the SAME project. */
  projectId?: string | null
  /** Event picked for the "Track event" view — persisted so an
   *  OAuth round-trip (or tab close) on the views step doesn't
   *  silently fall back to $pageview. */
  posthogEventName?: string | null
}

function saveProgress(p: SavedProgress): void {
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

function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// ── Finish-time view creation ───────────────────────────────────────────────

type ViewCreateBody = Omit<View, 'id' | 'userId' | 'createdAt' | 'isPinned'>

/**
 * Connection-backed view definitions the onboarding can auto-create.
 * Every entry is ZERO-CONFIG (or carries a safe default like
 * `$pageview`) — anything needing real user input (funnels,
 * retention) is deliberately not offered. `source` names which
 * connection the view attaches to.
 */
const SIMPLE_VIEW_DEFS: Record<
  string,
  { source: 'posthog' | 'stripe' | 'google_analytics' | 'sentry'; name: string; config: Record<string, unknown> }
> = {
  // `$pageview` is PostHog's auto-captured event — present on
  // virtually every install, so the tile shows data immediately and
  // the user can repoint it at any event later.
  daily_counter: {
    source: 'posthog',
    name: 'Pageviews',
    config: { eventName: '$pageview', displayMode: 'chart' },
  },
  posthog_users: { source: 'posthog', name: 'Recent users', config: {} },
  stripe_gross: { source: 'stripe', name: 'Gross Volume', config: { displayMode: 'chart' } },
  stripe_mrr: { source: 'stripe', name: 'MRR', config: { displayMode: 'value' } },
  ga_users_today: { source: 'google_analytics', name: 'Users', config: { displayMode: 'chart' } },
  ga_pageviews_today: { source: 'google_analytics', name: 'Pageviews', config: { displayMode: 'value' } },
  sentry_issues_list: { source: 'sentry', name: 'Errors', config: { displayMode: 'list' } },
}

/**
 * Map the user's view selections to concrete `POST /views` payloads.
 * Mirrors the dashboard's `CreateViewModal` payload shapes exactly
 * (same types, names, configs) so onboarding-created tiles are
 * indistinguishable from dashboard-created ones.
 *
 * Composite views (Project Overview pair) are intentionally NOT
 * handled here — the backend's `createProject` auto-creates them
 * with the project itself.
 *
 * Connection-backed selections need their source connection — if the
 * user selected views for a tool they ended up not connecting
 * (skipped it, cancelled the OAuth consent), those payloads are
 * SKIPPED and the affected sources reported, rather than creating
 * dead tiles bound to nothing.
 */
function buildViewPayloads(args: {
  selected: Set<string>
  projectId: string
  /** Latest connection per source type; absent key = not connected. */
  connBySource: Partial<Record<'posthog' | 'stripe' | 'google_analytics' | 'sentry', Connection>>
  /** Event picked in the Track-event dialog; falls back to
   *  `$pageview` only if somehow absent (e.g. stale persisted
   *  selection from before the picker existed). */
  posthogEventName?: string | null
}): { payloads: ViewCreateBody[]; skippedSources: string[] } {
  const { selected, projectId, connBySource, posthogEventName } = args
  const payloads: ViewCreateBody[] = []
  const skippedSources = new Set<string>()

  const base = { projectId, folderId: null, value: null }

  // Connection-backed selections — generic over SIMPLE_VIEW_DEFS.
  for (const id of selected) {
    const def = SIMPLE_VIEW_DEFS[id]
    if (!def) continue // unknown / stale ids are ignored
    const conn = connBySource[def.source]
    if (!conn) {
      skippedSources.add(def.source)
      continue
    }
    // Track-event carries the event picked in the dialog — both as
    // the config the renderer queries by AND as the tile name
    // (dashboard convention: daily_counter tiles are named after
    // their event).
    const isTrackEvent = id === 'daily_counter'
    const eventName = posthogEventName ?? '$pageview'
    payloads.push({
      ...base,
      connectionId: conn.id,
      // The connection's REAL type (a manual Stripe key is
      // 'stripe_manual', not 'stripe') — the dashboard's renderers
      // dispatch on this.
      connectionType: conn.type,
      type: id,
      name: isTrackEvent ? eventName : def.name,
      config: isTrackEvent
        ? { eventName, displayMode: 'chart' }
        : def.config,
    })
  }

  return { payloads, skippedSources: Array.from(skippedSources) }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  const [step, setStep] = useState<Step>('welcome')
  // TRUE until the mount-time restore (localStorage + the OAuth
  // verification fetch) has decided which step is real. Gates the
  // step UI so the user never sees — or interacts with — the
  // Welcome step when they're actually mid-flow.
  const [restoring, setRestoring] = useState(true)
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set())
  const [selectedViews, setSelectedViews] = useState<Set<string>>(new Set())

  // ── Connecting-sequence state ──────────────────────────────────
  // `queue` = the selected tools in TOOLS order; `queueIndex` = which
  // one the user is currently connecting.
  const [queue, setQueue] = useState<string[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  // The onboarding project ("New Project") every connection + view
  // gets assigned to. Created lazily when the connect sequence
  // starts (or at Finish for users who skip connecting); persisted
  // in SavedProgress so the OAuth round-trip keeps the same one.
  const [onbProjectId, setOnbProjectId] = useState<string | null>(null)

  // ── "Track event" picker state (views step) ────────────────────
  // Selecting the daily_counter view opens the same centered
  // PostHog event picker the project-overview chart uses; the
  // picked event becomes the view's `config.eventName` at Finish.
  const [eventPickerOpen, setEventPickerOpen] = useState(false)
  const [pickedEventName, setPickedEventName] = useState<string | null>(null)
  // Latest PostHog connection id — resolved alongside
  // `connectedTypes` when the views step opens; the picker dialog
  // needs it to fetch event definitions.
  const [posthogConnId, setPosthogConnId] = useState<string | null>(null)

  // Per-tool transient form state. Reset when the queue advances.
  // Deliberately NOT persisted to localStorage (credentials).
  const [phKey, setPhKey] = useState('')
  const [phHost, setPhHost] = useState<string>(POSTHOG_HOSTS[0].id)
  const [phError, setPhError] = useState<string | null>(null)
  const [phProjects, setPhProjects] = useState<PosthogProjectOption[] | null>(null)
  const [phSelectedId, setPhSelectedId] = useState('')
  const [stripeName, setStripeName] = useState('Stripe')
  const [stripeKey, setStripeKey] = useState('')
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  // ── Auth guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

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
      posthogEventName: pickedEventName,
    })
  }, [step, selectedTools, selectedViews, queue, queueIndex, onbProjectId, pickedEventName])

  /**
   * Resolve (or create) the onboarding project — "New Project" —
   * that every connection + view gets assigned to. Reuses an
   * existing project when one exists (idempotent across re-entries
   * and the OAuth round-trip); caches the id in state + SavedProgress.
   */
  const ensureProject = useCallback(async (): Promise<string> => {
    if (onbProjectId) return onbProjectId
    const projects = await ALGORITHM.getProjects()
    const project =
      projects[0] ?? (await ALGORITHM.createProject({ name: 'New Project' }))
    setOnbProjectId(project.id)
    return project.id
  }, [onbProjectId])

  const toggle = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  /**
   * Exit tail shared by skip + finish: write the DB flag FIRST, then
   * navigate — else the hub's OnboardingGate races a stale `false`
   * and bounces straight back here.
   */
  const markCompleteAndExit = async (
    event: typeof EVENT.ONBOARDING_SKIPPED | typeof EVENT.ONBOARDING_FINISHED,
    props: Record<string, unknown>,
  ) => {
    try {
      await ALGORITHM.completeOnboarding()
      trackEvent(event, props)
      clearProgress()
      router.replace('/hub/home')
      return true
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't save your progress — ${err.message}`
          : "Couldn't save your progress",
      )
      return false
    }
  }

  const handleSkip = async () => {
    if (submitting) return
    setSubmitting(true)
    const ok = await markCompleteAndExit(EVENT.ONBOARDING_SKIPPED, { step })
    if (!ok) setSubmitting(false)
  }

  /**
   * Finish = actually CREATE everything the user selected, then mark
   * complete and enter the dashboard.
   *
   * Order of operations and failure stance:
   *   1. Ensure a project exists — fresh accounts have none, and
   *      views are project-scoped. First existing project wins;
   *      otherwise we create "My project" (renameable later).
   *   2. Resolve connections FRESH from the API (not component
   *      state) — the OAuth detour (GA/Sentry) remounts the page, so
   *      anything created earlier in the sequence only reliably
   *      exists server-side.
   *   3. Create all selected views in one parallel batch.
   *   4. View-creation failure NEVER traps the user in onboarding —
   *      we toast, then proceed to mark complete anyway. They can
   *      add views from the dashboard in two clicks; being stuck on
   *      a wizard's last screen is far worse.
   */
  const handleFinish = async () => {
    if (submitting) return
    setSubmitting(true)

    let viewsCreated = 0
    let skippedSources: string[] = []

    try {
      // EVERY onboarded user gets the project — even with zero views
      // selected, landing on a dashboard with "New Project" ready
      // beats landing on an empty state. (No-op when it already
      // exists from the connect sequence.)
      const projectId = await ensureProject()

      const conns: Connection[] = await ALGORITHM.getConnections()
      // Latest connection per source wins — covers "connected
      // during this onboarding" AND "already had one from before".
      // Resolved FRESH from the API (not component state) because
      // the OAuth detour remounts the page; only the server knows
      // what actually got created.
      const latest = (types: string[]): Connection | undefined =>
        conns
          .filter(c => types.includes(c.type))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

      const connBySource = {
        posthog: latest(['posthog']),
        stripe: latest(['stripe', 'stripe_manual']),
        google_analytics: latest(['google_analytics']),
        sentry: latest(['sentry']),
      }

      // Assign OAuth-created connections to the project. The manual
      // flows (PostHog, Stripe) were created project-scoped already;
      // GA/Sentry are created server-side in the OAuth callback,
      // which doesn't carry a project — they land as Common
      // (projectId null), so we re-scope them here. Fresh onboarding
      // accounts have no pre-existing Common connections, so the
      // null-check can't grab anything the user set up deliberately.
      // Failures are non-fatal: a Common connection still serves the
      // project (Common = shared with every project).
      await Promise.all(
        Object.values(connBySource)
          .filter((c): c is Connection => c != null && c.projectId == null)
          .map(c =>
            ALGORITHM.updateConnectionProject(c.id, projectId).catch(
              () => null,
            ),
          ),
      )

      // Upgrade the seeded overview's metric defaults. The project
      // (and its auto-created Overview) was born on the tools step —
      // BEFORE any connection existed — so the backend seeded it with
      // empty metrics. Now that we know what actually connected:
      // visitors on the left if a traffic tool landed, revenue on the
      // right if Stripe did. Only fills EMPTY slots — never overrides
      // a metric the user somehow already set. Non-fatal on failure
      // (the chart's dropdowns let them pick manually).
      try {
        const projectViews = await ALGORITHM.getViewsByProject(projectId)
        const overview = projectViews.find(v => v.type === 'project_overview')
        if (overview) {
          const cfg = (overview.config ?? {}) as Record<string, unknown>
          const hasTraffic =
            connBySource.posthog != null || connBySource.google_analytics != null
          const patch = { ...cfg }
          let changed = false
          if (cfg.primaryMetric == null && hasTraffic) {
            patch.primaryMetric = 'visitors'
            changed = true
          }
          if (cfg.secondaryMetric == null && connBySource.stripe != null) {
            patch.secondaryMetric = 'revenue'
            changed = true
          }
          if (changed) {
            await ALGORITHM.updateView(overview.id, { config: patch })
          }
        }
      } catch {
        /* non-fatal — metrics stay pickable from the chart */
      }

      if (selectedViews.size > 0) {
        const built = buildViewPayloads({
          selected: selectedViews,
          projectId,
          connBySource,
          posthogEventName: pickedEventName,
        })
        skippedSources = built.skippedSources

        if (built.payloads.length > 0) {
          const created = await Promise.all(
            built.payloads.map(p => ALGORITHM.createView(p)),
          )
          viewsCreated = created.length
          // Same event the dashboard's create flow fires — one event
          // per intent with the batch's types, tagged with source so
          // onboarding-created views are distinguishable in funnels.
          trackEvent(EVENT.VIEW_CREATED, {
            projectId,
            folderId: null,
            viewTypes: built.payloads.map(p => p.type),
            source: 'onboarding',
          })
        }
      }
    } catch {
      toast.error(
        "Couldn't create some views — you can add them from the dashboard any time.",
      )
    }
    if (skippedSources.length > 0) {
      const labels = skippedSources.map(s => TOOL_LABELS[s] ?? s).join(', ')
      toast.info(
        `Skipped the ${labels} views — connect ${labels} first, then add them from the dashboard.`,
      )
    }

    const ok = await markCompleteAndExit(EVENT.ONBOARDING_FINISHED, {
      tools: Array.from(selectedTools),
      views: Array.from(selectedViews),
      viewsCreated,
    })
    if (!ok) setSubmitting(false)
  }

  const handleStart = () => {
    trackEvent(EVENT.ONBOARDING_STARTED)
    setStep('tools')
  }

  const resetToolForms = useCallback(() => {
    setPhKey('')
    setPhHost(POSTHOG_HOSTS[0].id)
    setPhError(null)
    setPhProjects(null)
    setPhSelectedId('')
    setStripeName('Stripe')
    setStripeKey('')
    setStripeError(null)
    setBusy(false)
  }, [])

  /** Tools step → start the per-tool connecting sequence (or jump
   *  straight to views when nothing was selected). The "New Project"
   *  is created HERE — before any connection exists — so every
   *  manual connect can scope to it directly and the project id
   *  survives the OAuth round-trip via SavedProgress. */
  const handleToolsContinue = async () => {
    if (busy) return
    const q = TOOLS.filter(t => selectedTools.has(t.type)).map(t => t.type)
    if (q.length === 0) {
      setStep('views')
      return
    }
    setBusy(true)
    try {
      await ensureProject()
    } catch {
      // Couldn't create the project — without it connections would
      // land unscoped, so stay on this step and let the user retry.
      toast.error("Couldn't set up your project. Please try again.")
      setBusy(false)
      return
    }
    resetToolForms() // also clears `busy`
    setQueue(q)
    setQueueIndex(0)
    setStep('connecting')
  }

  /** Advance the connecting queue; exhausted → views step. */
  const advanceQueue = useCallback(() => {
    resetToolForms()
    if (queueIndex + 1 < queue.length) {
      setQueueIndex(i => i + 1)
    } else {
      setStep('views')
    }
  }, [queueIndex, queue.length, resetToolForms])

  // ── Per-tool submit handlers (shared flow lib) ─────────────────

  /**
   * Create the PostHog connection for a resolved PostHog project.
   * Shared by both paths into it: the explicit picker (2+ projects)
   * and the auto-select shortcut (exactly 1 project). Caller has
   * already set `busy`; on success the queue advance resets it, on
   * failure we surface the error inline and unlock.
   */
  const createPosthogConnection = async (project: PosthogProjectOption) => {
    try {
      await connectPosthog({
        apiKey: phKey,
        host: phHost,
        posthogProject: project,
        projectId: onbProjectId,
        source: 'onboarding',
      })
      toast.success('PostHog connected.')
      advanceQueue()
    } catch (err) {
      setPhError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't save the PostHog connection. Try again.",
      )
      setBusy(false)
    }
  }

  const handlePosthogDone = async () => {
    if (busy) return
    // Phase 1: no project list yet → validate key + fetch projects.
    if (!phProjects) {
      if (!phKey.trim()) return
      setBusy(true)
      setPhError(null)
      try {
        const data = await fetchPosthogProjects(phKey, phHost)
        // Exactly ONE project → there's no choice to make; connect
        // immediately instead of showing a one-option picker. (The
        // common solo-founder case — one PostHog project — goes
        // key → done in a single click.) On failure,
        // `createPosthogConnection` surfaces the error on the form
        // we're still showing.
        if (data.projects.length === 1) {
          await createPosthogConnection(data.projects[0])
          return
        }
        setPhProjects(data.projects)
        setPhSelectedId('')
        setBusy(false)
      } catch (err) {
        setPhError(
          err instanceof Error && err.message
            ? err.message
            : "Couldn't reach PostHog. Try again in a moment.",
        )
        setBusy(false)
      }
      return
    }
    // Phase 2: project picked → create the connection.
    const project = phProjects.find(p => p.id === phSelectedId)
    if (!project) return
    setBusy(true)
    setPhError(null)
    await createPosthogConnection(project)
  }

  const handleStripeDone = async () => {
    if (busy || !stripeKey.trim()) return
    setBusy(true)
    setStripeError(null)
    try {
      await connectStripeManual({
        name: stripeName,
        apiKey: stripeKey,
        projectId: onbProjectId,
        source: 'onboarding',
      })
      toast.success('Stripe connected.')
      advanceQueue()
    } catch (err) {
      setStripeError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't save the Stripe connection. Try again.",
      )
      setBusy(false)
    }
  }

  /** OAuth tools: persist "we're leaving for this tool's consent
   *  screen" BEFORE navigating, so the post-consent landing (hub →
   *  gate → back here) resumes past it. */
  const handleOAuthConnect = async (type: OAuthConnectionType) => {
    if (busy) return
    setBusy(true)
    try {
      saveProgress({
        step: 'connecting',
        selectedTools: Array.from(selectedTools),
        selectedViews: Array.from(selectedViews),
        queue,
        queueIndex,
        oauthPending: type,
        projectId: onbProjectId,
        posthogEventName: pickedEventName,
      })
      const { url } = await getOAuthUrlFor(type)
      window.location.href = url
    } catch {
      // Undo the pending flag — we never actually left. Without this,
      // a later reload would wrongly treat the tool as completed.
      saveProgress({
        step: 'connecting',
        selectedTools: Array.from(selectedTools),
        selectedViews: Array.from(selectedViews),
        queue,
        queueIndex,
        oauthPending: null,
        projectId: onbProjectId,
        posthogEventName: pickedEventName,
      })
      toast.error(`Failed to start ${TOOL_LABELS[type] ?? type} authorization`)
      setBusy(false)
    }
  }

  const currentTool = step === 'connecting' ? (queue[queueIndex] ?? null) : null

  // ── Which connection types ACTUALLY exist (views-step gate) ────
  // The views step offers per-tool sections by SERVER truth, not by
  // step-2 selections: a selected tool can fail its OAuth consent or
  // be explicitly skipped, and offering its views then would let the
  // user pick tiles that can't be created. `null` = still loading.
  const [connectedTypes, setConnectedTypes] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (step !== 'views') return
    let cancelled = false
    void (async () => {
      try {
        const conns = await ALGORITHM.getConnections()
        if (cancelled) return
        const types = new Set<string>()
        for (const c of conns) {
          // Section keys use 'stripe' for both Stripe flavours.
          types.add(c.type === 'stripe_manual' ? 'stripe' : c.type)
        }
        setConnectedTypes(types)
        // Latest PostHog connection — the "Track event" picker
        // dialog fetches event definitions through it.
        setPosthogConnId(
          conns
            .filter(c => c.type === 'posthog')
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ??
            null,
        )
        // Prune any stale view selections whose source never actually
        // connected (e.g. picked on a previous visit to this step) so
        // Finish doesn't toast about skipping views the user can't
        // even see anymore.
        setSelectedViews(prev => {
          const next = new Set(
            [...prev].filter(id => {
              const def = SIMPLE_VIEW_DEFS[id]
              return !def || types.has(def.source)
            }),
          )
          return next.size === prev.size ? prev : next
        })
      } catch {
        // Can't verify → degrade to the old selection-based gating
        // rather than hiding everything; Finish still safely skips
        // payloads with no connection.
        if (!cancelled) setConnectedTypes(new Set(selectedTools))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const visibleSections = VIEW_SECTIONS.filter(
    s => s.requiresTool === null || (connectedTypes?.has(s.requiresTool) ?? false),
  )
  const activeIdx = activeStepIndex(step)

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden">
      <CanvasBackground />
      <PhoneBezel />

      {/* ── Top bar — the landing page's notch, same component
            (`NotchBar` from navbar.tsx), wider to fit the step
            indicators. Content: logo · steps · sign out. ───────── */}
      <NotchBar widthClassName="w-[95%] md:w-[780px]">
        <Image
          src="/databerry_logo_v2.svg"
          alt="Databerry"
          width={24}
          height={24}
          className="md:w-[30px] md:h-[30px] rounded-lg shrink-0"
        />
        <div className="hidden sm:flex items-center gap-5 md:gap-7">
          {STEPS.map((s, i) => (
            <span key={s.id} className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i === activeIdx ? 'bg-brand' : 'bg-brand/25',
                )}
              />
              <span
                className={cn(
                  'text-sm whitespace-nowrap',
                  i === activeIdx
                    ? 'font-semibold text-grey-darkest'
                    : 'text-grey-dark',
                )}
              >
                {s.label}
              </span>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-sm font-medium text-grey-darkest underline underline-offset-2 hover:text-black transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </NotchBar>

      {/* ── Centered glass card ─────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 md:px-6 min-h-screen py-24">
        {/* Glass wrapper capped at 85vh — tall content (the PostHog
            instructions) scrolls INSIDE the white window instead of
            growing the card past the viewport. `min-h-[min(...)]`
            keeps the card pleasantly tall on short steps (Welcome)
            while still fitting small screens. */}
        <div className="rounded-2xl border-2 border-white shadow-[0_0_48px_8px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-4xl max-h-[85vh] min-h-[min(560px,85vh)] flex flex-col">
          <div className="bg-white/35 backdrop-blur-sm p-3 md:p-4 flex-1 min-h-0 flex flex-col">
            {/* The scroll container. Step content centers via the
                inner min-h-full wrapper so short steps still sit in
                the middle of the card. */}
            {/* Scroll container is a flex COLUMN so the centering
                wrapper below can `flex-1` to its full height —
                `min-h-full` (percentage min-height) resolves
                unreliably inside overflow containers and left short
                steps (Welcome) pinned to the top instead of
                vertically centered. With flex-1: short content
                stretches the wrapper → centered; tall content keeps
                its natural height → scrolls from the top, never
                clipped. */}
            <div className="bg-white rounded-xl px-5 md:px-10 py-10 md:py-14 flex-1 min-h-0 overflow-y-auto flex flex-col">
              <div className="flex-1 w-full flex flex-col items-center justify-center">
              {/* While the restore decides the real step, show a quiet
                  loading row instead of the (possibly wrong) Welcome
                  step — `step`'s initial value is just a useState
                  default, not the truth. */}
              {restoring && (
                <div className="flex items-center gap-2 text-sm text-grey-dark">
                  <ArrowsClockwise
                    size={14}
                    weight="bold"
                    className="animate-spin"
                  />
                  <span>Loading…</span>
                </div>
              )}

              {!restoring && step === 'welcome' && (
                <WelcomeStep
                  onStart={handleStart}
                  onSkip={() => void handleSkip()}
                  submitting={submitting}
                />
              )}

              {step === 'tools' && (
                <div className="flex flex-col items-center text-center w-full">
                  <h1
                    className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    Connect the tools you already use
                  </h1>
                  <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-md">
                    Select the tools you track your projects with. We&apos;ll
                    wire them into Databerry so everything lives in one
                    dashboard.
                  </p>

                  <div className="mt-8 w-full max-w-xl rounded-2xl border border-stroke bg-white shadow-card p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TOOLS.map(tool => (
                      <SelectableRow
                        key={tool.type}
                        iconType={tool.type}
                        label={tool.label}
                        selected={selectedTools.has(tool.type)}
                        onToggle={() =>
                          setSelectedTools(prev => toggle(prev, tool.type))
                        }
                      />
                    ))}
                  </div>

                  <PrimaryCta
                    label={busy ? 'Setting up…' : 'Continue'}
                    onClick={() => void handleToolsContinue()}
                    disabled={submitting || busy}
                    className="mt-10"
                  />
                  <SkipLink
                    label="Skip onboarding"
                    onClick={() => void handleSkip()}
                    disabled={submitting}
                  />
                </div>
              )}

              {step === 'connecting' && currentTool && (
                <ConnectingStep
                  tool={currentTool}
                  position={queueIndex + 1}
                  total={queue.length}
                  busy={busy}
                  onBack={() => {
                    resetToolForms()
                    setStep('tools')
                  }}
                  onSkipTool={advanceQueue}
                >
                  {currentTool === 'posthog' &&
                    (phProjects ? (
                      <div className="w-full max-w-md text-left">
                        <p className="mb-2 text-sm font-semibold text-grey-darkest">
                          Pick the PostHog project to track
                        </p>
                        <PostHogProjectSelectForm
                          projects={phProjects}
                          selectedId={phSelectedId}
                          onSelect={setPhSelectedId}
                        />
                      </div>
                    ) : (
                      <PostHogForm
                        apiKey={phKey}
                        host={phHost}
                        error={phError}
                        onApiKeyChange={setPhKey}
                        onHostChange={setPhHost}
                      />
                    ))}

                  {currentTool === 'stripe' && (
                    <StripeManualForm
                      name={stripeName}
                      apiKey={stripeKey}
                      error={stripeError}
                      onNameChange={setStripeName}
                      onApiKeyChange={setStripeKey}
                    />
                  )}

                  {(currentTool === 'sentry' ||
                    currentTool === 'google_analytics') && (
                    <p className="max-w-sm text-sm text-gray-500 leading-relaxed">
                      We&apos;ll send you to{' '}
                      <span className="font-semibold text-grey-darkest">
                        {TOOL_LABELS[currentTool]}
                      </span>{' '}
                      to authorize read-only access, then bring you right
                      back here.
                    </p>
                  )}

                  {/* Done / Connect CTA per tool */}
                  {currentTool === 'posthog' && (
                    <PrimaryCta
                      label={
                        busy
                          ? 'Working…'
                          : phProjects
                            ? 'Done'
                            : 'Continue'
                      }
                      onClick={() => void handlePosthogDone()}
                      disabled={
                        busy ||
                        (phProjects ? !phSelectedId : !phKey.trim())
                      }
                      className="mt-8"
                    />
                  )}
                  {currentTool === 'stripe' && (
                    <PrimaryCta
                      label={busy ? 'Working…' : 'Done'}
                      onClick={() => void handleStripeDone()}
                      disabled={busy || !stripeKey.trim()}
                      className="mt-8"
                    />
                  )}
                  {(currentTool === 'sentry' ||
                    currentTool === 'google_analytics') && (
                    <PrimaryCta
                      label={busy ? 'Opening…' : `Connect ${TOOL_LABELS[currentTool]}`}
                      onClick={() =>
                        void handleOAuthConnect(
                          currentTool as OAuthConnectionType,
                        )
                      }
                      disabled={busy}
                      className="mt-8"
                    />
                  )}
                </ConnectingStep>
              )}

              {step === 'views' && (
                <div className="flex flex-col items-center text-center w-full">
                  <h1
                    className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900"
                    style={{ fontFamily: 'var(--font-bricolage)' }}
                  >
                    Add data views
                  </h1>
                  <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-md">
                    Make it simple to view your data. You can always delete
                    and edit this later. Your project already includes a
                    Project Overview by default.
                  </p>

                  {/* Checking which tools ACTUALLY connected — gate
                      the sections on server truth, not selections. */}
                  {connectedTypes === null && (
                    <div className="mt-8 flex items-center gap-2 text-sm text-grey-dark">
                      <ArrowsClockwise
                        size={14}
                        weight="bold"
                        className="animate-spin"
                      />
                      <span>Checking your connections…</span>
                    </div>
                  )}

                  {/* No tools connected → no per-tool views to offer.
                      The Overview still gets created with the project,
                      so Finish isn't a dead end. */}
                  {connectedTypes !== null && visibleSections.length === 0 && (
                    <p className="mt-8 max-w-sm rounded-xl border border-dashed border-stroke bg-white px-4 py-6 text-xs text-grey-light">
                      Nothing extra to add — these options unlock when you
                      connect tools. Your dashboard starts with the Project
                      Overview.
                    </p>
                  )}

                  {connectedTypes !== null && visibleSections.length > 0 && (
                  <div className="mt-8 w-full max-w-xl rounded-2xl border border-stroke bg-white shadow-card p-3">
                    {visibleSections.map(section => (
                      <div key={section.section} className="text-left">
                        <p className="px-1 pt-2 pb-1.5 text-xs font-medium text-grey-light">
                          {section.section}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {section.options.map(opt => (
                            <SelectableRow
                              key={opt.id}
                              iconType={opt.iconType}
                              label={opt.label}
                              // Once an event is picked, the row says
                              // WHICH event it'll track — clearer than
                              // the generic blurb, and doubles as
                              // confirmation of the dialog pick.
                              desc={
                                opt.id === 'daily_counter' &&
                                selectedViews.has(opt.id) &&
                                pickedEventName
                                  ? `Tracking "${pickedEventName}"`
                                  : opt.desc
                              }
                              selected={selectedViews.has(opt.id)}
                              onToggle={() => {
                                // "Track event" needs an event to
                                // track — selecting it routes through
                                // the picker dialog (the same one the
                                // overview chart uses); the row is
                                // only marked selected on confirm.
                                // Deselecting clears the pick.
                                if (opt.id === 'daily_counter') {
                                  if (selectedViews.has(opt.id)) {
                                    setSelectedViews(prev => toggle(prev, opt.id))
                                    setPickedEventName(null)
                                  } else {
                                    setEventPickerOpen(true)
                                  }
                                  return
                                }
                                setSelectedViews(prev => toggle(prev, opt.id))
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}

                  <PrimaryCta
                    label={submitting ? 'Finishing…' : 'Finish'}
                    onClick={() => void handleFinish()}
                    disabled={submitting}
                    className="mt-10"
                  />
                  <SkipLink
                    label="Skip"
                    onClick={() => void handleSkip()}
                    disabled={submitting}
                  />
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* "Track event" picker — the SAME centered dialog the
          project-overview chart uses for PostHog → Event count, so
          the interaction (search, cards, single-select) is identical
          across surfaces. The row in the views grid is only marked
          selected once an event is confirmed here. */}
      <PosthogEventPickerDialog
        open={eventPickerOpen}
        onOpenChange={setEventPickerOpen}
        connectionId={posthogConnId}
        initialEventName={pickedEventName}
        onConfirm={name => {
          setPickedEventName(name)
          setSelectedViews(prev => {
            const next = new Set(prev)
            next.add('daily_counter')
            return next
          })
        }}
      />
    </div>
  )
}

// ── Step 1: Welcome ─────────────────────────────────────────────────────────

function WelcomeStep({
  onStart,
  onSkip,
  submitting,
}: {
  onStart: () => void
  onSkip: () => void
  submitting: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className="flex items-center gap-3 text-4xl md:text-5xl font-semibold tracking-tight text-gray-900"
        style={{ fontFamily: 'var(--font-bricolage)' }}
      >
        Welcome to{' '}
        <Image
          src="/databerry_logo_v2.svg"
          alt=""
          width={44}
          height={44}
          className="rounded-lg inline-block"
        />{' '}
        Databerry
      </h1>
      <p className="mt-4 text-base text-gray-500">
        This onboarding takes under 5 minutes
      </p>

      <PrimaryCta label="Start" onClick={onStart} disabled={submitting} className="mt-10" />
      <SkipLink label="Skip onboarding" onClick={onSkip} disabled={submitting} />
    </div>
  )
}

// ── "Connecting <tool>" shell ───────────────────────────────────────────────

/**
 * Chrome for one tool in the connect sequence: "Go back" link, brand
 * icon + "Connecting <Tool>" heading, position counter, the form
 * (children), and a per-tool skip escape hatch (a stuck user — key
 * they can't find, account they don't own — must never be trapped).
 */
function ConnectingStep({
  tool,
  position,
  total,
  busy,
  onBack,
  onSkipTool,
  children,
}: {
  tool: string
  position: number
  total: number
  busy: boolean
  onBack: () => void
  onSkipTool: () => void
  children: React.ReactNode
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
        {children}
      </div>

      <SkipLink label="Skip this tool" onClick={onSkipTool} disabled={busy} />
    </div>
  )
}

// ── Shared pieces ───────────────────────────────────────────────────────────

function PrimaryCta({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white text-sm font-semibold px-16 py-3.5 ring-4 ring-brand/20 transition-all hover:ring-brand/30 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
    >
      {label}
      <ArrowRight
        size={16}
        weight="bold"
        className="transition-transform group-hover:translate-x-0.5"
      />
    </button>
  )
}

function SkipLink({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-grey-light hover:text-grey-darkest transition-colors cursor-pointer disabled:opacity-50"
    >
      {label}
      <ArrowRight size={12} weight="bold" />
    </button>
  )
}

function SelectableRow({
  iconType,
  label,
  desc,
  selected,
  onToggle,
}: {
  iconType: string
  label: string
  desc?: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer',
        selected
          ? 'border-brand/50 bg-brand/[0.04]'
          : 'border-stroke bg-white hover:bg-hover-fill',
      )}
    >
      <span
        className={cn(
          'shrink-0 grid place-items-center w-4 h-4 rounded-full border-2 transition-colors',
          selected ? 'border-brand bg-brand text-white' : 'border-stroke',
        )}
      >
        {selected && <Check size={10} weight="bold" />}
      </span>
      <ConnectionIcon type={iconType} size={18} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-grey-darkest leading-tight">
          {label}
        </span>
        {desc && (
          <span className="block text-xs text-grey-light truncate leading-tight mt-0.5">
            {desc}
          </span>
        )}
      </span>
    </button>
  )
}
