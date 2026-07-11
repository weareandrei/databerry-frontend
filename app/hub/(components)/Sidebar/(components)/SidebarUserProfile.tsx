'use client'

import Image from 'next/image'
import { CaretUpDown, CreditCard, SignOut } from '@phosphor-icons/react'
import { useAuth } from '@/contexts/AuthContext'
import { openTierPicker } from '@/hooks/useTierPicker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function SidebarUserProfile() {
  const { user, signOut } = useAuth()

  // Temporary: hardcoded sidebar label so screenshots / demos show a
  // consistent team identity instead of whoever is currently logged in.
  // Restore by uncommenting the real line below and removing the literal.
  const email = user?.email ?? ''
  // const email = 'team@heavenmade.org'
  void user // keep the hook wired even though we ignore its email for now

  // Plan badge + tier picker sheet used to live inside this
  // component (right under the email). The `<IconRail>` owns the
  // picker now; the `useTierPickerListener` bus still carries
  // limit-error + "Manage plan" broadcasts to it.

  return (
    // No horizontal padding on the wrapper — the trigger owns its
    // own `px-3` so the hover box spans the same width as the nav
    // items below, which also sit directly inside the section's
    // `px-2` and put their padding on the link itself.
    <div className="py-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 w-full px-3 py-1 rounded-md hover:bg-hover-fill transition-colors text-left">
          <div className="h-7 w-7 rounded-md overflow-hidden shrink-0 border border-stroke">
            <Image src="/databerry_logo_v2.svg" alt="Logo" width={28} height={28} className="h-full w-full object-cover" />
          </div>
          {/* `min-w-0` is the flex truncation trick — without it, a
              long email would push the caret off the right edge. */}
          <p className="flex-1 min-w-0 text-[15px] text-foreground font-semibold truncate tracking-normal text-left">
            {email}
          </p>
          <CaretUpDown size={14} weight="bold" className="text-muted-foreground shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          {/* Manage plan — fires the global tier-picker broadcast.
              The `<TierPickerSheet>` itself is owned by the
              `<IconRail>`; `openTierPicker()` flips its open state
              via the module-level pub-sub bus, so this item doesn't
              need to own or prop-drill the sheet. */}
          <DropdownMenuItem onClick={() => openTierPicker()} className="gap-2 text-sm">
            <CreditCard size={14} weight="bold" />
            Manage plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="gap-2 text-sm">
            <SignOut size={14} weight="bold" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
