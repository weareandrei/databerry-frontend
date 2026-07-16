'use client'

/**
 * `useStripeTopCustomers` — fetches the top-10 customers by gross
 * revenue for a `stripe_top_customers` view. Wide-card list shape;
 * shares the same plumbing as `useCalendlyMeetings` and the PostHog
 * list hooks, just a different endpoint and row type.
 */

import {
  ALGORITHM,
  type StripeTopCustomer,
} from '@/lib/api'
import { useViewResource, type ViewResourceError } from '@/lib/hooks/useViewResource'
import { useStripeRefreshListener } from '@/lib/hooks/useStripeSyncOnMount'
import type { Widget } from '@/types/widget'
import type { PerViewHookOptions } from './types'

export interface StripeTopCustomersResource {
  customers: StripeTopCustomer[] | null
  loading: boolean
  error: ViewResourceError | null
  refresh: (() => void) | undefined
}

export function useStripeTopCustomers(
  view: Widget,
  options: PerViewHookOptions = {},
): StripeTopCustomersResource {
  const { dateFrom, dateTo, enabled = true, tz = null } = options

  const isApplicable =
    enabled && view.type === 'stripe_top_customers' && !!view.connectionId

  const fetcher = isApplicable
    ? () =>
        ALGORITHM.getStripeTopCustomers(view.connectionId!, dateFrom, dateTo, tz)
          .then(res => (res.unavailable ? [] : res.customers))
    : null

  const { data, loading, error, refresh } = useViewResource(fetcher, [
    view.connectionId,
    view.type,
    dateFrom,
    dateTo,
    tz,
  ])

  // Re-fetch when a Stripe sync lands for this connection.
  useStripeRefreshListener(
    isApplicable ? view.connectionId : null,
    refresh,
  )

  return { customers: data, loading, error, refresh }
}
