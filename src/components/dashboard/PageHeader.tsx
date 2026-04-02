'use client'

import Link from 'next/link'
import { FolderPlus, Plus, Folder, ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/contexts/DashboardContext'

interface PageHeaderProps {
  title: string
  subtitle?: string
  parentId?: string | null
  backHref?: string
  showActions?: boolean
}

export function PageHeader({
  title,
  subtitle,
  parentId = null,
  backHref,
  showActions = true,
}: PageHeaderProps) {
  const { folders, views } = useDashboard()

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mt-1 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <ArrowLeft size={15} weight="thin" />
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          {backHref && (
            <Folder size={22} weight="thin" className="text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => folders.openModal(parentId)}
          >
            <FolderPlus size={15} weight="thin" />
            Create folder
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => views.openModal(parentId ?? null)}
          >
            <Plus size={15} weight="thin" />
            Create view
          </Button>
        </div>
      )}
    </div>
  )
}
