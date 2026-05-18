'use client'

import { useRef, useState } from 'react'
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
  // In-flight guard for the create POST. Two pieces:
  //   - `submitting` (state) drives the disabled / loading UI
  //   - `submittingRef` (ref) blocks re-entry WITHIN the same React
  //     tick. A user hammering Enter / clicking Create rapidly fires
  //     `onSubmit` faster than React can re-render the disabled
  //     button — without the ref, multiple submits land in flight
  //     and we get duplicate projects (the bug this fix is for).
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const reset = () => {
    setName('')
    setWebsiteUrl('')
    setSubmitting(false)
    submittingRef.current = false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    // Synchronous guard — `submitting` state hasn't propagated yet on
    // the second Enter press, but the ref has.
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)

    const trimmedUrl = websiteUrl.trim()
    try {
      await projects.createProject(
        name.trim(),
        trimmedUrl ? trimmedUrl : null,
      )
      reset()
      projects.closeModal()
    } catch {
      // Re-enable the button so the user can retry. The toast / error
      // is surfaced by `createProject` itself (handled in
      // DashboardContext); we just unstick the local UI.
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    // Don't let backdrop click / Escape dismiss the dialog mid-create:
    // a half-aware user could re-open it before the create finishes
    // and start typing again into stale state. Cleaner to lock the
    // dialog open until the request settles.
    if (!open && submittingRef.current) return
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
              disabled={submitting}
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
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || submitting}
            >
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
