'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { CaretUpDown, SignOut, Sparkle } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/AuthContext'
import { useAccount } from '@/hooks/useAccount'
import { usePlans } from '@/hooks/usePlans'
import { useTierPickerListener } from '@/hooks/useTierPicker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TierPickerSheet } from './TierPickerSheet'

export function SidebarUserProfile() {
  const { user, signOut } = useAuth()
  const { planId, loading: accountLoading } = useAccount()
  const { plansById } = usePlans()

  // Local state for the tier picker bottom-sheet. Lives here (not
  // in a context) because the dashboard only ever renders one
  // sidebar — so there's exactly one picker on-page. Other
  // surfaces (limit-error toasts, future "you're locked out" UIs)
  // open it via the `openTierPicker()` broadcast registered below.
  const [tierSheetOpen, setTierSheetOpen] = useState(false)
  const handleTierPickerOpen = useCallback(() => setTierSheetOpen(true), [])
  useTierPickerListener(handleTierPickerOpen)

  // Temporary: hardcoded sidebar label so screenshots / demos show a
  // consistent team identity instead of whoever is currently logged in.
  // Restore by uncommenting the real line below and removing the literal.
  const email = user?.email ?? ''
  // const email = 'team@heavenmade.org'
  void user // keep the hook wired even though we ignore its email for now

  const isFree = planId === 'free'
  // Subheader copy + accent: free users see an "Upgrade" prompt with a
  // brand sparkle to nudge the action; paid users see their plan name
  // in muted text (informational, not a call-to-action).
  //
  // The plan name comes from the fetched `subscriptions` row, falling
  // back to a title-cased plan id while `usePlans()` is still in
  // flight — short window (<500 ms typically), but the fallback keeps
  // the sidebar's first paint from showing a blank space where the
  // label belongs.
  const currentPlan = plansById[planId]
  const fallbackName = planId.charAt(0).toUpperCase() + planId.slice(1)
  const planLabel = isFree ? 'Upgrade' : `${currentPlan?.name ?? fallbackName} plan`

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 w-full px-3 py-1.5 rounded-md hover:bg-hover-fill transition-colors text-left">
          <div className="h-7 w-7 rounded-md overflow-hidden shrink-0 border border-stroke">
            <Image src="/databerry_logo_v2.svg" alt="Logo" width={28} height={28} className="h-full w-full object-cover" />
          </div>
          {/* Email + plan subheader stack. `min-w-0` is the flex
              truncation trick — without it, a long email would push
              the caret off the right edge. The subheader sits just
              below the email at a smaller size; opens the tier
              picker on click. Stop-propagation on the subheader
              click so it doesn't also toggle the parent dropdown
              (which would close the dropdown menu we never opened). */}
          <div className="flex-1 min-w-0 flex flex-col leading-tight">
            <p className="text-[15px] text-[#2E2F30] font-semibold truncate tracking-normal">
              {email}
            </p>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()
                setTierSheetOpen(true)
              }}
              disabled={accountLoading}
              // `visibility: hidden` (vs `display: none`) reserves the
              // button's height while the account loads, so the email
              // above doesn't jump downward when the label appears.
              // `useAccount` initialises `planId='free'` as its default
              // state before the fetch resolves, so without this gate
              // every upgraded user sees a brief "Upgrade" flash on the
              // first paint of the dashboard.
              style={accountLoading ? { visibility: 'hidden' } : undefined}
              className={
                isFree
                  ? 'self-start mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline'
                  : 'self-start mt-0.5 inline-flex items-center gap-1 text-[11px] text-grey-light hover:text-grey-darkest transition-colors'
              }
            >
              {isFree && <Sparkle size={10} weight="fill" className="text-brand" />}
              <span>{planLabel}</span>
            </button>
          </div>
          <CaretUpDown size={14} weight="bold" className="text-muted-foreground shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="gap-2 text-sm">
            <SignOut size={14} weight="bold" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TierPickerSheet
        open={tierSheetOpen}
        onOpenChange={setTierSheetOpen}
        currentPlanId={planId}
      />
    </>
  )
}
