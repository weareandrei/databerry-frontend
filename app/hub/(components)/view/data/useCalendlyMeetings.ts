'use client'

/**
 * `useCalendlyMeetings` — fetches the meetings list for a
 * `calendly_meetings_list` view. Wide-card list shape.
 */

import {
  ALGORITHM,
  type CalendlyMeeting,
} from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { View } from '@/types/view'
import type { PerViewHookOptions } from './types'

export interface CalendlyMeetingsResource {
  meetings: CalendlyMeeting[] | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

export function useCalendlyMeetings(
  view: View,
  options: PerViewHookOptions = {},
): CalendlyMeetingsResource {
  const { dateFrom, dateTo, enabled = true, tz = null } = options

  const isApplicable =
    enabled && view.type === 'calendly_meetings_list' && !!view.connectionId

  const fetcher = isApplicable
    ? () =>
        ALGORITHM.getCalendlyMeetingsList(view.connectionId!, dateFrom, dateTo, tz)
          .then(res => res.meetings)
    : null

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.type,
    dateFrom,
    dateTo,
    tz,
  ])

  return { meetings: data, loading, error, refresh }
}
