'use client'

/**
 * Rename a folder. Single text input; "Save" disabled until the
 * trimmed value is non-empty AND different from the current name —
 * avoids no-op submits.
 *
 * Mirrors `EditProjectDialog` structurally but stays single-purpose:
 * folders only have a `name`, so a unified "edit" dialog would just
 * be a renamed rename dialog. If folders ever grow more editable
 * fields (color, icon, …), this is the file to extend.
 *
 * Lives under the shared `(components)/folder/` rather than next to a
 * specific consumer because both the project body's `FolderCard`
 * and the `SidebarFolderItem` open it. Kept a sibling of `FolderCard`
 * for proximity.
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
import type { Folder } from '@/types/folder'

interface RenameFolderDialogProps {
  folder: Folder
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Wired by the parent to
   * `dashboard.folders.renameFolder(folder.id, newName)`. Trimming
   * happens here so the parent's hook can stay agnostic.
   */
  onRename: (newName: string) => Promise<void> | void
}

export function RenameFolderDialog({
  folder,
  open,
  onOpenChange,
  onRename,
}: RenameFolderDialogProps) {
  const [value, setValue] = useState(folder.name)
  const [submitting, setSubmitting] = useState(false)

  // Reset every time the dialog re-opens so it always pre-fills with
  // the current name (not whatever was left from a previous cancel).
  useEffect(() => {
    if (open) setValue(folder.name)
  }, [open, folder.name])

  const trimmed = value.trim()
  const canSave = trimmed.length > 0 && trimmed !== folder.name && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSubmitting(true)
    try {
      await onRename(trimmed)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Rename folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={folder.name}
          />
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
