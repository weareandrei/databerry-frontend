/**
 * Route-transition fallback for every `/hub/project/[id]/*` page.
 */

import { BodySkeleton } from '@/app/hub/(components)/skeletons/BodySkeleton'
import { DashboardHeaderSkeleton } from '@/app/hub/(components)/navigation/DashboardHeader'

export default function ProjectSubpageLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <DashboardHeaderSkeleton showActions />
      <div className="flex-1 min-h-0 overflow-hidden">
        <BodySkeleton />
      </div>
    </div>
  )
}
