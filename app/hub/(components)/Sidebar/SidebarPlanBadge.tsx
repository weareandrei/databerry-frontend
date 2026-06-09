'use client'

/**
 * Sidebar plan card — sits at the bottom of the sidebar, above the
 * timezone row. Two sections:
 *
 *   1. "Suggest a feature" banner with a soft brand-orange gradient
 *      and a `>` caret on the right. Always visible (every user,
 *      every tier — feedback isn't tier-gated). Click opens a small
 *      centered dialog with a textarea; submitting POSTs to
 *      `/suggestions`, which mails the founder via Resend.
 *
 *      Replaced the previous "Upgrade to PRO" banner — once the
 *      Free tier was retired and the SubscriptionGate took over the
 *      "you need to pay" job, the upgrade CTA was vestigial. Better
 *      to use the visual real estate for something that runs every
 *      day: collecting feature requests directly from the people
 *      actually using the product.
 *
 *   2. A plain white section with project-usage stats and a
 *      "Manage plan" button that opens the tier picker (for
 *      upgrade / downgrade / billing management). The picker still
 *      lives here because limit-error toasts elsewhere broadcast
 *      via `useTierPickerListener` and expect this component to
 *      own the sheet.
 *
 * Card chrome (rounded-xl border + shadow-card) matches view
 * tiles — same border / radius / shadow tokens. The gradient
 * banner is clipped by the card's `overflow-hidden` so its top
 * corners round cleanly with the card.
 */

import { useCallback, useState } from 'react'
import { ChatCircleDots } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAccount } from '@/hooks/useAccount'
import { useTierPickerListener } from '@/hooks/useTierPicker'
import { TierPickerSheet } from './TierPickerSheet'
import {
  CenterDialog,
  CenterDialogContent,
  CenterDialogTitle,
  CenterDialogDescription,
  CenterDialogHeader,
} from '@/components/ui/Dialog/CenterDialog'
import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent } from '@/lib/posthog'

