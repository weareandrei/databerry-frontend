'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, Check, Copy, Warning } from '@phosphor-icons/react'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  ALGORITHM,
  type GAProperty,
  type StripeProductOption,
} from '@/lib/api'
import { toast } from 'sonner'
import { BottomDialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import type { Connection } from '@/types/connection'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-start gap-2 bg-muted rounded-md px-3 py-2">
        <code className="flex-1 text-xs font-mono break-all leading-relaxed">{value}</code>
        <button
          onClick={copy}
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
        </button>
      </div>
    </div>
  )
}

function VercelDetail({ connection }: { connection: Connection }) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
  const drainUrl = `${backendUrl}/webhooks/vercel/${connection.id}`

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Log Drain setup</p>
        <p className="text-sm text-muted-foreground">
          Add the URL below as a{' '}
          <span className="font-medium text-foreground">Log Drain</span> in your Vercel project
          under <span className="font-medium text-foreground">Settings → Log Drains</span>.
        </p>
      </div>

      <CopyField label="Drain URL" value={drainUrl} />

      <div className="rounded-lg border border-stroke bg-main p-3 space-y-1.5">
        <p className="text-xs font-medium text-grey-dark">Settings to use in Vercel</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Delivery format</span>
            {' — '}
            <code className="bg-muted px-1 rounded">JSON</code>
          </li>
          <li>
            <span className="font-medium text-foreground">Source</span>
            {' — '}
            <code className="bg-muted px-1 rounded">Web Analytics</code>
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-stroke bg-main p-3 space-y-1.5">
        <p className="text-xs font-medium text-grey-dark">How it works</p>
        <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
          <li>Vercel pushes Web Analytics events to this URL in real time</li>
          <li>Each event is stored and aggregated by day</li>
          <li>Your Vercel views refresh automatically as data arrives</li>
        </ul>
      </div>
    </div>
  )
}

function WebhookDetail({ connection }: { connection: Connection }) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
  const webhookUrl = `${backendUrl}/webhooks/custom/${connection.webhookId}`

  return (
    <div className="space-y-4">
      <CopyField label="Webhook URL" value={webhookUrl} />
      <p className="text-xs text-muted-foreground">
        Send POST requests with an <code className="bg-muted px-1 rounded">X-API-Key</code> header
        to this URL. Manage API keys in your dashboard settings.
      </p>
    </div>
  )
}

