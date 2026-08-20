import type { MapCoordinate } from './types'
import { getDevLocationOverride } from '../../utils/devLocationOverride'

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
}

export function requestBrowserLocation(): Promise<MapCoordinate> {
  const overriddenLocation = getDevLocationOverride()
  if (overriddenLocation) return Promise.resolve(overriddenLocation)

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(getDevLocationOverride() ?? {
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      reject,
      GEOLOCATION_OPTIONS,
    )
  })
}