export function SidebarPlanBadge() {
  const { planId, loading: accountLoading } = useAccount()

  // Local sheet state — picker is the "Manage plan" entry point.
  const [tierSheetOpen, setTierSheetOpen] = useState(false)
  // Suggestion-dialog state. Open + textarea content + in-flight
  // submit flag (gates the button so a fast double-tap doesn't fire
  // two POSTs).
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false)

  // Open the picker in response to the global `openTierPicker()`
  // broadcast — fired by limit-error toasts AND the "Manage plan"
  // item in the user-email dropdown. `source` was a union when an
  // in-card button also opened it; now every open arrives via the
  // bus, so it's a single 'broadcast' value.
  const handleBroadcast = useCallback(() => {
    trackEvent(EVENT.TIER_PICKER_OPENED, { source: 'broadcast' })
    setTierSheetOpen(true)
  }, [])
  useTierPickerListener(handleBroadcast)

  /**
   * Submit the feature suggestion. Trims, refuses empty payloads
   * client-side as a friendlier failure mode than waiting for the
   * 400 round-trip, then POSTs to `/suggestions` and toasts the
   * outcome. On success: clear the textarea + close the dialog so
   * a future click opens a clean form. On error: keep the dialog
   * open so the user doesn't lose their typing.
   */
  const handleSubmitSuggestion = async () => {
    const trimmed = suggestionText.trim()
    if (trimmed.length === 0) return
    if (submittingSuggestion) return
    setSubmittingSuggestion(true)
    try {
      await ALGORITHM.submitSuggestion(trimmed)
      toast.success('Thanks for feedback!')
      setSuggestionText('')
      setSuggestionOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't send suggestion — ${err.message}`
          : "Couldn't send suggestion",
      )
    } finally {
      setSubmittingSuggestion(false)
    }
  }

  // Gate on `accountLoading` alone — used to also wait on
  // `views.totalCount` because the (now-removed) usage bars showed
  // "0/100" while the GET was in flight. With no bars to display,
  // the only thing the account row decides is which planId the
  // "Manage plan" button passes to the picker; rendering the card
  // before the planId is known is fine, the picker just opens with
  // the default behaviour.
  if (accountLoading) return null

  return (
    <>
      <div
        // Wider side margins on mobile pull the card visibly
        // narrower than the nav items above — same content, but it
        // no longer dominates the drawer just because it's the only
        // multi-section block in there. Desktop stays at `px-2` so
        // the card sits flush with the rest of the sidebar grid.
        className="px-6 md:px-2 mb-2"
      >
        {/* ── "Help us improve" card ───────────────────────────
            Centered white card: orange icon chip → heading → blurb
            → full-width brand CTA. The whole card is just a visual
            container; only the "Suggest feature" button is the
            click target (vs. the previous whole-banner button), so
            the card reads as a small promo, not a giant tap zone.
            The orange lives in the icon + CTA rather than a
            background wash now — cleaner, and the orange CTA is the
            unambiguous action. */}
        <div className="rounded-xl border border-stroke shadow-card bg-white p-4 flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center mb-3">
            <ChatCircleDots size={22} weight="fill" className="text-white" />
          </div>
          <h3 className="text-base font-bold text-grey-darkest mb-1">
            Help us improve
          </h3>
          <p className="text-xs text-grey-dark leading-relaxed mb-4">
            Tell us the feature you need. We will add it to our todo
            list!
          </p>
          <button
            type="button"
            onClick={() => setSuggestionOpen(true)}
            className="w-full rounded-lg bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
          >
            Suggest feature
          </button>
        </div>
        {/* "Manage plan" moved into the user-email dropdown
            (`<SidebarUserProfile>`) — it's a settings-shelf action,
            not a primary surface, so it belongs with Sign out. The
            `<TierPickerSheet>` is still owned here; the dropdown
            item opens it via the `openTierPicker()` broadcast. */}
      </div>

      <TierPickerSheet
        open={tierSheetOpen}
        onOpenChange={setTierSheetOpen}
        currentPlanId={planId}
      />

      {/* ── Suggest-a-feature dialog ─────────────────────────────
          Centered popup, small footprint. Textarea + submit. No
          required fields beyond "non-empty after trim" — short
          gut-reactions are as useful as long manifestos, so we
          don't gate on length client-side beyond emptiness.
          Backend caps at 5k chars to keep the inbox sensible. */}
      <CenterDialog
        open={suggestionOpen}
        onOpenChange={open => {
          // Block close while a submit is in-flight — losing the
          // textarea content mid-network would be confusing.
          if (!open && submittingSuggestion) return
          setSuggestionOpen(open)
        }}
      >
        <CenterDialogContent className="sm:max-w-md">
          <CenterDialogHeader>
            <CenterDialogTitle
              className="text-base md:text-lg font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-bricolage)' }}
            >
              Suggest a feature
            </CenterDialogTitle>
            <CenterDialogDescription className="text-sm leading-relaxed">
              What would make Databerry better for you?
              Let us know and we'll build it!
            </CenterDialogDescription>
          </CenterDialogHeader>

          <textarea
            value={suggestionText}
            onChange={e => setSuggestionText(e.target.value)}
            placeholder="e.g. Add a Notion connection so I can pull database rows alongside Stripe revenue."
            rows={5}
            maxLength={5000}
            disabled={submittingSuggestion}
            className="w-full text-sm border border-stroke rounded-md px-3 py-2.5 bg-white outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand/40 resize-none placeholder:text-grey-light disabled:opacity-60"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSuggestionOpen(false)}
              disabled={submittingSuggestion}
              className="text-xs text-grey-light hover:text-grey-darkest px-3 py-2 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitSuggestion}
              disabled={submittingSuggestion || suggestionText.trim().length === 0}
              className="inline-flex items-center justify-center rounded-full h-9 px-4 text-xs font-medium bg-brand hover:bg-brand/90 text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingSuggestion ? 'Sending…' : 'Send suggestion'}
            </button>
          </div>
        </CenterDialogContent>
      </CenterDialog>
    </>
  )
}

