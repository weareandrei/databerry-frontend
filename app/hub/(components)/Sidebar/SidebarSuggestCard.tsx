'use client'

/**
 * Mobile sidebar "Help us improve" card — the feature-suggestion
 * promo shown at the bottom of the mobile burger sheet
 * (`SidebarContents`). Desktop reaches the same surface through the
 * `<IconRail>`'s brand-orange suggest button instead.
 *
 * Was `SidebarPlanBadge`: it used to also carry plan-usage stats +
 * the tier picker, but "Manage plan" moved to the user-email dropdown
 * and the IconRail became the sole tier-picker owner — so all that's
 * left here is the suggest-a-feature card + its dialog, both from the
 * shared `<SuggestFeature>` module.
 */

import { useState } from 'react'
import { HelpImproveCard, SuggestFeatureDialog } from '@/app/hub/(components)/SuggestFeature'

export function SidebarSuggestCard() {
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  return (
    <>
      {/* Wider side margins on mobile pull the card visibly narrower
          than the nav items above; desktop burger keeps `px-2`. */}
      <div className="px-6 md:px-2 mb-2">
        <HelpImproveCard onSuggest={() => setSuggestionOpen(true)} />
      </div>
      <SuggestFeatureDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </>
  )
}
