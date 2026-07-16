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
 * See `useOnboardingProgress` for the persistence + verified-resume.
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
import { DATABERRY_LOGO_PATH } from '@/constants/brand'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { CanvasBackground } from '@/app/(components)/CanvasBackground'
import { PhoneBezel } from '@/app/(components)/PhoneBezel'
import { NotchBar } from '@/app/(components)/navbar'
import { PosthogEventPickerDialog } from '@/app/hub/(components)/widgets/(components)/PosthogEventPickerDialog'
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
import type { Connection } from '@/types/connection'
import { SIMPLE_VIEW_DEFS, buildViewPayloads } from '@/lib/onboarding/views'
import {
  STEPS,
  activeStepIndex,
  TOOLS,
  TOOL_LABELS,
  VIEW_SECTIONS,
} from './constants'
import {
  useOnboardingProgress,
  saveProgress,
  clearProgress,
} from './useOnboardingProgress'
import { WelcomeStep } from './(components)/WelcomeStep'
import { ToolsStep } from './(components)/ToolsStep'
import { ConnectingStep } from './(components)/ConnectingStep'
import { ViewsStep } from './(components)/ViewsStep'

const toggle = (set: Set<string>, value: string): Set<string> => {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  // Flow-position state (step, selections, connect-queue position,
  // the lazily-created project, the picked event) + the `restoring`
  // gate all live in the persistence hook — it's exactly what
  // round-trips through localStorage and the OAuth detour.
  const {
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
    pickedEventName,
    setPickedEventName,
  } = useOnboardingProgress()

  // ── "Track event" picker state (views step) ────────────────────
  // Selecting the daily_counter view opens the same centered
  // PostHog event picker the project-overview chart uses; the
  // picked event becomes the view's `config.eventName` at Finish.
  const [eventPickerOpen, setEventPickerOpen] = useState(false)
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
  }, [onbProjectId, setOnbProjectId])

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
  }, [queueIndex, queue.length, resetToolForms, setQueueIndex, setStep])

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

  const onToggleTool = (type: string) =>
    setSelectedTools(prev => toggle(prev, type))

  const onToggleView = (optId: string) => {
    // "Track event" needs an event to track — selecting it routes
    // through the picker dialog (the same one the overview chart
    // uses); the row is only marked selected on confirm. Deselecting
    // clears the pick.
    if (optId === 'daily_counter') {
      if (selectedViews.has(optId)) {
        setSelectedViews(prev => toggle(prev, optId))
        setPickedEventName(null)
      } else {
        setEventPickerOpen(true)
      }
      return
    }
    setSelectedViews(prev => toggle(prev, optId))
  }

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
          src={DATABERRY_LOGO_PATH}
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
                  i === activeIdx ? 'bg-primary' : 'bg-primary/25',
                )}
              />
              <span
                className={cn(
                  'text-sm whitespace-nowrap',
                  i === activeIdx
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground',
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
          className="text-sm font-medium text-foreground underline underline-offset-2 hover:text-black transition-colors cursor-pointer"
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <ToolsStep
                  selectedTools={selectedTools}
                  onToggleTool={onToggleTool}
                  busy={busy}
                  submitting={submitting}
                  onContinue={() => void handleToolsContinue()}
                  onSkip={() => void handleSkip()}
                />
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
                  posthog={{
                    projects: phProjects,
                    selectedId: phSelectedId,
                    onSelect: setPhSelectedId,
                    apiKey: phKey,
                    host: phHost,
                    error: phError,
                    onApiKeyChange: setPhKey,
                    onHostChange: setPhHost,
                    onDone: () => void handlePosthogDone(),
                  }}
                  stripe={{
                    name: stripeName,
                    apiKey: stripeKey,
                    error: stripeError,
                    onNameChange: setStripeName,
                    onApiKeyChange: setStripeKey,
                    onDone: () => void handleStripeDone(),
                  }}
                  onOAuthConnect={type => void handleOAuthConnect(type)}
                />
              )}

              {step === 'views' && (
                <ViewsStep
                  loading={connectedTypes === null}
                  sections={visibleSections}
                  selectedViews={selectedViews}
                  pickedEventName={pickedEventName}
                  onToggleView={onToggleView}
                  submitting={submitting}
                  onFinish={() => void handleFinish()}
                  onSkip={() => void handleSkip()}
                />
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
