'use client'

/**
 * Hard-delete a project. Cascades on the backend to its folders, views
 * and connections, so the action is guarded with a "type the project
 * name to confirm" input — same pattern GitHub / Vercel use for
 * irreversible destroy actions.
 *
 * Match is exact, case-sensitive and trimmed — no fuzzy matching.
 * Reset the input every time the dialog opens so a previous failed
 * attempt doesn't leak through.
 *
 * Built on the `AlertDialog` primitive (same one `FolderCard.tsx`
 * uses). The Input doesn't live inside `<AlertDialogDescription>` (a
 * `<p>`) — it sits as a sibling between header and footer to keep the
 * markup valid.
 */

import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import type { Project } from '@/types/project'

interface DeleteProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => Promise<void> | void
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDelete,
}: DeleteProjectDialogProps) {
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset confirmation input on every open. Otherwise re-opening the
  // dialog after a cancel would still show the previously-typed name,
  // letting the user delete with one click — defeats the safety guard.
  useEffect(() => {
    if (open) setConfirm('')
  }, [open])

  const matches = confirm === project.name
  const canDelete = matches && !submitting

  const handleDelete = async () => {
    if (!canDelete) return
    setSubmitting(true)
    try {
      await onDelete()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete <b>{project.name}</b> and all of its folders, views
            and connections. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Type{' '}
            <code className="font-mono px-1 py-0.5 bg-black/[0.04] rounded text-foreground">
              {project.name}
            </code>{' '}
            to confirm.
          </p>
          <Input
            autoFocus
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder={project.name}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            Delete project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
