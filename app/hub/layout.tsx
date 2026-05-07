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
            {/* `md:ml-64` reserves the desktop sidebar's 256-px gutter.
                `pt-[60px] md:pt-0` reserves the gutter under the
                fixed-position `<MobileTopBar>` on phones — that bar
                sits `position: fixed` at viewport top, so without this
                padding every page's first row would slip under it.
                Desktop never paints the bar (`md:hidden`), so
                `md:pt-0` keeps the desktop layout pixel-identical. */}
            <main className="md:ml-64 flex flex-col min-h-screen pt-[60px] md:pt-0">{children}</main>
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
