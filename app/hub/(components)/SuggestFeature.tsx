'use client'

/**
 * "Help us improve" feature-suggestion surface — shared across the
 * desktop `<IconRail>` (a primary-bg icon button whose hover reveals
 * the full card) and the bottom of the mobile home page
 * (`<MobileHomeBody>` renders `<HelpImproveCard>` directly).
 *
 * Three pieces:
 *   - `HelpImproveCard` — the presentational promo card (orange chip
 *     → heading → blurb → brand "Suggest feature" CTA). Caller wires
 *     `onSuggest` to open the dialog.
 *   - `SuggestFeatureDialog` — the modal: textarea → POST
 *     `/suggestions` (mails the founder via Resend). Owns its own
 *     text + in-flight state; parent controls open/close only.
 *   - `SuggestFeatureRailButton` — the IconRail entry point: a
 *     brand-orange icon button (white glyph) that opens the dialog on
 *     click and, on hover, floats the full `HelpImproveCard` to its
 *     right as a popover.
 */

import { useState } from 'react'
import { ChatCircleDots } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  CenterDialog,
  CenterDialogContent,
  CenterDialogTitle,
  CenterDialogDescription,
  CenterDialogHeader,
} from '@/components/ui/Dialog/CenterDialog'
import { ALGORITHM } from '@/lib/api'

export function HelpImproveCard({ onSuggest }: { onSuggest: () => void }) {
  return (
    <div className="rounded-xl border border-stroke shadow-card bg-white p-4 flex flex-col items-center text-center">
      {/* Orange chip — the visual the rail button mirrors. */}
      <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center mb-3">
        <ChatCircleDots size={22} weight="fill" className="text-white" />
      </div>
      <h3 className="text-base font-bold text-grey-darkest mb-1">Help us improve</h3>
      <p className="text-xs text-grey-dark leading-relaxed mb-4">
        Tell us the feature you need. We will add it to our todo list!
      </p>
      <button
        type="button"
        onClick={onSuggest}
        className="w-full rounded-lg bg-brand hover:bg-brand/90 text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
      >
        Suggest feature
      </button>
    </div>
  )
}

export function SuggestFeatureDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /**
   * Trim, refuse empty payloads client-side (friendlier than a 400
   * round-trip), POST, toast the outcome. On success: clear + close
   * so the next open is a clean form. On error: keep it open so the
   * user doesn't lose their typing.
   */
  const submit = async () => {
    const trimmed = text.trim()
    if (trimmed.length === 0 || submitting) return
    setSubmitting(true)
    try {
      await ALGORITHM.submitSuggestion(trimmed)
      toast.success('Thanks for feedback!')
      setText('')
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Couldn't send suggestion — ${err.message}`
          : "Couldn't send suggestion",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CenterDialog
      open={open}
      onOpenChange={next => {
        // Block close while a submit is in-flight — losing the
        // textarea content mid-network would be confusing.
        if (!next && submitting) return
        onOpenChange(next)
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
            What would make Databerry better for you? Let us know and we&apos;ll
            build it!
          </CenterDialogDescription>
        </CenterDialogHeader>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. Add a Notion connection so I can pull database rows alongside Stripe revenue."
          rows={5}
          maxLength={5000}
          disabled={submitting}
          className="w-full text-sm border border-stroke rounded-md px-3 py-2.5 bg-white outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand/40 resize-none placeholder:text-grey-light disabled:opacity-60"
          autoFocus
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs text-grey-light hover:text-grey-darkest px-3 py-2 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || text.trim().length === 0}
            className="inline-flex items-center justify-center rounded-full h-9 px-4 text-xs font-medium bg-brand hover:bg-brand/90 text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending…' : 'Send suggestion'}
          </button>
        </div>
      </CenterDialogContent>
    </CenterDialog>
  )
}

/**
 * IconRail entry point. Brand-orange icon button (white glyph,
 * matching the card's chip). Click → dialog; hover → the full
 * `HelpImproveCard` floats to the right.
 *
 * Hover is JS-controlled (not pure CSS) for reliability: the wrapper
 * holds BOTH the button and the popover, so moving the cursor into
 * the card doesn't fire the wrapper's `mouseleave`. The popover's
 * `pl-3` is a transparent bridge across the visual gap so the travel
 * path stays inside the wrapper.
 */
export function SuggestFeatureRailButton() {
  const [hovered, setHovered] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label="Help us improve"
        title="Help us improve"
        onClick={() => setDialogOpen(true)}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white shadow-sm hover:bg-brand/90 transition-colors cursor-pointer"
      >
        <ChatCircleDots size={18} weight="fill" />
      </button>

      {hovered && (
        <div className="absolute left-full bottom-0 pl-3 z-50">
          <div className="w-64">
            <HelpImproveCard onSuggest={() => setDialogOpen(true)} />
          </div>
        </div>
      )}

      <SuggestFeatureDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
