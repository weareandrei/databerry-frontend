'use client'

/**
 * BottomDialog — bottom-sheet curtain built on `@base-ui/react/drawer`.
 *
 * Base-UI's `Drawer` primitive bakes in click-outside dismissal, ESC,
 * focus trap, scroll lock, and CSS-driven open/close animations via
 * data-state attrs. We compose those parts and add our internal
 * page-stack on top.
 *
 * ## Visual model
 *
 * The popup uses the *dashboard surface colour* (`bg-main`) — i.e. the
 * sheet looks like a giant dashboard card sliding up from the bottom.
 * Page content can be rendered in one of two ways:
 *
 * - `bodyVariant='plain'` (default) — content sits directly on the
 *   dashboard background, the way every existing picker-style page
 *   already does.
 * - `bodyVariant='card'` — content is wrapped in a white card with
 *   border + shadow + padding, mirroring `ViewWrapper`. Used for
 *   "settings" pages (connection detail) where the dialog needs a clear
 *   primary surface to draw the eye to.
 *
 * Per-Page `bodyMaxWidth` lets card pages cap the content width so a
 * narrow form doesn't stretch across an ultrawide screen.
 *
 * ## Header model
 *
 * The default header is a centered title + a close button on the right.
 * Pages can override either side:
 *
 * - `headerLeft` — replaces the title slot. Used to put a logo + name +
 *   metadata cluster at the left of the connection-detail dialog.
 * - `headerRight` — replaces the close button. Used to put a project
 *   picker + close button (or, when there are unsaved changes, save +
 *   cancel buttons) into the right slot.
 *
 * ## Unsaved-changes arbitration
 *
 * When `dirty` is true on the root `BottomDialog`, click-outside / ESC
 * are *intercepted*: instead of closing, we trigger a brief bounce
 * animation on whatever the page rendered into `headerRight` (typically
 * the save/cancel cluster). The page is responsible for the actual save
 * and cancel actions; the dialog only steers the user's attention.
 *
 * The bounce trigger is a counter (`bounceTick`) handed to the page via
 * `headerRight` props — incrementing it re-runs the framer-motion
 * `whileInView`-style key animation. Pages that don't render a
 * `headerRight` ignore the counter; click-outside on a clean dialog
 * still closes normally.
 */

import {
  Children,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { X } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

interface BottomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /**
   * Are there unsaved changes? When true, the dialog refuses to close on
   * click-outside / ESC and instead nudges the page's headerRight (the
   * save/cancel cluster) with a bounce animation.
   *
   * Pages can opt-in to the bounce by passing a `bounce` prop into their
   * own headerRight content (see `BottomDialog.Page` `headerRight`
   * factory below).
   */
  dirty?: boolean
  /** Optional className merged into the sheet container. */
  className?: string
  /**
   * Optional positioned ancestor to contain the dialog inside.
   *   - **Omitted (default)**: the dialog portals to `<body>` and uses
   *     `fixed` positioning with `vh`-based sizing — fills the bottom
   *     of the actual viewport.
   *   - **Provided**: the dialog portals into this element and uses
   *     `absolute` positioning with `%`-based sizing — fills the bottom
   *     of this element instead. Use this when embedding the dialog
   *     inside a constrained surface (e.g. the landing-page
   *     `InteractableDemo` card) so the dialog doesn't escape the
   *     surface. The element MUST be `position: relative` (or any
   *     non-static) and ideally `overflow: hidden` so the rounded
   *     bottom of the sheet is clipped cleanly.
   */
  container?: HTMLElement | null
}

/**
 * Render-prop signature for the slot helpers. Pages get a `bounce` counter
 * that increments every time the user attempts to dismiss the dialog with
 * unsaved changes — wire it into the `key` of a framer-motion node to
 * re-run an animation, or feed it into a useEffect to trigger any other
 * attention-getter.
 */
interface PageSlotContext {
  bounce: number
}

type PageSlot = ReactNode | ((ctx: PageSlotContext) => ReactNode)

interface BottomDialogPageProps {
  /**
   * Header title. Cross-fades when it changes. Optional — when
   * `headerLeft` is supplied, the title is omitted (the slot replaces
   * the entire title row).
   */
  title?: string
  /** Optional icon rendered immediately to the LEFT of the title text
   *  (e.g. a connection's brand logo on a setup form). Sits inside the
   *  same vertically-centered header row as the back arrow + title. */
  titleIcon?: ReactNode
  /** When provided, renders a back chevron in the header. */
  onBack?: () => void
  /** Stable id used by AnimatePresence to slide the body on swap.
   *  Defaults to `title` — usually fine; set explicitly when two pages
   *  share a title (e.g. a "Connecting…" step that exists for multiple
   *  integrations). */
  pageKey?: string

  /** Replaces the default title with a richer left-side cluster (e.g.
   *  logo + name + metadata in the connection-detail dialog). */
  headerLeft?: PageSlot
  /** Replaces the default close button. Receives the bounce counter so
   *  unsaved-changes nudges can animate the save/cancel cluster. */
  headerRight?: PageSlot

