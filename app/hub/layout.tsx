import { StoreProvider } from '@/store/StoreProvider'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { DashboardSidebar } from '@/app/hub/(components)/layout/DashboardSidebar'
import { BillingReturnHandler } from '@/app/hub/(components)/gates/BillingReturnHandler'
import { CreateProjectModal } from '@/app/hub/(components)/modals/CreateProjectModal'
import { CreateFolderModal } from '@/app/hub/(components)/modals/CreateFolderModal'
import { CreateConnectionModal } from '@/app/hub/(components)/modals/CreateConnectionModal'
import { CreateViewModal } from '@/app/hub/(components)/modals/CreateViewModal'
import { FeedbackWidget } from '@/app/hub/(components)/feedback/FeedbackWidget'
import { OnboardingGate } from '@/app/hub/(components)/gates/OnboardingGate'
import { TrialKickoff } from '@/app/hub/(components)/gates/TrialKickoff'
import { SubscriptionGate } from '@/app/hub/(components)/gates/SubscriptionGate'
import { ServerStatusGate } from '@/app/hub/(components)/gates/ServerStatusGate'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: 'html, body { background-color: var(--c-surface); }',
        }}
      />
      <StoreProvider>
        <DashboardProvider>
          <UserSettingsProvider>
            <div className="dashboard flex h-screen overflow-hidden font-sans">
              <DashboardSidebar />

              <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden border-l border-stroke bg-white pt-[60px] md:pt-0">
                {children}
              </div>
            </div>

            <CreateProjectModal />
            <CreateFolderModal />
            <CreateConnectionModal />
            <CreateViewModal />
            <BillingReturnHandler />
            <FeedbackWidget />
            <OnboardingGate />
            <TrialKickoff />
            <SubscriptionGate />
            <ServerStatusGate />
          </UserSettingsProvider>
        </DashboardProvider>
      </StoreProvider>
    </>
  )
}
