'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowsClockwise, Check, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { ALGORITHM, type StripeProductOption } from '@/lib/api'
import { useDashboard } from '@/contexts/DashboardContext'

/**
 * Post-creation Stripe product picker.
 *
 * Triggers off `?stripe=select-products&connectionId=…` so it can be reached
 * from any place that creates a Stripe connection (manual API key form,
 * Connect OAuth callback). The connection is already saved by the time we
 * land here — the picker only writes the per-connection product filter.
 *
 * Mirrors the GA property picker UX (one selection per connection, dialog
 * dismiss = "skip"), but adds:
 *   - "All products" toggle at the top (default ON, empty filter persisted),
 *   - multi-select checkbox list when toggled OFF,
 *   - "Importing 90 days of payment history…" banner while the underlying
 *     stripe_accounts row reports `backfill_status !== 'complete'`.
 */
export function StripeProductPicker() {
  const searchParams = useSearchParams()
  const { connections } = useDashboard()
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [products, setProducts] = useState<StripeProductOption[] | null>(null)
  const [allProducts, setAllProducts] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Track the full backfill state machine, not just a boolean. We need to
  // distinguish "importing" from "completed-but-empty" from "errored" — they
  // each get distinct UI copy.
  const [backfillStatus, setBackfillStatus] = useState<
    'pending' | 'in_progress' | 'complete' | 'error' | null
  >(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const backfillComplete = backfillStatus === 'complete' || backfillStatus === null
  // We keep the polling timer outside React state so unmounts (route changes,
  // dialog dismiss) cancel cleanly without an extra render.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Open: read query params, fetch products + selection ────────────────────
  //
  // Depends on `searchParams` (not `[]`) so the manual-API-key flow works:
  // that path uses `router.push` from the create-connection modal, which is
  // a soft client-side navigation — the picker stays mounted, only the URL
  // changes. With `[]` deps the effect never re-fires and the modal silently
  // never opens. The OAuth path is a full redirect so it would mount fresh
  // anyway; making the effect reactive covers both.
  //
  // The `cid === connectionId` guard prevents re-fetching the same connection
  // when React re-renders (e.g. after we save and clear the URL via dismiss).
  useEffect(() => {
    const status = searchParams.get('stripe')
    const cid = searchParams.get('connectionId')
    if (status !== 'select-products' || !cid) return
    if (cid === connectionId) return

    setConnectionId(cid)
    setLoading(true)
    ALGORITHM.getStripeProducts(cid)
      .then(res => {
        setProducts(res.products)
        setStripeAccountId(res.stripeAccountId)
        setBackfillStatus(res.backfillStatus)
        setBackfillError(res.backfillError)
        // Existing filter (empty = "all") drives the initial UI state — this
        // also makes "edit later from settings" work via the same modal.
        if (res.selectedProductIds.length === 0) {
          setAllProducts(true)
          setSelected(new Set())
        } else {
          setAllProducts(false)
          setSelected(new Set(res.selectedProductIds))
        }
      })
      .catch(() => {
        toast.error('Failed to load Stripe products')
        dismiss()
      })
      .finally(() => setLoading(false))
  }, [searchParams, connectionId])

  // ── Poll backfill status while it isn't complete ──────────────────────────
  // Backfill happens server-side; the modal reads the live snapshot of
  // `stripe_products` regardless, so when more products land we re-fetch.
  useEffect(() => {
    if (!stripeAccountId || backfillComplete) return
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const status = await ALGORITHM.getStripeAccountStatus(stripeAccountId)
        setBackfillStatus(status.backfillStatus)
        setBackfillError(status.backfillError)
        if (status.backfillStatus === 'complete' || status.backfillStatus === 'error') {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
          }
          // Refresh the product list — backfill writes products as it goes,
          // but the final pass may have added a few more.
          if (connectionId) {
            const res = await ALGORITHM.getStripeProducts(connectionId)
            setProducts(res.products)
          }
        }
      } catch {
        // Soft-fail — modal still works on what it has.
      }
    }, 5000)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [stripeAccountId, backfillComplete, connectionId])

  const dismiss = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setProducts(null)
    setConnectionId(null)
    setStripeAccountId(null)
    setSelected(new Set())
    setAllProducts(true)
    setBackfillStatus(null)
    setBackfillError(null)
    window.history.replaceState({}, '', '/hub/connections')
  }

  /**
   * Skip / close without explicit action: persist "All products" so the
   * connection has a defined filter (empty rows = all). The connection works
   * out of the box; user can revisit later.
   */
  const handleClose = async () => {
    if (!connectionId || saving) {
      dismiss()
      return
    }
    try {
      await ALGORITHM.saveStripeProducts(connectionId, [])
      connections.loadConnections()
    } catch {
      // Silent — the default in the DB is also "no rows" which means "all".
    }
    dismiss()
  }

  const handleSave = async () => {
    if (!connectionId) return
    const ids = allProducts ? [] : Array.from(selected)
    if (!allProducts && ids.length === 0) {
      toast.error('Pick at least one product, or switch on "All products".')
      return
    }
    setSaving(true)
    try {
      await ALGORITHM.saveStripeProducts(connectionId, ids)
      toast.success(
        ids.length === 0
          ? 'Stripe connected — tracking all products.'
          : `Stripe connected — tracking ${ids.length} product${ids.length === 1 ? '' : 's'}.`,
      )
      connections.loadConnections()
      dismiss()
    } catch {
      toast.error('Failed to save selection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Sort: active first, then by name. Server already does it; this is a
  // safety net for cached/stale orderings.
  const sortedProducts = useMemo(() => {
    if (!products) return []
    return [...products].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [products])

  if (!connectionId) return null

  // ── State machine for the body ──────────────────────────────────────────
  // Four meaningful states, each gets its own UI block. We *don't* fall back
  // to "Still importing…" for any failure mode — that copy was misleading
  // when backfill was actually complete-with-zero-products or errored.
  const isImporting =
    backfillStatus === 'pending' || backfillStatus === 'in_progress'
  const hasError = backfillStatus === 'error'
  const hasNoProducts = backfillComplete && sortedProducts.length === 0
  const hasProducts = sortedProducts.length > 0

  // When there are no products at all, the "All products" toggle is still
  // semantically valid (empty filter = "track all charges on this account"),
  // but pre-checking a checkbox of nothing reads as a UX bug. Hide it and
  // replace with a clear empty-state card; saving still writes the empty
  // filter, which is what we want.
  const showProductChooser = hasProducts || isImporting

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Track which products?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pick the Stripe products that should count toward this connection's revenue tiles. You
            can change this later from the connection settings.
          </DialogDescription>
        </DialogHeader>

        {isImporting && (
          <div className="flex items-center gap-2 rounded-md border border-stroke bg-main px-3 py-2 mt-1">
            <ArrowsClockwise size={14} weight="bold" className="text-muted-foreground animate-spin shrink-0" />
            <p className="text-xs text-muted-foreground">
              Importing 90 days of payment history… (~3 minutes). Products appear as we discover them.
            </p>
          </div>
        )}

        {hasError && (
          <div className="flex items-start gap-2 rounded-md border border-stroke bg-main px-3 py-2 mt-1">
            <Warning size={14} weight="bold" className="text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Couldn&rsquo;t finish importing.</p>
              {backfillError && <p className="break-words">{backfillError}</p>}
              <p>
                Common causes: the API key is missing the <span className="font-mono">Products → Read</span>{' '}
                or <span className="font-mono">Charges → Read</span> scope, or the key was revoked.
                Fix the key in Stripe and re-create this connection to retry.
              </p>
            </div>
          </div>
        )}

        {/* Empty-state card — backfill is done but Stripe legitimately has no
            products on this account. The most common cause is a test-mode key
            (`rk_test_…`) pointing at a live-mode product catalog (or vice
            versa); they're separate datasets in Stripe. */}
        {hasNoProducts && !hasError && (
          <div className="rounded-md border border-stroke bg-main px-3 py-3 mt-1 space-y-2">
            <p className="text-sm font-medium">No products found on this Stripe account.</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>
                If you&rsquo;re using a <span className="font-mono">rk_test_…</span> key, products
                must exist in <strong>test mode</strong> — live-mode products won&rsquo;t show up.
                Toggle test mode in your Stripe Dashboard to confirm.
              </li>
              <li>
                Make sure your Restricted Key has{' '}
                <span className="font-mono">Products → Read</span> enabled (under Core resources).
              </li>
              <li>
                If you don&rsquo;t use Stripe Products, you can still save — every charge will count
                as &ldquo;all products&rdquo;.
              </li>
            </ul>
          </div>
        )}

        {/* All-products toggle — only meaningful when there's a list to toggle
            against. With zero products, the toggle is hidden in favor of the
            empty-state card above. */}
        {showProductChooser && (
          <button
            type="button"
            onClick={() => setAllProducts(v => !v)}
            className={`mt-2 flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
              allProducts ? 'border-foreground bg-muted' : 'border-stroke hover:bg-main'
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                allProducts ? 'border-foreground bg-foreground text-background' : 'border-stroke'
              }`}
            >
              {allProducts && <Check size={10} weight="bold" />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">
                All products
                {sortedProducts.length > 0 && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({sortedProducts.length})
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Every charge on this Stripe account counts. Default and recommended.
              </p>
            </div>
          </button>
        )}

        {/* Product list — visible while we have something to show. Items are
            non-interactive while "All products" is on; toggling off makes
            them selectable. Hidden entirely in the no-products empty state. */}
        {showProductChooser && (
          <div className="mt-2 max-h-72 overflow-y-auto pr-1 space-y-1.5">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading products…</p>
            ) : sortedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Products will appear here as we discover them…
              </p>
            ) : (
              sortedProducts.map(p => {
                const checked = allProducts ? true : selected.has(p.id)
                const interactive = !allProducts
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => interactive && toggleProduct(p.id)}
                    disabled={!interactive}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                      checked ? 'border-foreground bg-muted' : 'border-stroke'
                    } ${interactive ? 'hover:bg-main cursor-pointer' : 'cursor-default opacity-70'} ${
                      p.active ? '' : 'opacity-60'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                        checked ? 'border-foreground bg-foreground text-background' : 'border-stroke'
                      }`}
                    >
                      {checked && <Check size={10} weight="bold" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.active ? p.id : `${p.id} · archived`}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            {hasNoProducts ? 'Cancel' : 'Skip'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : hasNoProducts ? 'Save & track all charges' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
