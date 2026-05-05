'use client'

import { useState } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CreateProjectModal() {
  const { projects } = useDashboard()
  const [name, setName] = useState('')
  // Optional. When set, the dashboard renders the site's favicon
  // next to the project name. Leaving it blank keeps today's
  // generic Cube icon. Backend normalises (prepends `https://` if
  // missing, validates with `new URL()`); we just pass through.
  const [websiteUrl, setWebsiteUrl] = useState('')

  const reset = () => {
    setName('')
    setWebsiteUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const trimmedUrl = websiteUrl.trim()
    await projects.createProject(
      name.trim(),
      trimmedUrl ? trimmedUrl : null,
    )
    reset()
    projects.closeModal()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      projects.closeModal()
      reset()
    }
  }

  return (
    <Dialog open={projects.isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project name</label>
            <Input
              placeholder="My SaaS"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Website URL{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Input
              placeholder="databerry.app"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
