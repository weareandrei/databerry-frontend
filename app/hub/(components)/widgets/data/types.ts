/**
 * Shared types for the per-view data hooks under `view/data/`.
 *
 * Every per-view hook accepts the same options shape so call sites are
 * uniform whether they live on the project page (always live, current
 * range) or the folder page (which gates fetches with `enabled: !historical`
 * for past dates).
 */

export interface PerViewHookOptions {
  /** Range start (YYYY-MM-DD UTC). When omitted, the hook's underlying
   *  API call falls back to its server-side default (typically "today"). */
  dateFrom?: string
  /** Range end (YYYY-MM-DD UTC). Same default semantics as `dateFrom`. */
  dateTo?: string
  /** Skip the fetch entirely when false. Used by the folder page to keep
   *  hooks in render order while suppressing work for historical (rewound)
   *  dates that don't have a saved equivalent. Default: `true`. */
  enabled?: boolean
  /**
   * Caller's currently-selected timezone (e.g. `'Europe/Bucharest'`).
   * Passed through to the API so day-bucketing math runs in the user's
   * wall-clock time rather than UTC. `null`/omitted → backend defaults to
   * UTC.
   *
   * Lives in options (not a `useSelector` inside each hook) because these
   * hooks must stay provider-free — the marketing landing page renders
   * `<LiveValueWidget>` etc. outside any Redux Provider, and a `useSelector`
   * call inside a low-level component crashes the whole demo. The
   * dashboard's page-level callers (`ProjectView`, `PinnedViews`,
   * folder page) read `state.ui.globalTimeZone` once and pass it in.
   */
  tz?: string | null
}
