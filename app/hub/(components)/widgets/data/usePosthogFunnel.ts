'use client'

/**
 * `usePosthogFunnel` — fetches the cumulative-step funnel data for a
 * `posthog_funnel` view. Thin wrapper over `useViewResource`; the only
 * domain logic is the type/connection gate and unwrapping the
 * `unavailable` flag from the API response.
 */

import {
  ALGORITHM,
  type PosthogFunnelStep,
} from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { Widget } from '@/types/widget'
import type { PerViewHookOptions } from './types'

export interface PosthogFunnelResource {
  steps: PosthogFunnelStep[] | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

export function usePosthogFunnel(
  view: Widget,
  options: PerViewHookOptions = {},
): PosthogFunnelResource {
  const { dateFrom, dateTo, enabled = true, tz = null } = options

  const isApplicable =
    enabled && view.type === 'posthog_funnel' && !!view.connectionId

  const fetcher = isApplicable
    ? () =>
        ALGORITHM.getPosthogFunnel(
          view.connectionId!,
          view.id,
          dateFrom,
          dateTo,
          tz,
        ).then(res => (res.unavailable ? [] : res.steps))
    : null

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.id,
    dateFrom,
    dateTo,
    tz,
  ])

  return { steps: data, loading, error, refresh }
}
