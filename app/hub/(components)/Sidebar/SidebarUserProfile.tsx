'use client'

import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CaretUpDown, SignOut } from '@phosphor-icons/react'

export function SidebarUserProfile() {
  const { user, signOut } = useAuth()

  const email = user?.email ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 w-full px-3 py-1.5 rounded-md hover:bg-hover-fill transition-colors text-left">
        <div className="h-7 w-7 rounded-md overflow-hidden shrink-0 border border-stroke">
          <Image src="/Databerry_icon.svg" alt="Logo" width={28} height={28} className="h-full w-full object-cover" />
        </div>
        <p className="flex-1 min-w-0 text-[15px] text-[#2E2F30] font-semibold truncate leading-tight tracking-normal">{email}</p>
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
  )
}
