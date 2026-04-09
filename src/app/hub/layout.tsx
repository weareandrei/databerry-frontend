import { StoreProvider } from '@/store/StoreProvider'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { CreateFolderModal } from '@/components/modals/CreateFolderModal'
import { CreateConnectionModal } from '@/components/modals/CreateConnectionModal'
import { CreateViewModal } from '@/components/modals/CreateViewModal'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <DashboardProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <CreateFolderModal />
        <CreateConnectionModal />
        <CreateViewModal />
      </DashboardProvider>
    </StoreProvider>
  )
}
