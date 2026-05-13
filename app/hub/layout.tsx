import { Plus_Jakarta_Sans } from 'next/font/google'
import { StoreProvider } from '@/store/StoreProvider'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { Sidebar } from '@/app/hub/(components)/Sidebar/Sidebar'
import { BillingReturnHandler } from '@/app/hub/(components)/BillingReturnHandler'
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
    <>
      {/*
        Push the dashboard cream all the way down to the `<html>` and
        `<body>` elements while the user is inside `/hub/*`. Without
        this, rubber-band overscroll (macOS trackpads, mobile pull-to-
        refresh) reveals the body's default white because nothing
        underneath the dashboard's own cream-painted `<div>` is the
        right colour.

        Why a `<style>` tag here vs. setting the colour globally in
        `globals.css`: the rule is route-scoped — the landing page's
        sections paint their own backgrounds, but the body itself
        stays white there (so any non-section gap reads as white,
        which is the design intent). Wrapping the style inside this
        layout means it mounts when the user enters the dashboard
        and unmounts when they leave, no client JS / no class-toggle
        gymnastics, and no flash on first paint because the rule
        ships in the SSR HTML.

        `dangerouslySetInnerHTML` is the React 19-friendly way to
        inline CSS text into a `<style>` element from a server
        component. The string is a static literal (no user input),
        so there's no injection surface.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: 'html, body { background-color: var(--c-main); }',
        }}
      />
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
            {/* Reads `?upgraded=…` / `?upgrade_cancelled=1` from
                the URL after a Stripe Checkout redirect and toasts
                + polls the account row until the webhook lands.
                Renders nothing of its own — sits at the layout
                root so every navigation back into `/hub` sees it. */}
            <BillingReturnHandler />
          </UserSettingsProvider>
        </DashboardProvider>
      </StoreProvider>
    </>
  )
}
