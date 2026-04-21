'use client'

import { Suspense, useState, useEffect } from 'react'
import { PlugsConnected, Trash, Plus, ArrowsClockwise, Cube } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'
import { ConnectionIcon } from '@/app/hub/(components)/connections/ConnectionIcon'
import { SectionHeader } from '@/app/hub/(components)/SectionHeader'
import { useOAuthCallback } from '@/hooks/useOAuthCallback'
import { CONNECTION_DISPLAY_NAMES } from '@/constants/connectionLabels'
import { ConnectionDetailModal } from '@/app/hub/(components)/modals/ConnectionDetailModal'
import { ALGORITHM, type GAProperty } from '@/lib/api'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Connection } from '@/types/connection'

function OAuthCallbacks() {
  useOAuthCallback('stripe')
  useOAuthCallback('calendly')
  useOAuthCallback('google_analytics')
  return null
}

function GoogleAnalyticsPropertyPicker() {
  const searchParams = useSearchParams()
  const { connections } = useDashboard()
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [properties, setProperties] = useState<GAProperty[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const status = searchParams.get('google_analytics')
    const cid = searchParams.get('connectionId')
    if (status === 'no-properties') {
      toast.error('No Google Analytics 4 properties found in your account.')
      window.history.replaceState({}, '', '/hub/connections')
    } else if (status === 'select-property' && cid) {
      setConnectionId(cid)
      setLoading(true)
      ALGORITHM.getGoogleAnalyticsProperties(cid)
        .then(res => setProperties(res.properties))
        .catch(() => {
          toast.error('Failed to load Google Analytics properties')
          window.history.replaceState({}, '', '/hub/connections')
        })
        .finally(() => setLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setProperties(null)
    setConnectionId(null)
    window.history.replaceState({}, '', '/hub/connections')
  }

  const handleClose = async () => {
    // Auto-select the first property when user dismisses without picking
    if (properties && properties.length > 0 && connectionId && !saving) {
      try {
        await ALGORITHM.saveGoogleAnalyticsProperty(connectionId, properties[0].id)
        toast.success(`Auto-selected "${properties[0].displayName}". You can change this by clicking the connection.`)
        connections.loadConnections()
      } catch {
        // silently ignore — user can click the connection to re-select
      }
    }
    dismiss()
  }

  const handleSelect = async (propertyId: string) => {
    if (!connectionId) return
    setSaving(true)
    try {
      await ALGORITHM.saveGoogleAnalyticsProperty(connectionId, propertyId)
      toast.success('Google Analytics connected successfully!')
      connections.loadConnections()
      dismiss()
    } catch {
      toast.error('Failed to save property. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!connectionId) return null

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Select a GA4 property</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose which Google Analytics 4 property to track.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading properties…</p>
        ) : properties && properties.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No GA4 properties found.</p>
        ) : (
          <div className="mt-1 space-y-2">
            {properties?.map(prop => (
              <Button
                key={prop.id}
                variant="outline"
                disabled={saving}
                onClick={() => handleSelect(prop.id)}
                className="w-full justify-start h-auto p-3"
              >
                <div className="text-left">
                  <p className="text-sm font-medium">{prop.displayName}</p>
                  <p className="text-xs text-muted-foreground">{prop.name}</p>
                </div>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const CLICKABLE_TYPES = new Set(['vercel', 'webhook', 'google_analytics'])

export default function ConnectionsPage() {
  const { connections } = useDashboard()
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)

  return (
    <div className="p-8 flex flex-col">
      <Suspense>
        <OAuthCallbacks />
        <GoogleAnalyticsPropertyPicker />
      </Suspense>

      <ConnectionDetailModal
        connection={selectedConnection}
        onClose={() => {
          setSelectedConnection(null)
          connections.loadConnections()
        }}
      />

      <div className="flex flex-col rounded-xl border border-stroke bg-white overflow-hidden shadow-card">
        <SectionHeader
          icon={
            <span
              className="flex items-center justify-center rounded-full bg-white border border-stroke p-2"
              style={{ boxShadow: '2px 2px 5px rgba(0,0,0,0.05)' }}
            >
              <PlugsConnected size={14} weight="bold" className="text-grey-darkest" />
            </span>
          }
          title={<span className="text-base font-bold text-grey-darkest">Connections</span>}
          rightSlot={
            <Button
              className="rounded-full gap-1.5 px-4 bg-brand hover:bg-brand/90 text-white"
              onClick={() => connections.openModal(null)}
            >
              <Plus size={14} weight="bold" />
              Add connection
            </Button>
          }
        />

        {connections.loading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowsClockwise size={16} weight="bold" className="text-muted-foreground animate-spin" />
          </div>
        ) : connections.connections.length === 0 ? (
          <p className="text-sm text-grey-light px-4 py-5">
            No connections yet.
          </p>
        ) : (
          <div className="divide-y divide-stroke">
            {connections.connections.map(connection => {
              const isClickable = CLICKABLE_TYPES.has(connection.type)
              return (
                <div
                  key={connection.id}
                  onClick={isClickable ? () => setSelectedConnection(connection) : undefined}
                  className={`group flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                    isClickable ? 'cursor-pointer hover:bg-main' : 'hover:bg-main/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ConnectionIcon type={connection.type} size={20} className="text-grey-dark shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-grey-dark truncate">
                          {connection.vercelProjectName
                            ? connection.name.replace(` · ${connection.vercelProjectName}`, '')
                            : connection.name}
                        </p>
                        {connection.gaPropertyName && (
                          <span className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-grey-light leading-tight shrink-0">
                            <Cube size={9} weight="bold" />
                            {connection.gaPropertyName}
                          </span>
                        )}
                        {connection.vercelProjectName && (
                          <span className="flex items-center gap-1 text-[10px] border border-stroke rounded-full px-2 py-0.5 text-grey-light leading-tight shrink-0">
                            <Cube size={9} weight="bold" />
                            {connection.vercelProjectName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-grey-light">
                        {CONNECTION_DISPLAY_NAMES[connection.type] ?? connection.type} · Connected{' '}
                        {new Date(connection.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); connections.deleteConnection(connection.id) }}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded text-grey-light hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash size={14} weight="bold" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