  /**
   * Default `'card'`. Every dialog wraps its body in a white card with
   * border + shadow + padding — the dashboard's primary-surface
   * convention applied to the bottom sheet. The card stretches to fill
   * the body (so the dashboard bg never bleeds through below the
   * content) and scrolls internally when content overflows.
   *
   * `'plain'` is an escape hatch — content sits directly on bg-main
   * with no wrapper. Reserved for the rare case where the page IS its
   * own panel (e.g. a full-bleed media viewer); not used today. Reach
   * for it only when the card chrome actively interferes with the
   * design — not just because the content happens to be a grid of
   * cards (those look fine inside the white body, with `bg-card` items
   * distinguishing themselves via their own ring shadows).
   */
  bodyVariant?: 'plain' | 'card'
  /** Max-width applied to the content (or the wrapping card). Any valid
   *  CSS width value — `'42rem'`, `'640px'`, etc. */
  bodyMaxWidth?: string

  children: ReactNode
}

function Page(_props: BottomDialogPageProps): null {
  // Marker component — never renders directly. BottomDialog reads its props
  // out of `Children` and renders them into the sheet chrome.
  return null
}

// Two class variants depending on whether the dialog is contained in a
// custom element. Default (full viewport): `fixed` + `vh`-based sizing.
// Contained: `absolute` + `%`-based sizing so the dialog respects its
// parent's bounds instead of the viewport's.
const BACKDROP_CLASS_BASE =
  'inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-xs ' +
  'transition-opacity duration-300 ease-out ' +
  'data-starting-style:opacity-0 data-ending-style:opacity-0'
const BACKDROP_CLASS_FIXED = `fixed ${BACKDROP_CLASS_BASE}`
const BACKDROP_CLASS_CONTAINED = `absolute ${BACKDROP_CLASS_BASE}`

// `min-h-[50vh]` floors the sheet so a sparsely-populated dialog (e.g. a
// connection with only one product, or a freshly-loaded view picker) still
// reads as a substantial surface and not a popup-sized strip. `max-h-[92vh]`
// caps the upper bound so we never eat the whole screen. Inside that range
// the popup is content-driven; the body's `flex-1` carries any extra
// vertical space, which the `card` body variant claims via `min-h-full`
// (so the white card visually fills the dialog rather than leaving the
// dashboard background bleeding through below it).
//
// Background is `bg-main` — the same colour as the dashboard surface — so
// the sheet reads as "the dashboard, slid up" rather than a separate UI
// element. The white-card variant lives inside the body, not on the popup
// itself, mirroring how dashboard cards sit on the dashboard.
const POPUP_CLASS_BASE =
  'inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl ' +
  'bg-main text-foreground ring-1 ring-foreground/10 outline-none ' +
  'transition-transform ease-out duration-300 ' +
  'data-starting-style:translate-y-full data-ending-style:translate-y-full'
const POPUP_CLASS_FIXED = `fixed min-h-[50vh] max-h-[92vh] ${POPUP_CLASS_BASE}`
// Contained variant uses `%` of the containing element. Same proportions
// (~50% min, ~92% max) so the visual weight tracks the parent surface.
const POPUP_CLASS_CONTAINED = `absolute min-h-[50%] max-h-[92%] ${POPUP_CLASS_BASE}`

function resolveSlot(slot: PageSlot | undefined, ctx: PageSlotContext): ReactNode {
  if (slot == null) return null
  if (typeof slot === 'function') return slot(ctx)
  return slot
}

