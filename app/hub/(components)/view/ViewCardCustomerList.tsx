'use client'

import { useState } from 'react'
import { ArrowsClockwise, User } from '@phosphor-icons/react'
import { ViewWrapper } from './ViewWrapper'
import { ViewHeader } from './ViewHeader'
import { FetchErrorBadge } from './ViewCard'
import { ReassignConnectionDialog } from './ReassignConnectionDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ConnectionMissingError, type StripeTopCustomer } from '@/lib/api'
import type { ViewResourceError } from '@/lib/hooks/useViewResource'
import { formatCents } from '@/utils/formatters'
import type { View } from '@/types/view'

/**
 * Compute initials from a full name. "Alice" → "A", "Alice Smith" → "AS",
 * "Alice von Hagen" → "AH" (drop particles by taking first + last token).
 * Returns null when the input doesn't yield anything reasonable so the
 * caller can fall back to a generic icon.
 */
function initialsFor(name: string | null): string | null {
  if (!name) return null
  const tokens = name.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null
  if (tokens.length === 1) return tokens[0]!.charAt(0).toUpperCase()
  const first = tokens[0]!.charAt(0).toUpperCase()
  const last = tokens[tokens.length - 1]!.charAt(0).toUpperCase()
  return `${first}${last}`
}

/**
 * Compose the location string from city + country.
 *   - both present → "Bucharest, RO"
 *   - city only    → "Bucharest"
 *   - country only → "RO"
 *   - neither      → null (caller omits the segment)
 */
function locationLabel(
  city: string | null,
  country: string | null,
): string | null {
  if (city && country) return `${city}, ${country}`
  if (city) return city
  if (country) return country
  return null
}

// `ViewCardList` is currently hard-typed to Calendly's `MeetingRow`; rather
// than refactoring it into a generic list (deferred until a third list view
// appears), this is a dedicated copy for `stripe_top_customers`. Same shell
// — header, reattach badge, error states — different row.
function CustomerRow({ customer }: { customer: StripeTopCustomer }) {
  // Primary line: a human-readable handle (name → email → "Customer" if we
  // have neither). The customer ID always shows on the subline below so the
  // user can still cross-reference with Stripe; it never appears alone as
  // the primary because a `cus_xxx` string is unreadable by itself.
  const primaryDisplay =
    customer.name ?? customer.email ?? 'Customer'

  // Subline pieces. Order: email (when name was the primary, so we don't
  // repeat) → city → cus_xxx. Each separated by " · ", any missing
  // segment collapses cleanly. The customer ID is rendered last because
  // it's the longest token and benefits most from natural truncation.
  const sublineSegments: string[] = []
  if (customer.name && customer.email) sublineSegments.push(customer.email)
  const loc = locationLabel(customer.addressCity, customer.addressCountry)
  if (loc) sublineSegments.push(loc)
  // Always include the customer ID — that's the user's ask for cross-
  // referencing in Stripe. When name + email are both null we still
  // render it here even though the primary line ("Customer") doesn't
  // identify the customer; the ID makes the row meaningful again.
  sublineSegments.push(customer.customerId)
  const subline = sublineSegments.join(' · ')

  // Avatar: initials when we have a name, generic person icon otherwise.
  // Stripe doesn't supply customer images, so the fallback is the only
  // path; using `Avatar` from shadcn/base-ui keeps the styling consistent
  // with the rest of the app (border, sizing, fallback colour).
  const initials = initialsFor(customer.name)

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-b-0 border-black/[0.06]">
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback>
          {initials ? (
            initials
          ) : (
            <User size={12} weight="bold" className="text-muted-foreground" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{primaryDisplay}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{subline}</p>
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {formatCents(customer.amountCents)}
      </span>
    </div>
  )
}

interface ViewCardCustomerListProps {
  view: View
  onUntrack?: (id: string) => void
  customers: StripeTopCustomer[] | null
  loading: boolean
  /**
   * Same routing convention as `ViewCardList`: a `ConnectionMissingError`
   * triggers the click-to-reattach badge; everything else is a generic
   * "Couldn't load" treatment.
   */
  error: ViewResourceError | null
  historical?: boolean
  projectName?: string
  onRefresh?: () => void
  refreshing?: boolean
  onPin?: () => void
  isPinned?: boolean
  onConnectionAssigned?: (updated: View) => void
}

export function ViewCardCustomerList({
  view,
  onUntrack,
  customers,
  loading,
  error,
  historical = false,
  projectName,
  onRefresh,
  refreshing,
  onPin,
  isPinned,
  onConnectionAssigned,
}: ViewCardCustomerListProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const isDisconnected = !view.connectionId
  const isConnectionMissing = error instanceof ConnectionMissingError
  const needsReattach = isDisconnected || isConnectionMissing

  return (
    <>
      <ViewWrapper className="col-span-2 row-span-2">
        <ViewHeader
          name={view.name}
          connectionType={view.connectionType}
          connectionLabel="Stripe"
          isDisconnected={isDisconnected}
          isConnectionMissing={isConnectionMissing}
          onReconnect={() => setReassignOpen(true)}
          onUntrack={onUntrack}
          viewId={view.id}
          projectName={projectName}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onPin={onPin}
          isPinned={isPinned}
        />

        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-3 mt-2">
          {loading ? (
            <div className="flex items-center gap-1.5 py-2">
              <ArrowsClockwise size={13} weight="bold" className="text-muted-foreground animate-spin" />
              <span className="text-xs text-muted-foreground">Loading customers…</span>
            </div>
          ) : needsReattach ? (
            <div className="py-2">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setReassignOpen(true)
                }}
                className="self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                aria-label="Attach a connection to this view"
              >
                <FetchErrorBadge message="Connection missing — click to reattach" />
              </button>
            </div>
          ) : error ? (
            <div className="py-2"><FetchErrorBadge message="Couldn't load customers" /></div>
          ) : customers && customers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              {historical
                ? 'No charges in this date range.'
                : 'No customers yet — the list populates after the first charge.'}
            </p>
          ) : customers ? (
            customers.map(c => <CustomerRow key={c.customerId} customer={c} />)
          ) : null}
        </div>
      </ViewWrapper>

      <ReassignConnectionDialog
        view={view}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onAssigned={onConnectionAssigned}
      />
    </>
  )
}
