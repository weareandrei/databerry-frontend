import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { View } from '@/types/view'

interface ViewsState {
  items: View[]
  loading: boolean
  error: string | null
  /**
   * Per-project refresh tick. Bumps ONLY for the project(s) whose
   * views were just added, so a `<ProjectView>` watching its own
   * project's key re-fetches without dragging every sibling
   * `<ProjectView>` along with it.
   *
   * Previously this was a single global `refreshKey: number` — every
   * view-create bumped it, every project on the page re-fetched all
   * its views regardless of relevance. With ~5 projects on the home
   * page, adding a view in project A meant ~5 backend round-trips
   * to /views/by-project AND a brief loading-spinner flash across
   * every project's tile grid. Now: one project, one round-trip.
   *
   * Read via `useViews().refreshKeyFor(projectId)` (returns the tick
   * or 0 if absent). Bumped by `addViews` for each unique
   * projectId in the payload.
   */
  refreshKeyByProject: Record<string, number>
}

const initialState: ViewsState = {
  items: [],
  loading: false,
  error: null,
  refreshKeyByProject: {},
}

const viewsSlice = createSlice({
  name: 'views',
  initialState,
  reducers: {
    setViews(state, action: PayloadAction<View[]>) {
      state.items = action.payload
    },
    addViews(state, action: PayloadAction<View[]>) {
      state.items.push(...action.payload)
      // Bump per-project, deduped — one bump per unique project even
      // if the payload contains multiple views for the same project
      // (e.g. project_overview + project_overview_sources pair).
      const seen = new Set<string>()
      for (const v of action.payload) {
        if (seen.has(v.projectId)) continue
        seen.add(v.projectId)
        state.refreshKeyByProject[v.projectId] =
          (state.refreshKeyByProject[v.projectId] ?? 0) + 1
      }
    },
    removeView(state, action: PayloadAction<string>) {
      state.items = state.items.filter(v => v.id !== action.payload)
    },
    /**
     * Replace a single view by id. Used by the orphan reassignment flow so a
     * tile re-fetches its live value after a connection is attached, without
     * needing a full folder/page refetch. No-op if the id isn't in state.
     */
    replaceView(state, action: PayloadAction<View>) {
      const i = state.items.findIndex(v => v.id === action.payload.id)
      if (i !== -1) state.items[i] = action.payload
    },
    /**
     * Manual refresh trigger for a specific project — used by the
     * "Refresh project" affordance (when we add one) and any future
     * targeted invalidation. NOT fired by `addViews` (that does its
     * own bump as part of the mutation).
     */
    bumpProjectRefreshKey(state, action: PayloadAction<string>) {
      state.refreshKeyByProject[action.payload] =
        (state.refreshKeyByProject[action.payload] ?? 0) + 1
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
})

export const {
  setViews,
  addViews,
  removeView,
  replaceView,
  bumpProjectRefreshKey,
  setLoading,
} = viewsSlice.actions
export default viewsSlice.reducer
