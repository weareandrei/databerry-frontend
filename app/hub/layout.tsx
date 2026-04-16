import { Plus_Jakarta_Sans } from 'next/font/google'
import { StoreProvider } from '@/store/StoreProvider'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { CreateFolderModal } from '@/components/modals/CreateFolderModal'
import { CreateConnectionModal } from '@/components/modals/CreateConnectionModal'
import { CreateViewModal } from '@/components/modals/CreateViewModal'

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <DashboardProvider>
        <div
          className={`${jakarta.variable} dashboard flex h-screen overflow-hidden`}
          style={{ background: 'var(--c-main)', fontFamily: 'var(--font-jakarta), sans-serif' }}
        >
          <Sidebar />
          <main className="flex-1 overflow-y-auto pt-12 md:pt-0 flex flex-col">{children}</main>
        </div>
        <CreateProjectModal />
        <CreateFolderModal />
        <CreateConnectionModal />
        <CreateViewModal />
      </DashboardProvider>
    </StoreProvider>
  )
}
