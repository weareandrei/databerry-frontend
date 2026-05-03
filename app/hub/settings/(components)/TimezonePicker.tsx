'use client'

/**
 * Settings → Timezone picker. Native `<select>` of common IANA zones grouped
 * by region, plus a "Detect automatically" link that fills with the
 * browser's `Intl.DateTimeFormat()...timeZone`.
 *
 * Why a native select rather than a fancy combobox: every browser ships
 * type-to-jump on `<select>` (start typing `Eu` → jumps to Europe), the
 * keyboard story is free, no bundle cost. We can swap to a search combobox
 * later if users ask — the universe of IANA zones is ~400 entries, which
 * `<select>` handles fine.
 *
 * `<optgroup>` keeps the long list scannable. We curate the options to the
 * ~75 zones that solo founders are realistically in; the user can still
 * pick any unlisted zone via the "Detect" button (which writes whatever
 * Intl returns, including obscure zones like Pacific/Chatham).
 */

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { detectBrowserTimeZone, useUserSettings } from '@/contexts/UserSettingsContext'

interface TzOption {
  value: string
  label: string
}

interface TzGroup {
  region: string
  zones: TzOption[]
}

// Curated list. Order within each group is roughly west-to-east. UTC is
// surfaced first as a top-level option so users without a regional
// preference don't have to hunt.
const TZ_GROUPS: TzGroup[] = [
  {
    region: 'Universal',
    zones: [{ value: 'UTC', label: 'UTC' }],
  },
  {
    region: 'Americas',
    zones: [
      { value: 'America/Los_Angeles', label: 'Los Angeles' },
      { value: 'America/Denver', label: 'Denver' },
      { value: 'America/Chicago', label: 'Chicago' },
      { value: 'America/New_York', label: 'New York' },
      { value: 'America/Toronto', label: 'Toronto' },
      { value: 'America/Mexico_City', label: 'Mexico City' },
      { value: 'America/Sao_Paulo', label: 'São Paulo' },
      { value: 'America/Buenos_Aires', label: 'Buenos Aires' },
    ],
  },
  {
    region: 'Europe',
    zones: [
      { value: 'Europe/London', label: 'London' },
      { value: 'Europe/Lisbon', label: 'Lisbon' },
      { value: 'Europe/Paris', label: 'Paris' },
      { value: 'Europe/Madrid', label: 'Madrid' },
      { value: 'Europe/Berlin', label: 'Berlin' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam' },
      { value: 'Europe/Stockholm', label: 'Stockholm' },
      { value: 'Europe/Warsaw', label: 'Warsaw' },
      { value: 'Europe/Bucharest', label: 'Bucharest' },
      { value: 'Europe/Athens', label: 'Athens' },
      { value: 'Europe/Istanbul', label: 'Istanbul' },
      { value: 'Europe/Moscow', label: 'Moscow' },
    ],
  },
  {
    region: 'Africa',
    zones: [
      { value: 'Africa/Casablanca', label: 'Casablanca' },
      { value: 'Africa/Lagos', label: 'Lagos' },
      { value: 'Africa/Cairo', label: 'Cairo' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg' },
      { value: 'Africa/Nairobi', label: 'Nairobi' },
    ],
  },
  {
    region: 'Asia',
    zones: [
      { value: 'Asia/Dubai', label: 'Dubai' },
      { value: 'Asia/Tehran', label: 'Tehran' },
      { value: 'Asia/Karachi', label: 'Karachi' },
      { value: 'Asia/Kolkata', label: 'Kolkata (India)' },
      { value: 'Asia/Bangkok', label: 'Bangkok' },
      { value: 'Asia/Singapore', label: 'Singapore' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
      { value: 'Asia/Shanghai', label: 'Shanghai' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Asia/Seoul', label: 'Seoul' },
    ],
  },
  {
    region: 'Oceania',
    zones: [
      { value: 'Australia/Perth', label: 'Perth' },
      { value: 'Australia/Adelaide', label: 'Adelaide' },
      { value: 'Australia/Sydney', label: 'Sydney' },
      { value: 'Pacific/Auckland', label: 'Auckland' },
    ],
  },
]

// Flat lookup so we can detect when the persisted value isn't in the
// curated list and inject it as a one-off entry (otherwise a user who
// auto-detected `Pacific/Chatham` would see an empty select).
const KNOWN_ZONES: ReadonlySet<string> = new Set(
  TZ_GROUPS.flatMap(g => g.zones.map(z => z.value)),
)

export function TimezonePicker() {
  const { settings, loading, updateSettings } = useUserSettings()
  const [saving, setSaving] = useState(false)
  // Local state so the select reflects mid-save value. Mirrors the persisted
  // settings on every change.
  const [value, setValue] = useState<string>('UTC')

  useEffect(() => {
    if (settings?.timezone) setValue(settings.timezone)
    else if (settings && settings.timezone == null) setValue('UTC')
  }, [settings])

  const handleSave = async (next: string) => {
    setValue(next)
    setSaving(true)
    try {
      await updateSettings({ timezone: next })
      toast.success(`Timezone updated to ${next}`)
    } catch {
      // updateSettings already toasts the error
    } finally {
      setSaving(false)
    }
  }

  const handleDetect = async () => {
    const detected = detectBrowserTimeZone()
    await handleSave(detected)
  }

  // If the persisted value isn't in our curated list, inject a synthetic
  // group at the top so the select can still display it.
  const groupsToRender =
    value && !KNOWN_ZONES.has(value)
      ? [
          {
            region: 'Current',
            zones: [{ value, label: value }],
          },
          ...TZ_GROUPS,
        ]
      : TZ_GROUPS

  return (
    <div className="space-y-2">
      <select
        className="w-full text-sm border border-stroke rounded-md px-3 py-2 bg-white outline-none focus:ring-1 focus:ring-brand/40 disabled:opacity-50"
        value={value}
        disabled={loading || saving}
        onChange={e => void handleSave(e.target.value)}
      >
        {groupsToRender.map(g => (
          <optgroup key={g.region} label={g.region}>
            {g.zones.map(z => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => void handleDetect()}
        disabled={loading || saving}
        className="h-auto justify-start p-0 text-xs text-grey-light hover:text-grey-darkest"
      >
        Detect automatically
      </Button>
    </div>
  )
}

/**
 * One-shot effect: when the page mounts with `#timezone` in the URL, scroll
 * the matching section into view. Used by the sidebar's "Change timezone"
 * deep-link.
 */
export function useScrollToTimezoneAnchor() {
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#timezone') return
    // Use rAF so the layout has settled by the time we scroll. `block: 'start'`
    // sits the section right at the top of the viewport.
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return sectionRef
}
