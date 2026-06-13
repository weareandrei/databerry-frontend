import { Plus_Jakarta_Sans } from 'next/font/google'
import { StoreProvider } from '@/store/StoreProvider'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { UserSettingsProvider } from '@/contexts/UserSettingsContext'
import { IconRail } from '@/app/hub/(components)/IconRail'
import { BillingReturnHandler } from '@/app/hub/(components)/BillingReturnHandler'
import { CreateProjectModal } from '@/app/hub/(components)/modals/CreateProjectModal'
import { CreateFolderModal } from '@/app/hub/(components)/modals/CreateFolderModal'
import { CreateConnectionModal } from '@/app/hub/(components)/modals/CreateConnectionModal'
import { CreateViewModal } from '@/app/hub/(components)/modals/CreateViewModal'
import { FeedbackWidget } from '@/app/hub/(components)/FeedbackWidget'
import { OnboardingGate } from '@/app/hub/(components)/OnboardingGate'
import { TrialKickoff } from '@/app/hub/(components)/TrialKickoff'
import { SubscriptionGate } from '@/app/hub/(components)/SubscriptionGate'

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
              <IconRail />
              {/* `md:ml-16` reserves the icon rail's 64-px gutter (the
                  old 256-px labelled sidebar is gone — project detail
                  nav now lives in the per-project sidebar mounted by
                  `/hub/projects/[id]/layout.tsx`).
                  `pt-[60px] md:pt-0` reserves the gutter under the
                  fixed-position `<MobileTopBar>` on phones — that bar
                  sits `position: fixed` at viewport top, so without this
                  padding every page's first row would slip under it.
                  Desktop never paints the bar (`md:hidden`), so
                  `md:pt-0` keeps the desktop layout pixel-identical. */}
              <main className="md:ml-16 flex flex-col min-h-screen pt-[60px] md:pt-0">{children}</main>
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
            {/* Founder-only satisfaction survey. Fixed bottom-right
                pill that opens a small popover with the 5-emoji
                ladder + optional comment textarea. Submits to
                `POST /feedback`, which mails the result to the
                founder's personal inbox via Resend. Mounted at the
                layout root so it follows the user across every
                `/hub/*` route — see `FeedbackWidget` docblock. */}
            <FeedbackWidget />
            {/* Bounces users with `onboarding_complete = false` to
                /onboarding from ANY hub route — including the
                post-OAuth landings that would otherwise break the
                onboarding flow mid-way. While the status is still
                UNKNOWN it covers the dashboard with a full-screen
                loading overlay (so fresh users never see dashboard
                chrome before the bounce); a per-user localStorage
                cache skips the overlay for users already known to
                be onboarded. */}
            <OnboardingGate />
            {/* Starts the 7-day trial on the user's FIRST post-
                onboarding dashboard open (stamps trial_started_at /
                trial_ends_at via the backend) and celebrates with a
                center popup + confetti. Renders nothing for users
                whose trial already started or who pay. */}
            <TrialKickoff />
            {/* Full-viewport blocker once `trial_ends_at` is in the
                past and the user still has no paid plan — no matter
                how long ago the trial lapsed. Fail-open on unknown
                account state; see its docblock for the trigger. */}
            <SubscriptionGate />
          </UserSettingsProvider>
        </DashboardProvider>
      </StoreProvider>
    </>
  )
}
