import { useEffect, useState } from 'react'
import type { MapCoordinate } from '../../../Components/map'
import type { NavigationPositionFix } from '../types'
import { bearingBetween, normalizeHeading } from '../utils/bearing'

export function useNavigationHeading(
  position: NavigationPositionFix | undefined,
  walkedCoordinates: MapCoordinate[],
  snappedRouteBearing?: number,
) {
  const [heading, setHeading] = useState<number>()
  const recentBearing = walkedCoordinates.length >= 2
    ? bearingBetween(walkedCoordinates[walkedCoordinates.length - 2], walkedCoordinates[walkedCoordinates.length - 1])
    : undefined
  const target = snappedRouteBearing ?? position?.heading ?? recentBearing

  useEffect(() => {
    if (target === undefined) return
    const frame = requestAnimationFrame(() => {
      setHeading(normalizeHeading(target))
    })
    return () => cancelAnimationFrame(frame)
  }, [target])

  return heading
}
