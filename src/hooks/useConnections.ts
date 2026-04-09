import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import type { RootState, AppDispatch } from '@/store'
import { setConnections, addConnection, removeConnection } from '@/store/slices/connectionsSlice'
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
    try {
      const data = await ALGORITHM.getConnections()
      dispatch(setConnections(data))
    } catch {
      toast.error('Failed to load connections')
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

  const deleteConnection = async (connectionId: string) => {
    const existing = connections.find(c => c.id === connectionId)
    dispatch(removeConnection(connectionId))
    try {
      await ALGORITHM.deleteConnection(connectionId)
    } catch {
      if (existing) dispatch(addConnection(existing))
      toast.error('Failed to delete connection')
    }
  }

  return {
    connections,
    loading,
    isModalOpen,
    createConnectionFolderId,
    loadConnections,
    getConnectionsByType,
    createConnection,
    deleteConnection,
    openModal: (folderId: string | null = null) => dispatch(openCreateConnectionModal(folderId)),
    closeModal: () => dispatch(closeCreateConnectionModal()),
  }
}
