'use client'

/**
 * `usePosthogUsers` — fetches the recent-users list for a
 * `posthog_users` view. List view, no aggregation; max 500 rows
 * enforced server-side.
 */

import {
  ALGORITHM,
  type PosthogUserRow,
} from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import type { View } from '@/types/view'
import type { PerViewHookOptions } from './types'

export interface PosthogUsersResource {
  users: PosthogUserRow[] | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

export function usePosthogUsers(
  view: View,
  options: PerViewHookOptions = {},
): PosthogUsersResource {
  const { dateFrom, dateTo, enabled = true, tz = null } = options

  const isApplicable =
    enabled && view.type === 'posthog_users' && !!view.connectionId

  const fetcher = isApplicable
    ? () =>
        ALGORITHM.getPosthogUsers(
          view.connectionId!,
          view.id,
          dateFrom,
          dateTo,
          tz,
        ).then(res => (res.unavailable ? [] : res.users))
    : null

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.id,
    dateFrom,
    dateTo,
    tz,
  ])

  return { users: data, loading, error, refresh }
}
