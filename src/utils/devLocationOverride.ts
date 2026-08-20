import type { MapCoordinate } from '../Components/map/types'

export const DEV_TEST_ACCOUNT_LOCATIONS: Readonly<Record<string, MapCoordinate>> = {
  'test@naver.com': { latitude: 37.564, longitude: 126.997 },
  'test2@naver.com': { latitude: 37.56355, longitude: 126.99755 },
}

const DEV_LOCATION_ACCOUNT_KEY = 'mungroute.dev-location-account'

const normalizeEmail = (email?: string) => email?.trim().toLowerCase()

const readStoredTestAccount = () => {
  if (!import.meta.env.DEV) return undefined
  try {
    const email = normalizeEmail(window.sessionStorage.getItem(DEV_LOCATION_ACCOUNT_KEY) ?? undefined)
    return email && DEV_TEST_ACCOUNT_LOCATIONS[email] ? email : undefined
  } catch {
    return undefined
  }
}

let activeEmail: string | undefined = readStoredTestAccount()

export function setDevLocationOverrideUser(email?: string) {
  const normalizedEmail = import.meta.env.DEV ? normalizeEmail(email) : undefined
  activeEmail = normalizedEmail && DEV_TEST_ACCOUNT_LOCATIONS[normalizedEmail]
    ? normalizedEmail
    : undefined
  try {
    if (activeEmail) window.sessionStorage.setItem(DEV_LOCATION_ACCOUNT_KEY, activeEmail)
    else window.sessionStorage.removeItem(DEV_LOCATION_ACCOUNT_KEY)
  } catch {
    // Some embedded browsers disable session storage; the in-memory override still works.
  }
}

export function getDevLocationOverride(email = activeEmail): MapCoordinate | undefined {
  if (!import.meta.env.DEV) return undefined
  const location = DEV_TEST_ACCOUNT_LOCATIONS[normalizeEmail(email) ?? '']
  return location ? { ...location } : undefined
}
