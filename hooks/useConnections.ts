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
      return created
    } catch {
      toast.error('Failed to create connection')
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
