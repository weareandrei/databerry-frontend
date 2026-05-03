/**
 * Barrel for the Dialog folder.
 *
 * Two flavours live here:
 *  - `CenterDialog` (and its parts) — the original centered popup, used for
 *    confirmations and small forms.
 *  - `BottomDialog` — the bottom-sheet curtain with internal page navigation,
 *    used for the multi-step flagship modals (create connection, create
 *    view, connection detail).
 *
 * The pre-existing `Dialog`/`DialogContent`/etc. names continue to work as
 * legacy aliases — exported below — so older callers only need to bump the
 * import path casing (`@/components/ui/dialog` → `@/components/ui/Dialog`)
 * without renaming any of the symbols they pulled out. There used to be a
 * `dialog.tsx` shim that did this for them, but on case-insensitive
 * filesystems (macOS APFS) it collided with this folder's name; aliasing
 * here avoids that problem.
 */

export {
  CenterDialog,
  CenterDialogClose,
  CenterDialogContent,
  CenterDialogDescription,
  CenterDialogFooter,
  CenterDialogHeader,
  CenterDialogOverlay,
  CenterDialogPortal,
  CenterDialogTitle,
  CenterDialogTrigger,
} from './CenterDialog'

export { BottomDialog } from './BottomDialog'
export type {
  BottomDialogProps,
  BottomDialogPageProps,
  BottomDialogPageSlotContext,
} from './BottomDialog'

// Legacy name aliases — kept so existing callers don't need a sweeping
// rename in the same diff that introduced the folder split. Migrate these
// to `CenterDialog*` opportunistically.
export {
  CenterDialog as Dialog,
  CenterDialogTrigger as DialogTrigger,
  CenterDialogPortal as DialogPortal,
  CenterDialogClose as DialogClose,
  CenterDialogOverlay as DialogOverlay,
  CenterDialogContent as DialogContent,
  CenterDialogHeader as DialogHeader,
  CenterDialogFooter as DialogFooter,
  CenterDialogTitle as DialogTitle,
  CenterDialogDescription as DialogDescription,
} from './CenterDialog'
