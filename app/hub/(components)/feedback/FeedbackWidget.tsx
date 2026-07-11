'use client'

/**
 * In-dashboard satisfaction survey. Lives at fixed bottom-right of
 * the `/hub/*` viewport. Four visual stages:
 *
 *   1. CLOSED  — only the round emoji button (no text). Friction-
 *                reducing visual: a single smiley face that *looks*
 *                like the first emoji in the ladder, so opening the
 *                widget feels like a continuation of clicking it
 *                rather than a context switch.
 *   2. RATING  — popover above the icon, 5 large emoji faces
 *                (😞 🙁 😐 🙂 😄). Click advances to COMPOSE. This
 *                is the DEFAULT stage on first mount per browser
 *                session — see `useEffect` below — so a user landing
 *                on the dashboard immediately sees the ladder and
 *                understands that leaving feedback is one click away.
 *   3. COMPOSE — picked-emoji header + back-arrow, optional textarea
 *                "Want to share your thoughts?", Submit button. Empty
 *                comment is allowed (rating-only submission).
 *   4. THANKS  — brief 🙏 confirmation, auto-dismisses after 2.4 s.
 *
 * Dismissal memory:
 * Once a user closes (X) or submits, we set a `sessionStorage` flag
 * so the auto-open behaviour doesn't pester them on every page
 * refresh within the same tab session. Across browser sessions
 * (new tab, restart) the ladder reappears — a once-per-session
 * surveys volume that's loud-enough-to-notice without being a
 * nag. `localStorage` would have been too sticky (the user would
 * never see the picker again after their first dismissal); a
 * blanket "always open" would be infuriating on refresh.
 *
 * Mounted at the `<HubLayout>` root so it follows the user across
 * every `/hub/*` route. Inside `/hub` we know the user is authed →
 * no need to hide the widget on logout (the auth redirect handles
 * that).
 *
 * Why not a centred modal: surveys interrupt flow when they take
 * focus from the whole viewport. A small anchored popover keeps
 * the user's current context visible behind it; if they change
 * their mind mid-pick they just click outside and the widget
 * collapses without nagging.
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useClickOutside } from '@/hooks/useClickOutside'
import { ALGORITHM } from '@/lib/api'

/**
 * The emoji ladder. Index 0..4 map to ratings 1..5. Order is
 * intentionally low-to-high so the widget renders left-to-right as
 * "worst → best" which matches every other NPS-style survey users
 * have seen.
 *
 * Keep `value` in sync with `backend/src/feedback/feedback.service.ts`
 * `RATING_EMOJI` — the rating number is the source of truth on the
 * wire, the emojis here are just the picker UI.
 */
