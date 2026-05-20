'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { CaretUpDown, SignOut } from '@phosphor-icons/react'
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
import { EVENT, trackEvent } from '@/lib/posthog'

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
  // Wrap the open in a tracked variant so both entry points (this
  // sidebar's badge click + the global `openTierPicker()` broadcast)
  // fire one canonical `tier_picker_opened` event. `source` lets us
  // tell apart "user explicitly clicked the badge" from "limit-error
  // toast forced them into the picker".
  const openTierPicker = useCallback((source: 'badge' | 'broadcast') => {
    trackEvent(EVENT.TIER_PICKER_OPENED, { source })
    setTierSheetOpen(true)
  }, [])
  const handleTierPickerOpen = useCallback(
    () => openTierPicker('broadcast'),
    [openTierPicker],
  )
  useTierPickerListener(handleTierPickerOpen)

  // Temporary: hardcoded sidebar label so screenshots / demos show a
  // consistent team identity instead of whoever is currently logged in.
  // Restore by uncommenting the real line below and removing the literal.
  const email = user?.email ?? ''
  // const email = 'team@heavenmade.org'
  void user // keep the hook wired even though we ignore its email for now

  // Subheader: rounded badge with the plan name, plus a brand-coloured
  // "Upgrade" link beside it for anyone NOT already on the top tier.
  //
  // Plan name resolution: prefer the catalog row (`usePlans()`), fall
  // back to a title-cased plan id while the fetch is in flight — short
  // window (<500 ms typically), but the fallback keeps the sidebar's
  // first paint from showing a blank chip.
  //
  // `isTopTier` covers both `pro` (the user's "top" plan id) and
  // `enterprise` (which sits above pro in the catalog union — showing
  // Upgrade there would be misleading even though the user only
  // mentioned `pro`). If you want enterprise to keep prompting for an
  // upgrade for some reason, drop the second clause.
  const currentPlan = plansById[planId]
  const fallbackName = planId.charAt(0).toUpperCase() + planId.slice(1)
  const planName = currentPlan?.name ?? fallbackName
  const isTopTier = planId === 'pro' || planId === 'enterprise'

  return (
    <>
      {/* Outer container — NOT itself clickable. Holds two stacked
          rows: the dropdown trigger (avatar + email + caret) and the
          plan badge row beside it. They WERE nested before — the
          badge `<button>`s lived inside the `DropdownMenuTrigger`'s
          `<button>` and React's hydration check flagged it as
          invalid HTML (button-in-button). Splitting them into
          sibling rows fixes the hydration error and incidentally
          tightens the click semantics: clicking the badge no longer
          relies on `e.stopPropagation()` to keep the dropdown from
          opening — the badge simply isn't inside the trigger's tree
          anymore. */}
      <div className="px-3 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 w-full rounded-md hover:bg-hover-fill transition-colors text-left -mx-1 px-1 py-1">
            <div className="h-7 w-7 rounded-md overflow-hidden shrink-0 border border-stroke">
              <Image src="/databerry_logo_v2.svg" alt="Logo" width={28} height={28} className="h-full w-full object-cover" />
            </div>
            {/* Email row only. `min-w-0` is the flex truncation
                trick — without it, a long email would push the caret
                off the right edge. */}
            <p className="flex-1 min-w-0 text-[15px] text-[#2E2F30] font-semibold truncate tracking-normal text-left">
              {email}
            </p>
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

        {/* Plan badge row — sibling of the trigger, NOT inside it.
            `pl-[34px]` aligns the badge under the email's left
            edge (28 px avatar + 6 px gap). `visibility: hidden` (vs
            `display: none`) reserves the row's height while
            `useAccount` resolves so the layout doesn't jump on
            first paint. `useAccount` starts with `planId='free'`
            as its default — without this gate, upgraded users see
            a brief "Free" flash on dashboard mount. */}
        <div
          className="flex items-center gap-1.5 mt-0.5 pl-[34px]"
          style={accountLoading ? { visibility: 'hidden' } : undefined}
        >
          <button
            type="button"
            onClick={() => openTierPicker('badge')}
            disabled={accountLoading}
            className="inline-flex items-center rounded-full border border-stroke bg-white px-2 py-[1px] text-[10px] font-medium text-grey-darkest hover:bg-hover-fill transition-colors"
          >
            {planName}
          </button>
          {!isTopTier && (
            <button
              type="button"
              onClick={() => openTierPicker('badge')}
              disabled={accountLoading}
              className="text-[11px] font-medium text-brand hover:underline"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      <TierPickerSheet
        open={tierSheetOpen}
        onOpenChange={setTierSheetOpen}
        currentPlanId={planId}
      />
    </>
  )
}
