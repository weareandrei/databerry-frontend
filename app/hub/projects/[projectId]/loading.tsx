/**
 * Route-transition fallback for every `/hub/projects/[id]/*` page.
 * Next.js shows this INSTANTLY when the user clicks a sidebar nav
 * item (while the destination page's chunk/data loads), inside the
 * project layout — so the sidebar stays put and only the body slot
 * flips to a skeleton. Without this file, the OLD page stays frozen
 * on screen until the new one is ready, which reads as a hang.
 */

import { BodySkeleton } from '@/app/hub/(components)/BodySkeleton'

export default function ProjectSubpageLoading() {
  return (
    // `pt-[76px]` ≈ the HubTopBar's height (pt-5 + ~40px controls +
    // pb-4) so the skeleton panel lands where the real panel will.
    <div className="flex flex-col h-screen pt-[76px]">
      <div className="flex-1 min-h-0 mx-4 mb-4 bg-white rounded-2xl border border-stroke shadow-card overflow-hidden">
        <BodySkeleton />
      </div>
    </div>
  )
}
