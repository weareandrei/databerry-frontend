'use client'

import { UserCircle } from '@phosphor-icons/react'
import type { OverviewUser } from '@/lib/api'

interface OverviewUsersPanelProps {
  users: OverviewUser[]
  loading?: boolean
}

// Session time: "42s" under 60s, "5m 32s" under an hour, "1h 04m" above.
function formatSessionTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0s'
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) {
    const m = Math.floor(sec / 60)
    const s = Math.round(sec % 60)
    return `${m}m ${String(s).padStart(2, '0')}s`
  }
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Relative last-seen: "just now", "3m ago", "4h ago", else local date.
function formatLastSeen(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const diffSec = (Date.now() - t) / 1000
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return new Date(t).toLocaleDateString()
}

// Pseudo-ID displayed as "User #<7chars>". Keeps the row compact while still
// being stable per distinct_id. We don't hash — the provider's distinct_id is
// already opaque and high-entropy, so a prefix is plenty for visual identity.
function shortPseudoId(id: string): string {
  const cleaned = id.replace(/^[^a-zA-Z0-9]+/, '')
  return cleaned.slice(0, 7) || '—'
}

function UserRow({ user }: { user: OverviewUser }) {
  return (
    <li className="flex items-center gap-3 rounded-md bg-main px-3 py-2 min-w-0">
      {/* Phosphor avatar — identical for every user for now. Neutral grey so
          it reads as a generic "person" glyph and doesn't imply per-user
          branding. */}
      <UserCircle size={22} weight="fill" className="text-grey-light shrink-0" />

      {/* Label + source pill. min-w-0 lets the label truncate before the
          right-aligned timing cluster gets clipped. */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="truncate text-sm text-grey-darkest font-medium">
          User #{shortPseudoId(user.pseudoId)}
        </span>
        <span
          className="flex items-center gap-1.5 border border-stroke rounded-full pl-1.5 pr-2 py-0.5 text-[10px] text-grey-dark leading-tight shrink-0"
          title={user.label}
        >
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: user.color,
              border: user.color === '#ffffff' ? '1px solid #d1d5db' : undefined,
            }}
          />
          {user.label}
        </span>
      </div>

      {/* Right cluster: session duration · last seen. */}
      <div className="flex items-center gap-2 shrink-0 text-xs tabular-nums text-grey-dark">
        <span>{formatSessionTime(user.sessionSec)}</span>
        <span className="text-grey-light">·</span>
        <span className="text-grey-light">{formatLastSeen(user.lastSeen)}</span>
      </div>
    </li>
  )
}

export function OverviewUsersPanel({ users, loading }: OverviewUsersPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-black/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!users.length) {
    return <p className="text-xs text-grey-light">No users recorded for this range.</p>
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {users.map(u => (
        <UserRow key={u.pseudoId} user={u} />
      ))}
    </ul>
  )
}
