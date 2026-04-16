'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs font-medium bg-muted">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-tight">{email.split('@')[0]}</p>
          <p className="text-xs text-muted-foreground truncate leading-tight">{email}</p>
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
  )
}
