'use client'

import { useRef, useState } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { EVENT, trackEvent } from '@/lib/posthog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CreateFolderModal() {
  const { folders } = useDashboard()
  const [name, setName] = useState('')
  // In-flight guard. See `CreateProjectModal` for the rationale —
  // pair of (state, ref): state drives the disabled UI, ref blocks
  // re-entry within the same React tick (Enter key fires faster than
  // React can re-render the disabled button, which is how the user
  // managed to create duplicate folders by mashing the key).
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const reset = () => {
    setName('')
    setSubmitting(false)
    submittingRef.current = false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !folders.createFolderProjectId) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)

    try {
      const created = await folders.createFolder(
        name.trim(),
        folders.createFolderParentId,
        folders.createFolderProjectId,
      )
      if (created?.id) {
        trackEvent(EVENT.FOLDER_CREATED, {
          folderId: created.id,
          projectId: created.projectId,
          // Subfolders vs root — useful for "are people using nested
          // structure or staying flat?" insights.
          parentFolderId: created.parentId,
          isNested: created.parentId != null,
        })
      }
      reset()
      folders.closeModal()
    } catch {
      // Re-enable so the user can retry; the toast comes from the
      // context's `createFolder` itself.
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    // Don't allow dismiss mid-create — same rationale as CreateProjectModal.
    if (!open && submittingRef.current) return
    if (!open) {
      folders.closeModal()
      reset()
    }
  }

  return (
    <Dialog open={folders.isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">New folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Folder name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={submitting}
            autoFocus
          />
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
