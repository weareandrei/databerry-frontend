'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { USER_SETTINGS, type UserSettings } from '@/lib/api'

interface UserSettingsPatch {
  preferredTrafficConnectionId?: string | null
}

interface UserSettingsContextValue {
  settings: UserSettings | null
  loading: boolean
  updateSettings: (patch: UserSettingsPatch) => Promise<void>
  refresh: () => Promise<void>
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

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
  return out
}
