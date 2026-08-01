import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { GlobalDateMode, periodBoundaries, shiftPeriod, toDateStr } from '@/utils/dateHelpers'

// Wraps `toDateStr(new Date())` for readability at call sites. UTC-anchored
// (matches how the backend interprets every dateFrom/dateTo string).
function todayISO(): string {
  return toDateStr(new Date())
}

/**
 * Boundaries for the DEFAULT period shown on first dashboard load —
 * the current week. Same math `setGlobalDateMode` runs when the user
 * picks "Weekly" from the dropdown, including the cap-at-today rule
 * from `resetGlobalToCurrent` (mid-week, the period's natural end is
 * in the future; we never display a future end boundary).
 */
function initialWeeklyPeriod(): { from: string; to: string } {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  const { from, to } = periodBoundaries('weekly', now)
  const today = todayISO()
  return { from, to: to > today ? today : to }
}

const INITIAL_PERIOD = initialWeeklyPeriod()

interface UiState {
  globalDateMode: GlobalDateMode
  globalDateFrom: string
  globalDateTo: string
  /**
   * IANA timezone for every view-fetch (forwarded as `?tz=` to the
   * backend). Mirrors `UserSettingsContext.settings.timezone` — the context
   * is the writer, this slice is the read side that view hooks subscribe
   * to. `null` until the auto-detect/load completes — hooks that read it
   * should treat null as "skip fetch" so we don't fire duplicate requests
   * once it lands. Falls back to `'UTC'` if the user has no value persisted.
   */
  globalTimeZone: string | null
  createProjectModalOpen: boolean
  createFolderModalOpen: boolean
  createFolderParentId: string | null
  createFolderProjectId: string | null
  createConnectionModalOpen: boolean
  createConnectionFolderId: string | null
  createConnectionProjectId: string | null
  createViewModalOpen: boolean
  createViewFolderId: string | null
  createViewProjectId: string | null
}

const initialState: UiState = {
  // Weekly by default — a week of bars reads as a real chart on first
  // open; a single day (the old default) showed one sparse hourly
  // chart that most mornings was mostly empty.
  globalDateMode: 'weekly',
  globalDateFrom: INITIAL_PERIOD.from,
  globalDateTo: INITIAL_PERIOD.to,
  // null = "still loading from UserSettingsContext". The provider hydrates
  // this on mount; until then view hooks block fetches so we don't run
  // queries with the wrong tz then re-run with the right one.
  globalTimeZone: null,
  createProjectModalOpen: false,
  createFolderModalOpen: false,
  createFolderParentId: null,
  createFolderProjectId: null,
  createConnectionModalOpen: false,
  createConnectionFolderId: null,
  createConnectionProjectId: null,
  createViewModalOpen: false,
  createViewFolderId: null,
  createViewProjectId: null,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setGlobalRange(state, action: PayloadAction<{ from: string; to: string }>) {
      state.globalDateFrom = action.payload.from
      state.globalDateTo = action.payload.to
    },
    setGlobalDateMode(state, action: PayloadAction<GlobalDateMode>) {
      state.globalDateMode = action.payload
      const now = new Date()
      now.setUTCHours(0, 0, 0, 0)
      const { from, to } = periodBoundaries(action.payload, now)
      state.globalDateFrom = from
      state.globalDateTo = to
    },
    shiftGlobalPeriod(state, action: PayloadAction<1 | -1>) {
      const today = todayISO()
      const { from, to } = shiftPeriod(
        state.globalDateMode,
        state.globalDateFrom,
        state.globalDateTo,
        action.payload
      )
      // Never advance past today: if the new `from` is already past today, refuse.
      if (from > today) return
      // Cap `to` at today so we don't display a future end boundary.
      state.globalDateFrom = from
      state.globalDateTo = to > today ? today : to
    },
    resetGlobalToCurrent(state) {
      const now = new Date()
      now.setUTCHours(0, 0, 0, 0)
      const { from, to } = periodBoundaries(state.globalDateMode, now)
      state.globalDateFrom = from
      // Cap `to` at today (e.g. within a current week/month we shouldn't show future dates).
      const todayStr = todayISO()
      state.globalDateTo = to > todayStr ? todayStr : to
    },
    /**
     * Mirror the user's tz from `UserSettingsContext` into redux. Called by
     * the provider's effect whenever the context value changes (initial
     * load, auto-detect, settings save).
     */
    setGlobalTimeZone(state, action: PayloadAction<string | null>) {
      state.globalTimeZone = action.payload
    },
    openCreateProjectModal(state) {
      state.createProjectModalOpen = true
    },
    closeCreateProjectModal(state) {
      state.createProjectModalOpen = false
    },
    openCreateFolderModal(state, action: PayloadAction<{ parentId: string | null; projectId: string }>) {
      state.createFolderModalOpen = true
      state.createFolderParentId = action.payload.parentId
      state.createFolderProjectId = action.payload.projectId
    },
    closeCreateFolderModal(state) {
      state.createFolderModalOpen = false
      state.createFolderParentId = null
      state.createFolderProjectId = null
    },
    openCreateConnectionModal(
      state,
      action: PayloadAction<{ folderId: string | null; projectId?: string | null }>,
    ) {
      state.createConnectionModalOpen = true
      state.createConnectionFolderId = action.payload.folderId
      state.createConnectionProjectId = action.payload.projectId ?? null
    },
    closeCreateConnectionModal(state) {
      state.createConnectionModalOpen = false
      state.createConnectionFolderId = null
      state.createConnectionProjectId = null
    },
    openCreateViewModal(state, action: PayloadAction<{ folderId: string | null; projectId: string }>) {
      state.createViewModalOpen = true
      state.createViewFolderId = action.payload.folderId
      state.createViewProjectId = action.payload.projectId
    },
    closeCreateViewModal(state) {
      state.createViewModalOpen = false
      state.createViewFolderId = null
      state.createViewProjectId = null
    },
  },
})

export const {
  setGlobalRange,
  setGlobalDateMode,
  shiftGlobalPeriod,
  resetGlobalToCurrent,
  setGlobalTimeZone,
  openCreateProjectModal,
  closeCreateProjectModal,
  openCreateFolderModal,
  closeCreateFolderModal,
  openCreateConnectionModal,
  closeCreateConnectionModal,
  openCreateViewModal,
  closeCreateViewModal,
} = uiSlice.actions
export default uiSlice.reducer
