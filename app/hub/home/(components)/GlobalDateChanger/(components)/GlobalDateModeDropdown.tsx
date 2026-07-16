'use client'

import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { setGlobalDateMode } from '@/store/slices/uiSlice'
import { EVENT, trackEvent } from '@/lib/posthog'
import { DateModeControls } from '@/components/DateModeControls'

export function GlobalDateModeDropdown() {
  const dispatch = useDispatch()
  const mode = useSelector((s: RootState) => s.ui.globalDateMode)

  return (
    <DateModeControls
      value={mode}
      onChange={next => {
        if (next !== mode) {
          trackEvent(EVENT.DATE_MODE_CHANGED, {
            mode: next,
            previousMode: mode,
          })
        }
        dispatch(setGlobalDateMode(next))
      }}
    />
  )
}
