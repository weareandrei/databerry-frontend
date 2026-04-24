'use client'

import { useState, useEffect } from 'react'
import { Copy, Check } from '@phosphor-icons/react'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { useDashboard } from '@/contexts/DashboardContext'
import { ALGORITHM, type GAProperty } from '@/lib/api'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
    <Dialog open={!!connection} onOpenChange={open => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="p-0 overflow-hidden gap-0 dashboard flex flex-col max-h-[80vh] sm:max-w-md"
      >
        <DialogTitle className="sr-only">{connection.name}</DialogTitle>
        <DialogDescription className="sr-only">{displayName} connection settings</DialogDescription>
        <SectionHeader
          title={connection.name}
          subtitle={displayName}
          onClose={onClose}
        />

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          <SummaryBlock connection={connection} />
          {connection.type === 'vercel' && <VercelDetail connection={connection} />}
          {connection.type === 'webhook' && <WebhookDetail connection={connection} />}
          {connection.type === 'google_analytics' && <GADetail connection={connection} onClose={onClose} />}
          {connection.type !== 'vercel' && connection.type !== 'webhook' && connection.type !== 'google_analytics' && (
            <GenericDetail connection={connection} />
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
