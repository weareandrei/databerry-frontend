export interface Project {
  id: string
  name: string
  userId: string
  color?: string
  /**
   * Optional website URL. When set, the dashboard renders the site's
   * favicon next to the project name (via Google's `s2/favicons`
   * resolver). `null` / undefined ⇒ generic Cube icon.
   *
   * Stored verbatim as the user entered it (with `https://`
   * pre-prepended on the way in if missing). The host is extracted
   * at render time inside `<ProjectIcon>` — no need to pre-strip.
   */
  websiteUrl?: string | null
  createdAt: string
  updatedAt: string
}