function BottomDialog({
  open,
  onOpenChange,
  children,
  dirty = false,
  className,
  container,
}: BottomDialogProps) {
  // Pick the first Page child whose host condition rendered. Callers
  // typically write `{view === 'list' && <Page …/>}` for each step; only the
  // matching one will be a real element here.
  const pages = Children.toArray(children).filter(
    (c): c is ReactElement<BottomDialogPageProps> => isValidElement(c) && c.type === Page,
  )
  const current = pages[0]
  const pageKey = current?.props.pageKey ?? current?.props.title ?? '__empty__'

  // Bounce counter: incremented every time the user tries to dismiss while
  // `dirty=true`. Pages thread this into a framer-motion `key` to re-run
  // an animation (see ConnectionDetailModal's save/cancel cluster).
  const [bounceTick, setBounceTick] = useState(0)
  // Reset when the dialog opens fresh — otherwise the counter would carry
  // across re-opens of the same connection and the very first attempt to
  // close-while-clean might see a stale bounce.
  useEffect(() => {
    if (open) setBounceTick(0)
  }, [open])

  // Intercept open-change events: when the parent says "close" but we have
  // unsaved changes, swallow the close and bounce instead. We can't always
  // tell from the event whether it was click-outside vs a programmatic
  // close — but programmatic closes from the page (e.g. after save) flow
  // through `onOpenChange(false)` *with* `dirty=false` because the page
  // resets dirty before it closes, so the arbitration here is safe.
  const handleOpenChange = (next: boolean) => {
    if (!next && dirty) {
      setBounceTick(t => t + 1)
      return
    }
    onOpenChange(next)
  }

  const slotCtx: PageSlotContext = { bounce: bounceTick }
  const headerLeft = resolveSlot(current?.props.headerLeft, slotCtx)
  const headerRight = resolveSlot(current?.props.headerRight, slotCtx)
  // Default body variant is `'card'` — see `BottomDialogPageProps`.
  const bodyVariant = current?.props.bodyVariant ?? 'card'
  const bodyMaxWidth = current?.props.bodyMaxWidth

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      // Disable swipe-to-dismiss explicitly. Base-UI sets it via the
      // `dismissible` prop on Root in some versions; on the version we use
      // we instead have to neutralize it visually (no cursor-grab, no pull
      // pill, no swipe transform) — interactions still work because base-ui
      // skips swipe tracking on interactive children.
    >
      <DrawerPrimitive.Portal container={container ?? undefined}>
        <DrawerPrimitive.Backdrop
          className={container ? BACKDROP_CLASS_CONTAINED : BACKDROP_CLASS_FIXED}
        />
        <DrawerPrimitive.Popup
          className={cn(container ? POPUP_CLASS_CONTAINED : POPUP_CLASS_FIXED, className)}
        >
          {/* Header row. No background — it sits on the popup's `bg-main`
              directly. Three slots: optional back arrow, headerLeft (or
              fallback title), headerRight (or fallback close button). */}
          {/* `items-center` vertically centers the back arrow, the
              optional title icon, the title, and the right-side actions
              against each other. (Was `items-start` + a `mt-1` nudge on
              the arrow, which only approximated alignment.) */}
          <div className="flex shrink-0 select-none items-center gap-3 px-5 pt-4 pb-3">
            {current?.props.onBack ? (
              <button
                type="button"
                onClick={current.props.onBack}
                aria-label="Back"
                className="-ml-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}

            {headerLeft ? (
              <div className="min-w-0 flex-1">{headerLeft}</div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {current?.props.titleIcon ? (
                  <span className="shrink-0 inline-flex items-center">
                    {current.props.titleIcon}
                  </span>
                ) : null}
                <DrawerPrimitive.Title
                  data-slot="dialog-title"
                  className="min-w-0 flex-1 truncate font-heading text-lg font-semibold tracking-tight"
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
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2">
              {headerRight ?? (
                // Default close: round white pill with a subtle drop
                // shadow, matching the connection logo on the left and
                // the rest of the app's "icon-in-a-pill" pattern. Used
                // for every dialog that doesn't override `headerRight`.
                <DrawerPrimitive.Close
                  data-slot="dialog-close"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-stroke bg-white text-grey-darkest shadow-pill transition-colors hover:bg-hover-fill cursor-pointer"
                >
                  <X size={14} weight="bold" />
                  <span className="sr-only">Close</span>
                </DrawerPrimitive.Close>
              )}
            </div>
          </div>

          {/* Body — native scroll. `flex-1` in the popup's flex-col makes
              this take the height left over after the header, with the
              popup's `min-h-[50vh]` providing the floor. We avoid nesting
              a *second* flex container inside (overflow-y-auto + flex
              children was eating the inner height); instead, the card
              variant uses `min-h-full` to stretch — same effect, simpler
              chain. */}
          <div className="flex-1 overflow-y-auto px-5 pb-6 pt-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pageKey}
                initial={{ x: 28, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -28, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                // `min-h-full` only on the card variant. For plain pages
                // (picker grids) we want the content to sit at its
                // natural height with bg-main flowing below it.
                className={bodyVariant === 'card' ? 'min-h-full' : undefined}
              >
                {bodyVariant === 'card' ? (
                  // Card variant: white-bg card with the same chrome as a
                  // dashboard view tile. `min-h-full` makes the card at
                  // least body height (so a sparse form fills the dialog
                  // floor); when content overflows, the card grows
                  // naturally and the body's `overflow-y-auto` scrolls.
                  // The `bodyMaxWidth` cap applies to the *content inside*
                  // the card, left-aligned, so a narrow form doesn't
                  // stretch across the entire card.
                  <div className="min-h-full rounded-xl border border-stroke bg-white p-5 shadow-card">
                    <div style={bodyMaxWidth ? { maxWidth: bodyMaxWidth } : undefined}>
                      {current?.props.children}
                    </div>
                  </div>
                ) : (
                  // Plain variant: content sits directly on bg-main. No
                  // vertical stretch — the picker grids look fine sitting
                  // at their natural height with bg-main filling below.
                  <div style={bodyMaxWidth ? { maxWidth: bodyMaxWidth } : undefined}>
                    {current?.props.children}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}

BottomDialog.Page = Page

export {
  BottomDialog,
  type BottomDialogProps,
  type BottomDialogPageProps,
  type PageSlotContext as BottomDialogPageSlotContext,
}
