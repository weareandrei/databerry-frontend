'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface SidebarNavItemProps {
  href: string
  label: string
  icon: Icon
}

export function SidebarNavItem({ href, label, icon: IconComponent }: SidebarNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <IconComponent size={16} weight="thin" />
      <span>{label}</span>
    </Link>
  )
}
