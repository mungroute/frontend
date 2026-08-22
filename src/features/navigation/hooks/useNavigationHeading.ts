import { useEffect, useRef, useState } from 'react'
import type { MapCoordinate } from '../../../Components/map'
import type { NavigationPositionFix } from '../types'
import { bearingBetween, normalizeHeading } from '../utils/bearing'

type CompassOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number
}

type PermissionAwareDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export function deviceHeadingFromOrientation(
  event: Pick<CompassOrientationEvent, 'absolute' | 'alpha' | 'webkitCompassHeading'>,
  screenAngle = 0,
) {
  if (Number.isFinite(event.webkitCompassHeading)) {
    return normalizeHeading(event.webkitCompassHeading as number)
  }
  if (event.absolute && Number.isFinite(event.alpha)) {
    return normalizeHeading(360 - (event.alpha as number) + screenAngle)
  }
  return undefined
}

export async function requestNavigationOrientationPermission() {
  if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent !== 'function') return false
  const OrientationEvent = window.DeviceOrientationEvent as PermissionAwareDeviceOrientationEvent
  if (typeof OrientationEvent.requestPermission !== 'function') return true
  try {
    return await OrientationEvent.requestPermission() === 'granted'
  } catch {
    return false
  }
}

export function useNavigationHeading(
  position: NavigationPositionFix | undefined,
  walkedCoordinates: MapCoordinate[],
  snappedRouteBearing?: number,
) {
  const [heading, setHeading] = useState<number>()
  const [deviceHeading, setDeviceHeading] = useState<number>()
  const orientationFrameRef = useRef<number | undefined>(undefined)
  const recentBearing = walkedCoordinates.length >= 2
    ? bearingBetween(walkedCoordinates[walkedCoordinates.length - 2], walkedCoordinates[walkedCoordinates.length - 1])
    : undefined
  const gpsHeading = position?.heading !== null && position?.heading !== undefined
    ? position.heading
    : undefined
  const target = deviceHeading ?? gpsHeading ?? recentBearing ?? snappedRouteBearing

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOrientation = (rawEvent: Event) => {
      const event = rawEvent as CompassOrientationEvent
      const screenAngle = window.screen.orientation?.angle
        ?? (window as Window & { orientation?: number }).orientation
        ?? 0
      const nextHeading = deviceHeadingFromOrientation(event, screenAngle)
      if (nextHeading === undefined) return
      if (orientationFrameRef.current !== undefined) cancelAnimationFrame(orientationFrameRef.current)
      orientationFrameRef.current = requestAnimationFrame(() => {
        setDeviceHeading(nextHeading)
        orientationFrameRef.current = undefined
      })
    }
    window.addEventListener('deviceorientationabsolute', handleOrientation)
    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation)
      window.removeEventListener('deviceorientation', handleOrientation)
      if (orientationFrameRef.current !== undefined) cancelAnimationFrame(orientationFrameRef.current)
    }
  }, [])

  useEffect(() => {
    if (target === undefined) return
    const frame = requestAnimationFrame(() => {
      setHeading(normalizeHeading(target))
    })
    return () => cancelAnimationFrame(frame)
  }, [target])

  return heading
}
