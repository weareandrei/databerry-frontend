import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState, AppDispatch } from '@/store'
import {
  setConnections,
  addConnection,
  removeConnection,
  updateConnection as updateConnectionAction,
  setLoading,
} from '@/store/slices/connectionsSlice'
import { openCreateConnectionModal, closeCreateConnectionModal } from '@/store/slices/uiSlice'
import { ALGORITHM } from '@/lib/api'
import { EVENT, trackEvent, captureError } from '@/lib/posthog'
import type { Connection } from '@/types/connection'

export function useConnections() {
  const dispatch = useDispatch<AppDispatch>()
  const connections = useSelector((state: RootState) => state.connections.items)
  const loading = useSelector((state: RootState) => state.connections.loading)
  const isModalOpen = useSelector((state: RootState) => state.ui.createConnectionModalOpen)
  const createConnectionFolderId = useSelector(
    (state: RootState) => state.ui.createConnectionFolderId,
  )

  const loadConnections = async () => {
    dispatch(setLoading(true))
    try {
      const data = await ALGORITHM.getConnections()
      dispatch(setConnections(data))
    } catch {
      toast.error('Failed to load connections')
    } finally {
      dispatch(setLoading(false))
    }
  }

  const getConnectionsByType = (type: string) => connections.filter(c => c.type === type)

  const createConnection = async (
    body: Omit<Connection, 'id' | 'createdAt' | 'userId'> & { config?: Record<string, unknown> },
  ) => {
    try {
      const created = await ALGORITHM.createConnection(body)
      dispatch(addConnection(created))
      // Centralised at the hook level so every entry point (PostHog
      // form, Stripe manual, Webhook create, Vercel, …) gets the
      // event for free without each modal step re-instrumenting it.
      // OAuth-flow connections (Stripe Connect, GA, Calendly, Sentry)
      // are created in the backend callback — those fire from
      // `useOAuthCallback` on the `?<provider>=connected` redirect.
      trackEvent(EVENT.CONNECTION_CREATED, {
        connectionId: created.id,
        connectionType: created.type,
        source: 'manual',
      })
      return created
    } catch (err) {
      // Capture BOTH a PostHog exception (so the error shows up in
      // the error-tracking view with its stack) AND a funnel event
      // (so attempt-vs-success-vs-failure counts are query-able).
      // Includes `connectionType` so a query like
      // `connection_create_failed where connectionType = mcp` gives
      // you MCP-only failure rate immediately.
      //
      // The backend's framed errors (`MCP server didn't respond
      // within 10s`, `Stripe didn't accept this key`, …) flow
      // through `err.message` since `ALGORITHM.createConnection`
      // throws with the body of the 400.
      captureError(EVENT.CONNECTION_CREATE_FAILED, err, {
        connectionType: body.type,
        source: 'manual',
      })
      // User-facing toast: surface the actual server message when
      // we have one, fall back to the generic copy otherwise. The
      // previous `'Failed to create connection'` was confusing for
      // MCP failures specifically — users had no idea WHY (auth
      // wrong? URL wrong? timeout?).
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to create connection'
      toast.error(message)
    }
  }

  // Reassign a connection to a different project, or to "Common" (projectId=null).
  // Optimistic: patch the Redux item immediately; on error, revert + toast.
  const reassignProject = async (connectionId: string, projectId: string | null) => {
    const existing = connections.find(c => c.id === connectionId)
    if (!existing) return
    dispatch(updateConnectionAction({ ...existing, projectId }))
    try {
      const updated = await ALGORITHM.updateConnectionProject(connectionId, projectId)
      dispatch(updateConnectionAction(updated))
      return updated
    } catch {
      dispatch(updateConnectionAction(existing))
      toast.error('Failed to reassign connection')
    }
  }

  const deleteConnection = async (connectionId: string) => {
    const existing = connections.find(c => c.id === connectionId)
    dispatch(removeConnection(connectionId))
    try {
      await ALGORITHM.deleteConnection(connectionId)
      toast.success('Connection deleted')
    } catch {
      if (existing) dispatch(addConnection(existing))
      toast.error('Failed to delete connection')
    }
  }

  /**
   * User-initiated full reload of a Stripe connection's last 30 days of data.
   * Triggered from the kebab menu next to the delete icon. Long-running
   * (1-15 seconds depending on account size) — uses `toast.promise` to give
   * persistent feedback while the request is in flight.
   *
   * Uses an event-driven approach for completion: we don't refresh the
   * connections list itself (the list shape doesn't change), but components
   * showing Stripe view values can listen for `stripe-data-refreshed` to
   * re-fetch.
   */
  const reloadStripe = (connectionId: string) => {
    const promise = ALGORITHM.reloadStripeConnection(connectionId, 30)
    toast.promise(promise, {
      loading: 'Refreshing data from Stripe…',
      success: result => {
        // Tell any mounted Stripe view tiles to re-fetch from the DB now
        // that fresh data has landed. Lighter than a full route refresh.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('stripe-data-refreshed', { detail: { connectionId } }),
          )
        }
        const parts = [
          `${result.chargeCount} charge${result.chargeCount === 1 ? '' : 's'}`,
        ]
        if (result.customerCount !== undefined && result.customerCount > 0) {
          parts.push(`${result.customerCount} customer${result.customerCount === 1 ? '' : 's'}`)
        }
        if (result.subCount !== undefined && result.subCount > 0) {
          parts.push(`${result.subCount} subscription${result.subCount === 1 ? '' : 's'}`)
        }
        return `Refreshed (${parts.join(', ')})`
      },
      error: "Couldn't refresh — try again later",
    })
    return promise
  }

  return {
    connections,
    loading,
    isModalOpen,
    createConnectionFolderId,
    loadConnections,
    getConnectionsByType,
    createConnection,
    reassignProject,
    deleteConnection,
    reloadStripe,
    openModal: (folderId: string | null = null) => dispatch(openCreateConnectionModal(folderId)),
    closeModal: () => dispatch(closeCreateConnectionModal()),
  }
}
