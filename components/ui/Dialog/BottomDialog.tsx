'use client'

/**
 * BottomDialog — bottom-sheet curtain built on `@base-ui/react/drawer`.
 *
 * Base-UI's `Drawer` primitive bakes in everything a bottom sheet needs:
 * swipe-to-dismiss with proper scroll arbitration, click-outside dismissal,
 * ESC, focus trap, scroll lock, and animation hooks via data-state attrs.
 * We compose those parts and add our internal page-stack on top.
 *
 * ## API
 *
 * The chrome (handle, header w/ back+title+X, scroll body) lives on
 * `BottomDialog`. Inner content is described via one or more
 * `<BottomDialog.Page>` children — typically gated by the caller's own
 * state machine. Only one Page renders at a time; switching `pageKey`
 * triggers a horizontal slide on the body and a cross-fade on the title.
 *
 * ```tsx
 * <BottomDialog open={open} onOpenChange={setOpen}>
 *   {view === 'list' && (
 *     <BottomDialog.Page title="New connection">
 *       <IntegrationGrid items={INTEGRATIONS} onSelect={…} />
 *     </BottomDialog.Page>
 *   )}
 *   {view === 'stripe-choose' && (
 *     <BottomDialog.Page title="Connect Stripe" onBack={() => setView('list')}>
 *       …
 *     </BottomDialog.Page>
 *   )}
 * </BottomDialog>
 * ```
 *
 * ## Animation model
 *
 * Drawer mechanics (open/close slide, swipe tracking, snap-back) are
 * driven entirely by Tailwind `data-*` variants and base-ui's CSS
 * variables — same approach as `CenterDialog`. The only framer-motion
 * usage left is the page-stack title cross-fade and body horizontal
 * slide, which key off our own `pageKey` (a value base-ui has no
 * concept of).
 *
 * The popup transform layers like this:
 *
 * - At rest: inline `transform: translateY(var(--drawer-swipe-movement-y, 0px))`
 *   resolves to `translateY(0)` (the var is `0px` when not swiping).
 * - On open mount: `data-starting-style:translate-y-full` wins over the
 *   inline transform via Tailwind's utility specificity, so the sheet
 *   starts off-screen. Next frame, the data-attr drops and the
 *   `transition-transform` on the base class slides it up.
 * - On close: `data-ending-style:translate-y-full` re-applies; sheet
 *   slides down; base-ui waits for `transitionend` before unmounting.
 * - During swipe: base-ui sets its own inline `transform` per frame and
 *   adds `data-swiping`, which kills the CSS transition so the sheet
 *   tracks the finger 1:1.
 * - Release timing: `--drawer-swipe-strength` (0.1–1, written by base-ui
 *   based on flick velocity) scales the snap-back duration.
 *
 * Buttons / inputs / links inside the body keep working because base-ui's
 * `useSwipeDismiss` ignores `button,a,input,select,textarea,label,
 * [role="button"]` targets when deciding whether to start a swipe.
 */

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface BottomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** Optional className merged into the sheet container. */
  className?: string
}

interface BottomDialogPageProps {
  /** Header title. Cross-fades when it changes. */
  title: string
  /** When provided, renders a back chevron in the header. */
  onBack?: () => void
  /** Stable id used by AnimatePresence to slide the body on swap.
   *  Defaults to `title` — usually fine; set explicitly when two pages
   *  share a title (e.g. a "Connecting…" step that exists for multiple
   *  integrations). */
  pageKey?: string
  children: ReactNode
}

function Page(_props: BottomDialogPageProps): null {
  // Marker component — never renders directly. BottomDialog reads its props
  // out of `Children` and renders them into the sheet chrome.
  return null
}

const BACKDROP_CLASS =
  'fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs ' +
  'transition-opacity duration-300 ease-out ' +
  'data-starting-style:opacity-0 data-ending-style:opacity-0'

// `max-h-[85vh]` caps the sheet so it never eats the whole screen when the
// content is large, but the popup is otherwise content-driven (no `min-h`,
// no forced height) — short pickers stay short and don't leave empty space
// below the last row. Internal scroll on the body handles overflow.
const POPUP_CLASS =
  'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl ' +
  'bg-popover text-popover-foreground ring-1 ring-foreground/10 outline-none touch-none ' +
  'transition-transform ease-out duration-[calc(300ms*var(--drawer-swipe-strength,1))] ' +
  'data-starting-style:translate-y-full data-ending-style:translate-y-full ' +
  'data-swiping:transition-none'

function BottomDialog({ open, onOpenChange, children, className }: BottomDialogProps) {
  // Pick the first Page child whose host condition rendered. Callers
  // typically write `{view === 'list' && <Page …/>}` for each step; only the
  // matching one will be a real element here.
  const pages = Children.toArray(children).filter(
    (c): c is ReactElement<BottomDialogPageProps> => isValidElement(c) && c.type === Page,
  )
  const current = pages[0]
  const pageKey = current?.props.pageKey ?? current?.props.title ?? '__empty__'

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Backdrop className={BACKDROP_CLASS} />
        <DrawerPrimitive.Popup
          // The inline transform is the at-rest state. base-ui overrides
          // it with its own per-frame transform during a swipe; the
          // `data-starting-style` / `data-ending-style` Tailwind utilities
          // override it on enter / exit. See the file docstring.
          style={{ transform: 'translateY(var(--drawer-swipe-movement-y, 0px))' }}
          className={cn(POPUP_CLASS, className)}
        >
          {/* iOS-style pull pill — purely decorative. Drag works from
              anywhere on the popup chrome (base-ui ignores button/input
              targets, so interactive children still click). */}
          <div className="flex shrink-0 justify-center pb-1 pt-2">
            <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header row. `cursor-grab` hints draggability; the actual
              gesture handling is base-ui's. Title cross-fades on page swap. */}
          <div className="flex shrink-0 cursor-grab select-none items-center gap-2 px-5 pb-4 pt-2">
            {current?.props.onBack ? (
              <button
                type="button"
                onClick={current.props.onBack}
                aria-label="Back"
                className="-ml-1.5 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}
            <DrawerPrimitive.Title
              data-slot="dialog-title"
              className="flex-1 truncate font-heading text-lg font-semibold tracking-tight"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={pageKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block"
                >
                  {current?.props.title ?? ''}
                </motion.span>
              </AnimatePresence>
            </DrawerPrimitive.Title>
            <DrawerPrimitive.Close
              data-slot="dialog-close"
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </DrawerPrimitive.Close>
          </div>

          {/* Body — native scroll. base-ui's useSwipeDismiss arbitrates:
              scrolling inside the body doesn't trigger a dismiss; reaching
              scroll-top and continuing to pull down does. */}
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pageKey}
                initial={{ x: 28, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -28, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {current?.props.children}
              </motion.div>
            </AnimatePresence>
          </div>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}

BottomDialog.Page = Page

export { BottomDialog, type BottomDialogProps, type BottomDialogPageProps }
