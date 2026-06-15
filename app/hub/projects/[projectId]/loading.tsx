/**
 * Route-transition fallback for every `/hub/projects/[id]/*` page.
 * Next.js shows this INSTANTLY when the user clicks a sidebar nav
 * item (while the destination page's chunk/data loads), inside the
 * project layout — so the real sidebar stays put and only the body
 * slot flips to a skeleton. Without this file, the OLD page stays
 * frozen on screen until the new one is ready, which reads as a hang.
 *
 * Renders the top bar AND body as skeletons (the top bar belongs to
 * the page, not the layout, so it would otherwise vanish mid-transition).
 */

import { BodySkeleton } from '@/app/hub/(components)/BodySkeleton'
import { HubTopBarSkeleton } from '@/app/hub/(components)/HubTopBar'

export default function ProjectSubpageLoading() {
  return (
    <div className="flex flex-col h-screen">
      <HubTopBarSkeleton />
      <div className="flex-1 min-h-0 mx-4 mb-4 bg-white rounded-2xl border border-stroke shadow-card overflow-hidden">
        <BodySkeleton />
      </div>
    </div>
  )
}
