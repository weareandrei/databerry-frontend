'use client'

/**
 * @deprecated Use `EditProjectDialog` instead.
 *
 * This file used to host a name-only rename dialog. The dialog grew
 * to include the website URL and was renamed to `EditProjectDialog`
 * — but old imports of `RenameProjectDialog` (per-row menus,
 * keyboard shortcuts, etc.) keep compiling because we re-export
 * `EditProjectDialog` under the old name here.
 *
 * Migrate any remaining call sites: import `EditProjectDialog` from
 * the sibling file and pass `onSave` (which receives the full patch)
 * instead of the old `onRename(newName)` callback.
 */

export { EditProjectDialog as RenameProjectDialog } from './EditProjectDialog'
