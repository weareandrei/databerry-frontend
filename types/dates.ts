/**
 * Shared date primitives — the one source of truth for the
 * granularity union that was previously re-declared inline
 * (`'daily' | 'weekly' | 'monthly'`) across a dozen-plus components,
 * hooks and API helpers.
 *
 * `utils/dateHelpers.ts` re-exports `DateMode` under its historical
 * aliases (`GlobalDateMode`, `OverviewMode`) so existing imports keep
 * working; new code should import from here.
 */

/** Chart/period granularity selected by the global date-mode picker. */
export type DateMode = 'daily' | 'weekly' | 'monthly'

/** Inclusive ISO-date window (`YYYY-MM-DD`), as carried in Redux
 *  (`ui.globalDateFrom/To`) and threaded through every data fetch. */
export interface DateRange {
  dateFrom: string
  dateTo: string
}