function GADetail({ connection, onClose }: { connection: Connection; onClose: () => void }) {
  const [properties, setProperties] = useState<GAProperty[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(connection.gaPropertyId ?? '')

  useEffect(() => {
    ALGORITHM.getGoogleAnalyticsProperties(connection.id)
      .then(res => setProperties(res.properties))
      .catch(() => toast.error('Failed to load GA4 properties'))
      .finally(() => setLoading(false))
  }, [connection.id])

  const handleSave = async () => {
    const property = properties?.find(p => p.id === selected)
    if (!property) return
    setSaving(true)
    try {
      await ALGORITHM.saveGoogleAnalyticsProperty(connection.id, property.id)
      toast.success(`Connected to "${property.displayName}"`)
      onClose()
    } catch {
      toast.error('Failed to save property. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanged = selected && selected !== connection.gaPropertyId

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select which GA4 property to track for this connection.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading properties…</p>
      ) : !properties?.length ? (
        <p className="text-sm text-muted-foreground">No GA4 properties found in this account.</p>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {properties.map(prop => (
              <Button
                key={prop.id}
                variant="outline"
                onClick={() => setSelected(prop.id)}
                className={`w-full justify-start h-auto px-3 py-2.5 ${
                  selected === prop.id ? 'border-foreground bg-muted' : ''
                }`}
              >
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">{prop.displayName}</p>
                  <p className="text-xs text-muted-foreground">{prop.name}</p>
                </div>
                {prop.id === connection.gaPropertyId && (
                  <span className="text-[10px] text-grey-light border border-stroke rounded-full px-2 py-0.5 shrink-0 ml-2">
                    Connected
                  </span>
                )}
              </Button>
            ))}
          </div>
          <Button
            className="w-full bg-brand hover:bg-brand/90 text-white"
            disabled={!hasChanged || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : connection.gaPropertyId ? 'Update property' : 'Save property'}
          </Button>
        </>
      )}
    </div>
  )
}

/**
 * Stripe product filter — same data model as the post-creation
 * `StripeProductPicker` modal (empty selection = "All products"), but inline.
 * The duplication between the two surfaces is deliberate: the post-creation
 * modal has Skip semantics (auto-save empty filter on dismiss) and a banner
 * that polls backfill status; this one is a settings panel with an explicit
 * "Save changes" button and inherits the modal's normal close behaviour.
 */
function StripeDetail({ connection, onClose }: { connection: Connection; onClose: () => void }) {
  const [products, setProducts] = useState<StripeProductOption[] | null>(null)
  const [allProducts, setAllProducts] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialKey, setInitialKey] = useState<string>('') // serialised initial state for dirty-check
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [backfillStatus, setBackfillStatus] = useState<
    'pending' | 'in_progress' | 'complete' | 'error' | null
  >(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Serialise selected/all into a stable string so we can detect "no changes
  // pending" without diffing two Sets every render.
  const serialise = (all: boolean, ids: Set<string>) =>
    all ? '<all>' : Array.from(ids).sort().join(',')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ALGORITHM.getStripeProducts(connection.id)
      .then(res => {
        if (cancelled) return
        setProducts(res.products)
        setStripeAccountId(res.stripeAccountId)
        setBackfillStatus(res.backfillStatus)
        setBackfillError(res.backfillError)
        if (res.selectedProductIds.length === 0) {
          setAllProducts(true)
          setSelected(new Set())
          setInitialKey(serialise(true, new Set()))
        } else {
          setAllProducts(false)
          const ids = new Set(res.selectedProductIds)
          setSelected(ids)
          setInitialKey(serialise(false, ids))
        }
      })
      .catch(() => toast.error('Failed to load Stripe products'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [connection.id])

  // Keep status fresh while the modal is open and backfill is still running.
  useEffect(() => {
    if (!stripeAccountId) return
    if (backfillStatus === 'complete' || backfillStatus === 'error' || backfillStatus === null) return
    const handle = setInterval(async () => {
      try {
        const status = await ALGORITHM.getStripeAccountStatus(stripeAccountId)
        setBackfillStatus(status.backfillStatus)
        setBackfillError(status.backfillError)
        if (status.backfillStatus === 'complete') {
          // Pick up any newly-discovered products.
          const refreshed = await ALGORITHM.getStripeProducts(connection.id)
          setProducts(refreshed.products)
        }
      } catch {
        /* soft-fail */
      }
    }, 5000)
    return () => clearInterval(handle)
  }, [stripeAccountId, backfillStatus, connection.id])

  const sortedProducts = useMemo(() => {
    if (!products) return []
    return [...products].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [products])

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const dirty = serialise(allProducts, selected) !== initialKey

  const handleSave = async () => {
    const ids = allProducts ? [] : Array.from(selected)
    if (!allProducts && ids.length === 0) {
      toast.error('Pick at least one product, or switch on "All products".')
      return
    }
    setSaving(true)
    try {
      await ALGORITHM.saveStripeProducts(connection.id, ids)
      toast.success(
        ids.length === 0
          ? 'Tracking all products on this connection.'
          : `Tracking ${ids.length} product${ids.length === 1 ? '' : 's'}.`,
      )
      onClose()
    } catch {
      toast.error('Failed to save selection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Mirror the picker's state machine: each backfill state gets distinct UI
  // copy, no more conflated "Still importing…" fallback.
  const isImporting =
    backfillStatus === 'pending' || backfillStatus === 'in_progress'
  const hasError = backfillStatus === 'error'
  const isComplete = backfillStatus === 'complete' || backfillStatus === null
  const hasNoProducts = isComplete && sortedProducts.length === 0
  const hasProducts = sortedProducts.length > 0
  // Toggle + list only make sense when we have something (or are still
  // importing things). With zero products, swap to a clear empty-state card.
  const showProductChooser = hasProducts || isImporting

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pick which Stripe products count toward this connection&rsquo;s revenue tiles.
      </p>

      {isImporting && (
        <div className="flex items-center gap-2 rounded-md border border-stroke bg-main px-3 py-2">
          <ArrowsClockwise size={14} weight="bold" className="text-muted-foreground animate-spin shrink-0" />
          <p className="text-xs text-muted-foreground">
            Importing 90 days of payment history… (~3 minutes). Products appear as we discover them.
          </p>
        </div>
      )}

      {hasError && (
        <div className="flex items-start gap-2 rounded-md border border-stroke bg-main px-3 py-2">
          <Warning size={14} weight="bold" className="text-destructive shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Couldn&rsquo;t finish importing.</p>
            {backfillError && <p className="break-words">{backfillError}</p>}
            <p>
              Common causes: the API key is missing the{' '}
              <span className="font-mono">Products → Read</span> or{' '}
              <span className="font-mono">Charges → Read</span> scope, or the key was revoked.
              Fix the key in Stripe and re-create this connection to retry.
            </p>
          </div>
        </div>
      )}

      {/* Empty-state card — backfill done but Stripe legitimately has no
          products on this account. Most often: test-mode key vs live-mode
          dashboard. Saving still works (writes empty filter = "all charges"),
          we just stop pretending the toggle has something to act on. */}
      {hasNoProducts && !hasError && (
        <div className="rounded-md border border-stroke bg-main px-3 py-3 space-y-2">
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

      {/* All-products toggle — only meaningful when we have a list. Hidden
          (in favor of the empty-state card) when zero products exist. */}
      {showProductChooser && (
        <button
          type="button"
          onClick={() => setAllProducts(v => !v)}
          className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
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

      {/* Product list — visible while we have something. Items are
          non-interactive while "All products" is on; toggling off makes
          them selectable. */}
      {showProductChooser && (
        <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5">
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

      <Button
        className="w-full bg-brand hover:bg-brand/90 text-white"
        disabled={!dirty || saving}
        onClick={handleSave}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  )
}

function GenericDetail({ connection }: { connection: Connection }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-stroke bg-main p-3 space-y-2">
        <Row label="Type" value={CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.type} />
        <Row label="Connected" value={new Date(connection.createdAt).toLocaleDateString()} />
        <Row label="ID" value={connection.id} mono />
      </div>
    </div>
  )
}

// Shown above every type-specific detail view. Surfaces the project scope
// (or "Common") and the integration-specific label that used to live as a
// pill on the connection list row (GA property, Vercel project) — so users
// can still see these values at a glance after we moved them off the row.
function SummaryBlock({ connection }: { connection: Connection }) {
  const { projects } = useDashboard()
  const projectName = connection.projectId
    ? (projects.projects.find(p => p.id === connection.projectId)?.name ?? 'Project')
    : 'Common (shared across projects)'

  return (
    <div className="rounded-lg border border-stroke bg-main p-3 space-y-2">
      <Row label="Project" value={projectName} />
      {connection.gaPropertyName && (
        <Row label="GA property" value={connection.gaPropertyName} />
      )}
      {connection.vercelProjectName && (
        <Row label="Vercel project" value={connection.vercelProjectName} />
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-right break-all ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}

interface ConnectionDetailModalProps {
  connection: Connection | null
  onClose: () => void
}

export function ConnectionDetailModal({ connection, onClose }: ConnectionDetailModalProps) {
  if (!connection) return null

  const displayName = CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.type

  return (
    <BottomDialog open={!!connection} onOpenChange={open => !open && onClose()}>
      <BottomDialog.Page title={connection.name}>
        <p className="-mt-1 mb-4 text-xs text-muted-foreground">{displayName}</p>
        <div className="space-y-4">
          <SummaryBlock connection={connection} />
          {connection.type === 'vercel' && <VercelDetail connection={connection} />}
          {connection.type === 'webhook' && <WebhookDetail connection={connection} />}
          {connection.type === 'google_analytics' && <GADetail connection={connection} onClose={onClose} />}
          {(connection.type === 'stripe' || connection.type === 'stripe_manual') && (
            <StripeDetail connection={connection} onClose={onClose} />
          )}
          {connection.type !== 'vercel' &&
            connection.type !== 'webhook' &&
            connection.type !== 'google_analytics' &&
            connection.type !== 'stripe' &&
            connection.type !== 'stripe_manual' && (
              <GenericDetail connection={connection} />
            )}
        </div>
      </BottomDialog.Page>
    </BottomDialog>
  )
}
