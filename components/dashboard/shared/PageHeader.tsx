'use client'

import Link from 'next/link'
import { FolderPlus, Plus, Folder, ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  showActions?: boolean
  onCreateFolder?: () => void
  onCreateView?: () => void
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  showActions = true,
  onCreateFolder,
  onCreateView,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mt-1 flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <ArrowLeft size={15} weight="bold" />
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          {backHref && (
            <Folder size={22} weight="bold" className="text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onCreateFolder}>
            <FolderPlus size={15} weight="bold" />
            Create folder
          </Button>
          <Button size="sm" className="flex-1 gap-1.5" onClick={onCreateView}>
            <Plus size={15} weight="bold" />
            Create view
          </Button>
        </div>
      )}
    </div>
  )
}