const RATINGS: { value: 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { value: 1, emoji: '😞', label: 'Very unhappy' },
  { value: 2, emoji: '🙁', label: 'Unhappy' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Happy' },
  { value: 5, emoji: '😄', label: 'Very happy' },
]

type Stage = 'closed' | 'rating' | 'compose' | 'thanks'

/**
 * `localStorage` keys for the two persistence states. Persisted
 * (not session-scoped) because the user's intent is per-account,
 * not per-tab:
 *
 *   - `DISMISSED_FLAG` — set when the user explicitly closes the
 *     auto-opened ladder (X button OR Cancel button — both register
 *     as "no thanks, not now"). Click-outside does NOT set this
 *     flag: that's an ambiguous gesture (the user might have been
 *     reaching for dashboard content behind the popover) and using
 *     it to permanently suppress the ladder felt aggressive.
 *
 *   - `SUBMITTED_FLAG` — set after a successful submission. Once
 *     this is set, the widget unmounts entirely on the next page
 *     load — no icon, no popover, no surface area. We collected
 *     the feedback, no need to keep asking. (If the user wants to
 *     send a follow-up, the public `/contact` form on the landing
 *     page is the right channel.)
 *
 * Three resulting flows the user can see:
 *   - Fresh user (neither flag set)  → ladder auto-opens.
 *   - Explicitly dismissed           → just the 🙂 icon; click to
 *                                       open the ladder again.
 *   - Already submitted              → nothing renders.
 */
const DISMISSED_FLAG = 'db_feedback_widget_dismissed'
const SUBMITTED_FLAG = 'db_feedback_widget_submitted'

export function FeedbackWidget() {
  // `hidden` short-circuits the render to `null` after a successful
  // submission (or on first mount for users who already submitted
  // in a previous session). Starts `true` so the SSR pass renders
  // nothing — the `useEffect` below reveals the widget on the
  // client once it's read the localStorage flags. Better a brief
  // pop-in than a flash-of-widget for users who've already
  // submitted.
  const [hidden, setHidden] = useState(true)
  const [stage, setStage] = useState<Stage>('closed')
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Ref wraps BOTH the popover and the trigger pill so a click on
  // the trigger doesn't immediately register as "outside" and
  // re-close the popover the same tick it just opened.
  const containerRef = useRef<HTMLDivElement>(null)

  // Decide initial visibility + stage from localStorage, with an
  // 18-second grace period before anything appears. Runs ONCE on
  // mount.
  //
  // The delay applies to BOTH the popover AND the dismissed-user
  // 🙂 icon — the goal is "let the user look at their dashboard
  // first, then surface the survey". Without it, the widget lands
  // simultaneously with the dashboard data, fights for attention,
  // and gets reflexively dismissed before the user even reads it.
  // Eighteen seconds gives the user time to scan their first row
  // of tiles AND read at least one of them in detail; short enough
  // that engaged users still see the prompt during a typical
  // session before they navigate away.
  //
  // Submitted users skip the timer entirely — they're never
  // getting the widget back, no point scheduling a callback that
  // just no-ops.
  useEffect(() => {
    let submitted = false
    let dismissed = false
    try {
      submitted = localStorage.getItem(SUBMITTED_FLAG) === '1'
      dismissed = localStorage.getItem(DISMISSED_FLAG) === '1'
    } catch {
      // localStorage disabled (private mode, hardened browser).
      // Treat as fresh user — the delayed reveal below still
      // applies; dismissals just won't persist across reloads.
    }

    if (submitted) return

    const timer = setTimeout(() => {
      setHidden(false)
      // Fresh user (no dismissal flag) → auto-open the ladder.
      // Dismissed user → leave at `'closed'` so just the 🙂 icon
      // shows; click to re-open.
      if (!dismissed) setStage('rating')
    }, 18_000)

    // Cleanup: if the layout unmounts before the timer fires
    // (route change, sign-out, etc.) the scheduled state setters
    // would call into a stale component. Clearing the timer
    // prevents the React "set state on unmounted component"
    // warning and avoids a wasted reveal on a hidden page.
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useClickOutside(containerRef, () => {
    // Don't close mid-submit — the network call should resolve into
    // either the thanks card or an error toast on its own; ripping
    // the popover out underneath it would lose the thank-you frame.
    if (submitting) return
    if (stage === 'closed') return
    // Click-outside is an AMBIGUOUS dismissal — the user may have
    // been reaching for the dashboard underneath, not opting out of
    // the survey. Collapse the popover (so the dashboard is fully
    // usable) but DO NOT persist the dismissal. The auto-open will
    // try again on the next page load. Explicit X / Cancel is what
    // sets the localStorage flag.
    collapsePopover()
  })

  /**
   * Collapse the popover to the closed state WITHOUT persisting
   * dismissal. Used by click-outside (an ambiguous "I want my
   * dashboard back" gesture) and as the building block both
   * explicit-dismissal paths reuse.
   */
  const collapsePopover = () => {
    setStage('closed')
    setRating(null)
    setMessage('')
  }

  /**
   * Explicit dismissal — user clicked X or Cancel. Same as
   * `collapsePopover` but also writes the localStorage flag so the
   * auto-open `useEffect` skips the ladder on future page loads.
   * From here on out the user only sees the 🙂 icon until they
   * choose to open it themselves.
   */
  const closeAndDismiss = () => {
    collapsePopover()
    try {
      localStorage.setItem(DISMISSED_FLAG, '1')
    } catch {
      /* private mode — dismissal won't persist, accept that */
    }
  }

  const handlePickRating = (value: 1 | 2 | 3 | 4 | 5) => {
    setRating(value)
    setStage('compose')
  }

  const handleSubmit = async () => {
    if (rating == null) return
    setSubmitting(true)
    try {
      await ALGORITHM.submitFeedback(rating, message.trim() || null)
      setStage('thanks')
      // Successful submission — flag this account as "already
      // submitted" so the widget never renders again on any future
      // page load. The thank-you card stays visible in this session
      // for 2.4 s, then we unmount the widget entirely.
      try {
        localStorage.setItem(SUBMITTED_FLAG, '1')
      } catch {
        /* private mode — we'll just re-prompt next session; not the
           end of the world */
      }
      setTimeout(() => {
        setHidden(true)
      }, 2400)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't send feedback — ${err.message}`
          : "Couldn't send feedback",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRating = rating ? RATINGS.find(r => r.value === rating) : null

  // Submitted-forever / SSR-pass short-circuit. Render NOTHING so
  // the corner of the viewport is fully clean — no icon to nag the
  // user, no DOM node to wonder about in devtools.
  if (hidden) return null

  return (
    // `fixed bottom-4 right-4 md:bottom-6 md:right-6`: anchors to the
    // viewport corner. Mobile gets less margin so the pill doesn't
    // crowd against the thumb-reach zone; desktop has more breathing
    // room. `z-40` keeps it below `z-50` modals (so opening a sheet
    // covers the widget cleanly) but above page content.
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end"
    >
      {/* Popover. Renders ABOVE the trigger pill (the trigger stays
          visible in place underneath) so the user always sees the
          source of the popover. `mb-3` separates the popover from
          the trigger pill. `w-80` is wide enough for the 5-emoji
          row at comfortable spacing on every viewport. */}
      {stage !== 'closed' && (
        <div className="mb-3 w-80 rounded-2xl border border-stroke bg-white shadow-card overflow-hidden">
          {/* ── Stage: rating picker ────────────────────────────── */}
          {stage === 'rating' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  How are you finding Databerry?
                </h3>
                <button
                  type="button"
                  onClick={closeAndDismiss}
                  className="inline-flex size-6 items-center justify-center rounded-md text-subtle hover:text-foreground hover:bg-hover-fill transition-colors cursor-pointer"
                  aria-label="Close feedback"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
              {/* The emoji row. `text-3xl` keeps the faces large
                  enough to read as a feeling rather than as an
                  icon. Hover lift + brand-tinted halo gives a
                  satisfying "this is the one I'm about to pick"
                  beat without committing yet. */}
              <div className="grid grid-cols-5 gap-1">
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handlePickRating(r.value)}
                    aria-label={r.label}
                    title={r.label}
                    className="group flex items-center justify-center aspect-square rounded-xl text-3xl transition-all hover:bg-primary/10 hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
              {/* Hint copy below the ladder. The emojis themselves
                  already signal what to do — "tap a face" was
                  redundant. The non-obvious bit is that engaging is
                  optional: the popover can be closed and revisited
                  later via the 🙂 icon, so we tell the user that
                  instead. Reduces the pressure of "I have to answer
                  this right now" when they're mid-task. */}
              <p className="mt-2 text-[11px] text-subtle text-center">
                You can close this and come back to it later.
              </p>
            </div>
          )}

          {/* ── Stage: compose ──────────────────────────────────── */}
          {stage === 'compose' && selectedRating && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setStage('rating')}
                  className="inline-flex items-center gap-1 text-xs text-subtle hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Back to rating"
                >
                  <ArrowLeft size={12} weight="bold" />
                  <span>Change rating</span>
                </button>
                <button
                  type="button"
                  onClick={closeAndDismiss}
                  className="inline-flex size-6 items-center justify-center rounded-md text-subtle hover:text-foreground hover:bg-hover-fill transition-colors cursor-pointer"
                  aria-label="Close feedback"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
              {/* Show the picked emoji as the new "header" — visual
                  confirmation that we registered the rating, so the
                  user doesn't second-guess what they tapped. */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl leading-none">{selectedRating.emoji}</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedRating.label}
                </span>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Want to share your thoughts?
                </span>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Optional — anything on your mind?"
                  rows={4}
                  maxLength={2000}
                  className="mt-1.5 w-full text-sm border border-stroke rounded-md px-3 py-2 bg-white outline-none focus:ring-1 focus:ring-brand/30 focus:border-primary/40 resize-none placeholder:text-subtle"
                  autoFocus
                />
              </label>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAndDismiss}
                  disabled={submitting}
                  className="text-xs text-subtle hover:text-foreground px-2 py-1 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cn(
                    'inline-flex items-center justify-center rounded-full h-8 px-4 text-xs font-medium transition-colors cursor-pointer',
                    'bg-primary text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {submitting ? 'Sending…' : 'Send feedback'}
                </button>
              </div>
            </div>
          )}

          {/* ── Stage: thanks ───────────────────────────────────── */}
          {stage === 'thanks' && (
            <div className="p-5 text-center">
              <p className="text-3xl mb-2" aria-hidden="true">
                🙏
              </p>
              <p className="text-sm font-semibold text-foreground mb-1">
                Thanks for the feedback!
              </p>
              <p className="text-xs text-subtle">
                Andrei reads every one of these personally.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Trigger — round emoji-only button. Renders ONLY when the
          popover is closed; once the dialog opens, the trigger is
          hidden so there's never two emoji affordances on screen at
          once (the popover already exposes 5 emojis at full size —
          a 6th in the corner underneath would be visual noise).

          The 🙂 face is a deliberate visual link to the rating
          ladder: opening the widget should feel like "I'm
          continuing with this emoji conversation," not like
          switching to a separate dialog.

          Round (vs. pill with text) keeps the affordance ultra-
          compact so it doesn't compete with dashboard content. The
          intent — "leave feedback" — is conveyed by the smiley
          alone, the same way an envelope icon conveys "message"
          without a "Send mail" label. Larger on desktop (`h-14`)
          than mobile (`h-12`) because pointer targets stay easy to
          hit at both scales without dominating the layout. */}
      {stage === 'closed' && (
        <button
          type="button"
          onClick={() => setStage('rating')}
          aria-expanded={false}
          aria-label="Open feedback widget"
          className="inline-flex items-center justify-center rounded-full border border-stroke bg-white shadow-card h-12 w-12 md:h-14 md:w-14 text-2xl md:text-3xl leading-none hover:bg-hover-fill hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <span aria-hidden="true">🙂</span>
        </button>
      )}
    </div>
  )
}
