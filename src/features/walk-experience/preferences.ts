import { useEffect, useState } from 'react'

export type WalkExperiencePreferences = {
  navigationVoiceEnabled: boolean
  watchSystemNotificationEnabled: boolean
}

const STORAGE_KEY = 'mungroute.walk-experience-preferences.v1'

export const defaultWalkExperiencePreferences: WalkExperiencePreferences = {
  navigationVoiceEnabled: true,
  watchSystemNotificationEnabled: true,
}

export function readWalkExperiencePreferences(): WalkExperiencePreferences {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<WalkExperiencePreferences>
    return {
      navigationVoiceEnabled: stored.navigationVoiceEnabled ?? true,
      watchSystemNotificationEnabled: stored.watchSystemNotificationEnabled ?? true,
    }
  } catch {
    return defaultWalkExperiencePreferences
  }
}

export function useWalkExperiencePreferences() {
  const [preferences, setPreferences] = useState(readWalkExperiencePreferences)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Storage can be unavailable in private browsing. The in-memory setting still works.
    }
  }, [preferences])

  const updatePreference = <Key extends keyof WalkExperiencePreferences>(
    key: Key,
    value: WalkExperiencePreferences[Key],
  ) => setPreferences((current) => ({ ...current, [key]: value }))

  return { preferences, updatePreference }
}
