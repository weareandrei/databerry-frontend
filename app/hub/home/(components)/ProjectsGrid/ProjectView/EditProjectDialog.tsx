'use client'

/**
 * Edit a project — name + optional website URL.
 *
 * Replaces the older `RenameProjectDialog` (kept on disk as a thin
 * shim that re-exports this component, so existing imports keep
 * compiling — see `RenameProjectDialog.tsx`). Two reasons for the
 * upgrade: (1) the website URL needs an editing surface for projects
 * created before the field existed; (2) consolidating "name" and
 * "URL" into one dialog avoids dragging users through two separate
 * dialog flows for what's conceptually one action ("update my
 * project's identity bits").
 *
 * "Save" is disabled while the form's effective state is identical
 * to the project's current state — saves no-op submits and doubles as
 * an "is dirty?" check for the user.
 *
 * Structure mirrors `CreateProjectModal.tsx` (same `Dialog` primitive
 * from `@/components/ui/Dialog`).
 */

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Project } from '@/types/project'

interface EditProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Wired by the parent (`ProjectView`) to
   * `dashboard.projects.editProject(project.id, patch)`. The patch
   * may include `name`, `websiteUrl`, or both. Empty string for URL
   * is normalised to `null` here so the backend clears the column
   * instead of storing an empty string.
   */
  onSave: (patch: { name?: string; websiteUrl?: string | null }) => Promise<void> | void
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onSave,
}: EditProjectDialogProps) {
  const [name, setName] = useState(project.name)
  const [websiteUrl, setWebsiteUrl] = useState(project.websiteUrl ?? '')
  const [submitting, setSubmitting] = useState(false)

  // Reset whenever the dialog re-opens — pre-fills with the current
  // values (not whatever was left from a cancelled previous edit).
  useEffect(() => {
    if (open) {
      setName(project.name)
      setWebsiteUrl(project.websiteUrl ?? '')
    }
  }, [open, project.name, project.websiteUrl])

  const trimmedName = name.trim()
  const trimmedUrl = websiteUrl.trim()
  // Compare against current values to detect "actually changed".
  // `null` from the project means "no URL" — equivalent to an empty
  // input string for dirty-checking purposes.
  const currentUrl = project.websiteUrl ?? ''
  const nameChanged = trimmedName.length > 0 && trimmedName !== project.name
  const urlChanged = trimmedUrl !== currentUrl
  const canSave = (nameChanged || urlChanged) && trimmedName.length > 0 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSubmitting(true)
    try {
      // Build the patch with only the fields that actually changed.
      // `websiteUrl: null` clears the column on the backend; an empty
      // input maps to that.
      const patch: { name?: string; websiteUrl?: string | null } = {}
      if (nameChanged) patch.name = trimmedName
      if (urlChanged) patch.websiteUrl = trimmedUrl ? trimmedUrl : null
      await onSave(patch)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Edit project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project name</label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={project.name}
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
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="databerry.app"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSave}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
