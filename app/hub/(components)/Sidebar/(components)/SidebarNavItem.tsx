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
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
        isActive
          ? 'bg-hover-fill text-foreground'
          : 'text-foreground hover:bg-hover-fill/70',
      )}
    >
      <IconComponent size={16} weight="regular" />
      <span>{label}</span>
    </Link>
  )
}
