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
          ? 'bg-hover-fill text-foreground'
          : 'text-muted-foreground hover:bg-hover-fill hover:text-foreground',
      )}
    >
      <IconComponent size={16} weight="bold" />
      <span>{label}</span>
    </Link>
  )
}
