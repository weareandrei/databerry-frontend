'use client'

/**
 * "Help us improve" feature-suggestion surface — used on the mobile
 * home page (`<MobileHomeBody>` renders `<HelpImproveCard>` directly).
 *
 * Two pieces:
 *   - `HelpImproveCard` — the presentational promo card (orange chip
 *     → heading → blurb → brand "Suggest feature" CTA). Caller wires
 *     `onSuggest` to open the dialog.
 *   - `SuggestFeatureDialog` — the modal: textarea → POST
 *     `/suggestions` (mails the founder via Resend). Owns its own
 *     text + in-flight state; parent controls open/close only.
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
      <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center mb-3">
        <ChatCircleDots size={22} weight="fill" className="text-white" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">Help us improve</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Tell us the feature you need. We will add it to our todo list!
      </p>
      <button
        type="button"
        onClick={onSuggest}
        className="w-full rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2.5 transition-colors cursor-pointer"
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
          <CenterDialogTitle className="text-base md:text-lg font-semibold tracking-tight">
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
          className="w-full text-sm border border-stroke rounded-md px-3 py-2.5 bg-white outline-none focus:ring-1 focus:ring-brand/30 focus:border-primary/40 resize-none placeholder:text-subtle disabled:opacity-60"
          autoFocus
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs text-subtle hover:text-foreground px-3 py-2 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || text.trim().length === 0}
            className="inline-flex items-center justify-center rounded-full h-9 px-4 text-xs font-medium bg-primary hover:bg-primary/90 text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending…' : 'Send suggestion'}
          </button>
        </div>
      </CenterDialogContent>
    </CenterDialog>
  )
}
