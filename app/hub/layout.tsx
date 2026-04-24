import { Plus_Jakarta_Sans } from 'next/font/google'
import { StoreProvider } from '@/store/StoreProvider'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { Sidebar } from '@/app/hub/(components)/Sidebar/Sidebar'
import { CreateProjectModal } from '@/app/hub/(components)/modals/CreateProjectModal'
import { CreateFolderModal } from '@/app/hub/(components)/modals/CreateFolderModal'
import { CreateConnectionModal } from '@/app/hub/(components)/modals/CreateConnectionModal'
import { CreateViewModal } from '@/app/hub/(components)/modals/CreateViewModal'

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <DashboardProvider>
        <UserSettingsProvider>
          <div
            className={`${jakarta.variable} dashboard min-h-screen`}
            style={{ background: 'var(--c-main)', fontFamily: 'var(--font-jakarta), sans-serif' }}
          >
            <Sidebar />
            <main className="md:ml-64 flex flex-col pt-12 md:pt-0 min-h-screen">{children}</main>
          </div>
          <CreateProjectModal />
          <CreateFolderModal />
          <CreateConnectionModal />
          <CreateViewModal />
        </UserSettingsProvider>
      </DashboardProvider>
    </StoreProvider>
  )
}
