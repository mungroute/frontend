import { useMemo } from 'react'
import type { MapCoordinate } from '../map'

const toPolylinePoints = (coordinates: MapCoordinate[], bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number }) => {
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.0001)
  const lonRange = Math.max(bounds.maxLon - bounds.minLon, 0.0001)
  return coordinates.map(({ latitude, longitude }) => {
    const x = 12 + ((longitude - bounds.minLon) / lonRange) * 76
    const y = 12 + ((bounds.maxLat - latitude) / latRange) * 76
    return `${x},${y}`
  }).join(' ')
}

export function WalkRouteProgress({ planned, walked }: { planned: MapCoordinate[]; walked: MapCoordinate[] }) {
  const geometry = useMemo(() => {
    const all = [...planned, ...walked]
    if (all.length < 2) return undefined
    const latitudes = all.map((coordinate) => coordinate.latitude)
    const longitudes = all.map((coordinate) => coordinate.longitude)
    const bounds = { minLat: Math.min(...latitudes), maxLat: Math.max(...latitudes), minLon: Math.min(...longitudes), maxLon: Math.max(...longitudes) }
    return {
      planned: toPolylinePoints(planned, bounds),
      walked: toPolylinePoints(walked, bounds),
    }
  }, [planned, walked])

  if (!geometry) return null

  return (
    <svg className="active-walk-page__route-progress" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" data-testid="walk-route-progress">
      {planned.length >= 2 && <polyline className="active-walk-page__route-planned" points={geometry.planned} />}
      {walked.length >= 2 && <polyline className="active-walk-page__route-walked" points={geometry.walked} />}
    </svg>
  )
}
