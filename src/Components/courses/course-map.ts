import type { MapCoordinate } from '../map'
import type { CourseRouteGeoJson } from '../../api/courses'

export const courseRouteCoordinates = (route?: CourseRouteGeoJson | null): MapCoordinate[] => {
  if (!route) return []
  const coordinates = route.type === 'LineString'
    ? route.coordinates as number[][]
    : (route.coordinates as number[][][]).flat()
  return coordinates
    .filter((coordinate) => coordinate.length >= 2)
    .map(([longitude, latitude]) => ({ latitude, longitude }))
}
