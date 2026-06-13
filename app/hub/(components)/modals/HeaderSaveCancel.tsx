'use client'

/**
 * Shared header-action clusters for `BottomDialog.Page`'s `headerRight`
 * slot.
 *
 * - `HeaderSaveCancel` — primary save + secondary cancel pair, used by
 *   every form-bearing bottom dialog. Replaces the default close-X so
 *   the user's save/cancel intent lives in the same spot across the
 *   whole app (connection detail, create-connection forms, create-view
 *   forms). Re-runs a quick scale animation whenever `bounce`
 *   increments — the dialog uses this to flag "you have unsaved
 *   changes" when the user tries to dismiss via backdrop / Esc.
 *
 * - `HeaderCloseButton` — round white-pill close X, used when a page
 *   has no save semantics (post-success info panels, list-style
 *   pickers). Kept as a named export so dialogs can mix-and-match
 *   without having to re-style the X to match the BottomDialog's
 *   built-in close.
 *
 * History: both components used to live as private functions inside
 * `ConnectionDetailModal.tsx`. They were extracted when the
 * create-connection and create-view modals adopted the same
 * top-right-save/cancel pattern, and we needed the bounce + brand-
 * coloured save button in three places.
 */

import { motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function HeaderSaveCancel({
  onSave,
  onCancel,
  saving,
  disabled = false,
  bounce,
  saveLabel = 'Save changes',
  savingLabel = 'Saving…',
  cancelLabel = 'Cancel',
}: {
  onSave: () => void
  onCancel: () => void
  saving: boolean
  /**
   * `true` when the form isn't yet submittable — typically empty
   * required fields. Combines with `saving` (in-flight submission) to
   * disable the save button. Kept separate from `saving` because the
   * caller's "is the form valid" predicate doesn't always match
   * "is a save in flight"; treating them as one mixes the two states.
   */
  disabled?: boolean
  /**
   * Increments every time the dialog's `dirty` guard intercepted a
   * dismiss attempt. We thread it through framer-motion's `key` so the
   * whole cluster re-mounts and replays the scale animation — visual
   * cue that the user's save button is what they want.
   */
  bounce: number
  saveLabel?: string
  savingLabel?: string
  cancelLabel?: string
}) {
  return (
    <motion.div
      // Key ties to bounce so the whole cluster re-mounts and replays
      // the bounce animation. The first render (bounce=0) plays once
      // on entry, which doubles as an "unsaved changes appeared"
      // affordance.
      key={bounce}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.08, 0.98, 1] }}
      transition={{ duration: 0.32, ease: 'easeOut', times: [0, 0.4, 0.7, 1] }}
      className="flex items-center gap-2"
    >
      <Button
        size="sm"
        onClick={onSave}
        disabled={saving || disabled}
        className="bg-brand text-white hover:bg-brand/90"
      >
        {saving ? savingLabel : saveLabel}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
        disabled={saving}
      >
        {cancelLabel}
      </Button>
    </motion.div>
  )
}

export function HeaderCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-grey-darkest shadow-pill transition-colors hover:bg-hover-fill cursor-pointer"
    >
      <X size={14} weight="bold" />
    </button>
  )
}
