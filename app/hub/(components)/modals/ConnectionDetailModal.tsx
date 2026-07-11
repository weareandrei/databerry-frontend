'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowsClockwise,
  CaretDown,
  Check,
  Copy,
  Cube,
  Warning,
} from '@phosphor-icons/react'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  ALGORITHM,
  type GAProperty,
  type StripeProductOption,
} from '@/lib/api'
import { toast } from 'sonner'
import {
  BottomDialog,
  type BottomDialogPageSlotContext,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import {
  HeaderSaveCancel,
  HeaderCloseButton,
} from './(components)/HeaderSaveCancel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconBadge } from '@/components/ui/IconBadge'
import { ConnectionIcon } from '@/app/hub/(components)/connections/(components)/ConnectionIcon'
import type { Connection } from '@/types/connection'
import type { Project } from '@/types/project'

// ───────────────────────────────────────────────────────────────────────────
// Header parts
// ───────────────────────────────────────────────────────────────────────────

/** "logo + name + created" cluster on the left of the header. */
function ConnectionHeaderLeft({ connection }: { connection: Connection }) {
  const created = new Date(connection.createdAt)
  const createdLabel = `Created ${created.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`
  return (
    <div className="flex items-center gap-3 min-w-0">
      <IconBadge size={36}>
        <ConnectionIcon type={connection.type} size={18} />
      </IconBadge>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight">
          {connection.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{createdLabel}</p>
      </div>
    </div>
  )
}

/** Compact project picker — same shape as `CreateConnectionModal.ProjectPicker`,
 *  redesigned to fit the header right slot. Renders a dropdown of available
 *  projects + a "Common (shared)" option. */
function HeaderProjectPicker({
  projects,
  value,
  onChange,
  disabled,
}: {
  projects: Project[]
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
}) {
  const selected = value ? projects.find(p => p.id === value) : null
  const label = selected?.name ?? 'Common'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md border border-stroke bg-white px-2.5 py-1.5 text-[12px] font-medium text-foreground shadow-sm transition-colors hover:bg-hover-fill disabled:opacity-60"
      >
        <Cube size={11} weight="bold" className="shrink-0 text-muted-foreground" />
        <span className="max-w-[140px] truncate">{label}</span>
        <CaretDown size={9} weight="bold" className="shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuItem onClick={() => onChange(null)} className="gap-2 text-sm">
          <span className="w-4 shrink-0">
            {value === null && <Check size={12} weight="bold" />}
          </span>
          <span className="flex-1">Common (shared)</span>
        </DropdownMenuItem>
        {projects.length === 0 ? (
          <DropdownMenuItem disabled className="text-xs text-subtle">
            No projects yet.
          </DropdownMenuItem>
        ) : (
          projects.map(p => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => onChange(p.id)}
              className="gap-2 text-sm"
            >
              <span className="w-4 shrink-0">
                {value === p.id && <Check size={12} weight="bold" />}
              </span>
              <Cube size={11} weight="bold" className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{p.name}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// `HeaderSaveCancel` and `HeaderCloseButton` moved to a shared file
// (`./HeaderSaveCancel`) so the create-connection and create-view modals
// can render the same top-right cluster. Imported above.

// ───────────────────────────────────────────────────────────────────────────
// Per-type detail hooks
//
// Each returns the same shape: { dirty, saving, save, cancel, body }. The
// modal stitches the body into the dialog and the dirty flag into the close
// arbitration. When a connection type doesn't have anything editable
// (Vercel / Webhook / Generic), it returns dirty=false and save/cancel
// no-ops — the user just sees a close button.
// ───────────────────────────────────────────────────────────────────────────

interface DetailUIState {
  dirty: boolean
  saving: boolean
  save: () => Promise<void>
  cancel: () => void
  /** Wraps the body in the dialog's white card via `bodyVariant='card'`. */
  body: React.ReactNode
}

// ── Stripe ────────────────────────────────────────────────────────────────

function useStripeDetailUI({
  connection,
  onClose,
}: {
  connection: Connection
  onClose: () => void
}): DetailUIState {
  const [products, setProducts] = useState<StripeProductOption[] | null>(null)
  const [allProducts, setAllProducts] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialKey, setInitialKey] = useState<string>('')
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [backfillStatus, setBackfillStatus] = useState<
    'pending' | 'in_progress' | 'complete' | 'error' | null
  >(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  // Backfill polling — fetch fresh status every 5s until it resolves.
  useEffect(() => {
    if (!stripeAccountId) return
    if (backfillStatus === 'complete' || backfillStatus === 'error' || backfillStatus === null)
      return
    const handle = setInterval(async () => {
      try {
        const status = await ALGORITHM.getStripeAccountStatus(stripeAccountId)
        setBackfillStatus(status.backfillStatus)
        setBackfillError(status.backfillError)
        if (status.backfillStatus === 'complete') {
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

  const dirty = !loading && serialise(allProducts, selected) !== initialKey

  const save = async () => {
    const ids = allProducts ? [] : Array.from(selected)
    if (!allProducts && ids.length === 0) {
      toast.error('Pick at least one product, or switch on "All products".')
      return
    }
    setSaving(true)
    try {
      await ALGORITHM.saveStripeProducts(connection.id, ids)
      // Reset initialKey *before* closing — onOpenChange runs through the
      // dirty-arbitration check, and we don't want a stale dirty flag to
      // trigger a bounce on the close that follows a successful save.
      setInitialKey(serialise(allProducts, selected))
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

  const cancel = () => {
    // Restore initial selection.
    if (initialKey === '<all>') {
      setAllProducts(true)
      setSelected(new Set())
    } else {
      setAllProducts(false)
      setSelected(new Set(initialKey.split(',').filter(Boolean)))
    }
  }

  const isImporting =
    backfillStatus === 'pending' || backfillStatus === 'in_progress'
  const hasError = backfillStatus === 'error'
  const isComplete = backfillStatus === 'complete' || backfillStatus === null
  const hasNoProducts =
    !loading && isComplete && sortedProducts.length === 0
  const hasProducts = sortedProducts.length > 0
  const showProductChooser = hasProducts || isImporting || loading

  const body = (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Selected products</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Databerry will filter your revenue and other data only based on
          selected products.
        </p>
      </div>

      {isImporting && (
        <div className="flex items-center gap-2 rounded-md border border-stroke bg-surface px-3 py-2">
          <ArrowsClockwise
            size={14}
            weight="bold"
            className="text-muted-foreground animate-spin shrink-0"
          />
          <p className="text-xs text-muted-foreground">
            Importing 90 days of payment history… (~3 minutes). Products
            appear as we discover them.
          </p>
        </div>
      )}

      {hasError && (
        <div className="flex items-start gap-2 rounded-md border border-stroke bg-surface px-3 py-2">
          <Warning size={14} weight="bold" className="text-destructive shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Couldn&rsquo;t finish importing.</p>
            {backfillError && <p className="break-words">{backfillError}</p>}
            <p>
              Common causes: the API key is missing the{' '}
              <span className="font-mono">Products → Read</span> or{' '}
              <span className="font-mono">Charges → Read</span> scope, or the
              key was revoked. Fix the key in Stripe and re-create this
              connection to retry.
            </p>
          </div>
        </div>
      )}

      {/* Loading state — distinct from "no products". A blank "no products
          found" while we're still fetching is misleading; we show a clear
          spinner row instead and reserve the empty state for when the
          backend has confirmed there really are zero products. */}
      {loading && !isImporting && !hasError && (
        <div className="flex items-center gap-2 rounded-md border border-stroke bg-surface px-3 py-2.5">
          <ArrowsClockwise
            size={14}
            weight="bold"
            className="text-muted-foreground animate-spin shrink-0"
          />
          <p className="text-xs text-muted-foreground">Loading products…</p>
        </div>
      )}

      {hasNoProducts && !hasError && (
        <div className="rounded-md border border-stroke bg-surface px-3 py-3 space-y-2">
          <p className="text-sm font-medium">
            No products found on this Stripe account.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>
              If you&rsquo;re using a <span className="font-mono">rk_test_…</span> key,
              products must exist in <strong>test mode</strong> — live-mode products
              won&rsquo;t show up. Toggle test mode in your Stripe Dashboard to
              confirm.
            </li>
            <li>
              Make sure your Restricted Key has{' '}
              <span className="font-mono">Products → Read</span> enabled (under
              Core resources).
            </li>
            <li>
              If you don&rsquo;t use Stripe Products, you can still save —
              every charge will count as &ldquo;all products&rdquo;.
            </li>
          </ul>
        </div>
      )}

      {showProductChooser && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setAllProducts(v => !v)}
            className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
              allProducts ? 'border-foreground bg-muted' : 'border-stroke hover:bg-surface'
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

          {!loading && sortedProducts.length > 0 && (
            <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5">
              {sortedProducts.map(p => {
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
                    } ${interactive ? 'hover:bg-surface cursor-pointer' : 'cursor-default opacity-70'} ${
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
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return { dirty, saving, save, cancel, body }
}

// ── Google Analytics ──────────────────────────────────────────────────────

function useGADetailUI({
  connection,
  onClose,
}: {
  connection: Connection
  onClose: () => void
}): DetailUIState {
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

  const dirty = !!selected && selected !== connection.gaPropertyId

  const save = async () => {
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

  const cancel = () => setSelected(connection.gaPropertyId ?? '')

  const body = (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">GA4 property</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Select which GA4 property to track for this connection.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-md border border-stroke bg-surface px-3 py-2.5">
          <ArrowsClockwise
            size={14}
            weight="bold"
            className="text-muted-foreground animate-spin shrink-0"
          />
          <p className="text-xs text-muted-foreground">Loading properties…</p>
        </div>
      ) : !properties?.length ? (
        <p className="text-sm text-muted-foreground">
          No GA4 properties found in this account.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                <span className="text-[10px] text-subtle border border-stroke rounded-full px-2 py-0.5 shrink-0 ml-2">
                  Connected
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  )

  return { dirty, saving, save, cancel, body }
}

// ── Read-only details (Vercel, Webhook, Generic) ──────────────────────────

function useReadonlyDetailUI({ body }: { body: React.ReactNode }): DetailUIState {
  return {
    dirty: false,
    saving: false,
    save: async () => {},
    cancel: () => {},
    body,
  }
}

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

function VercelBody({ connection }: { connection: Connection }) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
  const drainUrl = `${backendUrl}/webhooks/vercel/${connection.id}`

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Log Drain setup</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Add the URL below as a{' '}
          <span className="font-medium text-foreground">Log Drain</span> in
          your Vercel project under{' '}
          <span className="font-medium text-foreground">Settings → Log Drains</span>.
        </p>
      </div>
      <CopyField label="Drain URL" value={drainUrl} />
      <div className="rounded-lg border border-stroke bg-surface p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Settings to use in Vercel</p>
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
      <div className="rounded-lg border border-stroke bg-surface p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">How it works</p>
        <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
          <li>Vercel pushes Web Analytics events to this URL in real time</li>
          <li>Each event is stored and aggregated by day</li>
          <li>Your Vercel views refresh automatically as data arrives</li>
        </ul>
      </div>
    </div>
  )
}

function WebhookBody({ connection }: { connection: Connection }) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
  const webhookUrl = `${backendUrl}/webhooks/custom/${connection.webhookId}`
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Webhook URL</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Send POST requests with an{' '}
          <code className="bg-muted px-1 rounded">X-API-Key</code> header to
          this URL. Manage API keys in your dashboard settings.
        </p>
      </div>
      <CopyField label="URL" value={webhookUrl} />
    </div>
  )
}

function GenericBody({ connection }: { connection: Connection }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-stroke bg-surface p-3 space-y-2">
        <Row label="Type" value={CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.type} />
        <Row label="Connected" value={new Date(connection.createdAt).toLocaleDateString()} />
        <Row label="ID" value={connection.id} mono />
      </div>
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

// ───────────────────────────────────────────────────────────────────────────
// Modal
// ───────────────────────────────────────────────────────────────────────────

interface ConnectionDetailModalProps {
  connection: Connection | null
  onClose: () => void
}

export function ConnectionDetailModal({ connection, onClose }: ConnectionDetailModalProps) {
  if (!connection) return null
  // `key={connection.id}` re-mounts the inner component when the user
  // opens a different connection, which lets us call type-specific hooks
  // (Stripe vs GA vs read-only) inside without violating the rules of
  // hooks — within a single mount, `connection.type` is fixed.
  return (
    <ConnectionDetailModalInner
      key={connection.id}
      connection={connection}
      onClose={onClose}
    />
  )
}

/**
 * Inner component split out so the per-type hooks (which all return
 * `DetailUIState`) can be called unconditionally — `useStripeDetailUI`
 * etc. need to mount when the connection exists, and the early-return
 * in the wrapper above gates that for us.
 */
function ConnectionDetailModalInner({
  connection,
  onClose,
}: {
  connection: Connection
  onClose: () => void
}) {
  const dashboard = useDashboard()
  const projects = dashboard.projects.projects

  // Project picker state — local until save. Initialise from the
  // connection's persisted project. Reset whenever the connection rotates
  // (rare, but happens if the parent reuses the modal for a different row).
  const [projectId, setProjectId] = useState<string | null>(connection.projectId ?? null)
  useEffect(() => {
    setProjectId(connection.projectId ?? null)
  }, [connection.id, connection.projectId])

  // Per-type detail UI. Only one of these is "real" for a given
  // connection; the others are no-op placeholders. We branch by type at
  // call site so `useState`/`useEffect` order stays stable per type.
  const isStripe = connection.type === 'stripe' || connection.type === 'stripe_manual'
  const isGA = connection.type === 'google_analytics'
  const isVercel = connection.type === 'vercel'
  const isWebhook = connection.type === 'webhook'

  // Each branch calls its hook at a fixed position in the render. Since
  // `connection.type` doesn't change for the lifetime of a mount (the
  // outer wrapper re-mounts when `connection` rotates), this is safe.
  let detail: DetailUIState
  if (isStripe) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    detail = useStripeDetailUI({ connection, onClose })
  } else if (isGA) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    detail = useGADetailUI({ connection, onClose })
  } else if (isVercel) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    detail = useReadonlyDetailUI({ body: <VercelBody connection={connection} /> })
  } else if (isWebhook) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    detail = useReadonlyDetailUI({ body: <WebhookBody connection={connection} /> })
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    detail = useReadonlyDetailUI({ body: <GenericBody connection={connection} /> })
  }

  // Project picker dirtiness composes with detail dirtiness.
  const projectDirty = projectId !== (connection.projectId ?? null)
  const dirty = detail.dirty || projectDirty
  const [savingProject, setSavingProject] = useState(false)
  // Synchronous re-entry gate for `handleSave`. Save composes a project
  // update (`updateConnectionProject`) plus optionally a detail-level
  // save (Stripe products, GA property). Without this ref, a double-
  // click can land two parallel project-update requests AND two
  // detail-saves — at best wasteful, at worst racy when the second
  // one's response overwrites the first.
  const savingRef = useRef(false)

  const handleSave = async () => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      if (projectDirty) {
        setSavingProject(true)
        try {
          await ALGORITHM.updateConnectionProject(connection.id, projectId)
          // Refresh the connections context so the row badge updates
          // alongside the modal close.
          await dashboard.connections.loadConnections()
        } catch {
          toast.error('Failed to update project. Please try again.')
          setSavingProject(false)
          return
        } finally {
          setSavingProject(false)
        }
      }
      if (detail.dirty) {
        await detail.save()
      } else if (projectDirty) {
        // No detail-level change, just project — close ourselves since the
        // detail hook didn't.
        onClose()
      }
    } finally {
      savingRef.current = false
    }
  }

  const handleCancel = () => {
    setProjectId(connection.projectId ?? null)
    detail.cancel()
  }

  const saving = detail.saving || savingProject

  // Every connection-detail surface uses the white card now. The earlier
  // "card for editable, plain for read-only" split read as a bug across
  // connection types — Stripe / GA showed a card, PostHog / Calendly /
  // Webhook / Vercel sat directly on bg-surface. Forcing `'card'` here gives
  // every detail dialog the same chrome.
  const bodyVariant: 'card' | 'plain' = 'card'
  // 42rem (~672px) keeps the body readable on ultrawide screens without
  // shrinking it on a 13" laptop.
  const bodyMaxWidth = '42rem'
  // Quiet down used-but-orphaned-locals. `isStripe` / `isGA` are still
  // referenced inside the per-type detail hooks chosen above; keep them
  // for clarity, but the bodyVariant decision no longer needs them.
  void isStripe
  void isGA

  return (
    <BottomDialog
      open
      onOpenChange={open => !open && onClose()}
      dirty={dirty}
    >
      <BottomDialog.Page
        bodyVariant={bodyVariant}
        bodyMaxWidth={bodyMaxWidth}
        headerLeft={<ConnectionHeaderLeft connection={connection} />}
        headerRight={(ctx: BottomDialogPageSlotContext) => (
          <>
            <HeaderProjectPicker
              projects={projects}
              value={projectId}
              onChange={setProjectId}
              disabled={saving}
            />
            {dirty ? (
              <HeaderSaveCancel
                onSave={handleSave}
                onCancel={handleCancel}
                saving={saving}
                bounce={ctx.bounce}
              />
            ) : (
              <HeaderCloseButton onClose={onClose} />
            )}
          </>
        )}
      >
        {detail.body}
      </BottomDialog.Page>
    </BottomDialog>
  )
}
