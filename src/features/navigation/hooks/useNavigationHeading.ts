import { useEffect, useState } from 'react'
import type { MapCoordinate } from '../../../Components/map'
import type { NavigationPositionFix } from '../types'
import { bearingBetween } from '../utils/bearing'
import { smoothHeading } from '../utils/heading-smoothing'

export function useNavigationHeading(
  position: NavigationPositionFix | undefined,
  walkedCoordinates: MapCoordinate[],
  snappedRouteBearing?: number,
) {
  const [heading, setHeading] = useState<number>()
  const recentBearing = walkedCoordinates.length >= 2
    ? bearingBetween(walkedCoordinates[walkedCoordinates.length - 2], walkedCoordinates[walkedCoordinates.length - 1])
    : undefined
  const target = position?.heading ?? recentBearing ?? snappedRouteBearing

  useEffect(() => {
    if (target === undefined) return
    const frame = requestAnimationFrame(() => {
      setHeading((current) => smoothHeading(current, target))
    })
    return () => cancelAnimationFrame(frame)
  }, [target])

  return heading
}
