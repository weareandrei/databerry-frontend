'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { USER_SETTINGS, type UserSettings } from '@/lib/api'
import { setGlobalTimeZone } from '@/store/slices/uiSlice'

interface UserSettingsPatch {
  preferredTrafficConnectionId?: string | null
  /** IANA name (e.g. `Europe/Bucharest`). `null` clears the user's choice. */
  timezone?: string | null
}

interface UserSettingsContextValue {
  settings: UserSettings | null
  loading: boolean
  updateSettings: (patch: UserSettingsPatch) => Promise<void>
  refresh: () => Promise<void>
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)

/**
 * Read the browser's resolved IANA tz, falling back to `'UTC'` for browsers
 * that don't expose one (rare, but still possible — old Safari, locked-down
 * embedded views). Lives at module scope so the same call site can be
 * reused on first-mount auto-detect *and* on the Settings page's "detect
 * automatically" button.
 */
export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await USER_SETTINGS.get()
      setSettings(data)
    } catch {
      // Silent on first load — user may not have a row yet (backend returns defaults).
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Auto-detect tz on first load. Runs once `settings` lands and only when
  // `timezone` is null (= "never set"). We persist the detected value back
  // so subsequent sessions skip this branch — and so any other client
  // (mobile, second device) sees the same zone.
  useEffect(() => {
    if (!settings) return
    if (settings.timezone != null) return
    const detected = detectBrowserTimeZone()
    void USER_SETTINGS.update({ timezone: detected })
      .then(saved => setSettings(saved))
      .catch(() => {
        // Auto-detect is best-effort. Failing here means the user keeps
        // null tz → backend keeps defaulting to 'UTC' → views still work,
        // just in UTC. We try again next mount.
      })
  }, [settings])

  // Mirror the (possibly-just-detected) tz into redux so view-fetch hooks
  // can `useSelector` it without prop-drilling. Falls back to UTC when the
  // user explicitly cleared the value (rare, but supported).
  useEffect(() => {
    if (!settings) return
    dispatch(setGlobalTimeZone(settings.timezone ?? 'UTC'))
  }, [settings, dispatch])

  const updateSettings = useCallback<UserSettingsContextValue['updateSettings']>(
    async patch => {
      // Optimistic
      const previous = settings
      if (previous) setSettings({ ...previous, ...normalizePatch(patch) })
      try {
        const saved = await USER_SETTINGS.update(patch)
        setSettings(saved)
      } catch {
        if (previous) setSettings(previous)
        toast.error('Failed to save settings')
        throw new Error('save failed')
      }
    },
    [settings],
  )

  return (
    <UserSettingsContext.Provider value={{ settings, loading, updateSettings, refresh }}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) throw new Error('useUserSettings must be used within UserSettingsProvider')
  return ctx
}

function normalizePatch(patch: UserSettingsPatch): Partial<UserSettings> {
  const out: Partial<UserSettings> = {}
  if (patch.preferredTrafficConnectionId !== undefined)
    out.preferredTrafficConnectionId = patch.preferredTrafficConnectionId
  if (patch.timezone !== undefined) out.timezone = patch.timezone
  return out
}
