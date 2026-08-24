import type { MapCoordinate } from '../map'
import type { CourseRouteGeoJson } from '../../api/courses'

export const courseRouteCoordinateLines = (route?: CourseRouteGeoJson | null): MapCoordinate[][] => {
  if (!route) return []
  const lines = route.type === 'LineString'
    ? [route.coordinates as number[][]]
    : route.coordinates as number[][][]
  return lines
    .map((coordinates) => coordinates
      .filter((coordinate) => coordinate.length >= 2)
      .map(([longitude, latitude]) => ({ latitude, longitude })))
    .filter((coordinates) => coordinates.length >= 2)
}

export const courseRouteCoordinates = (route?: CourseRouteGeoJson | null): MapCoordinate[] => (
  courseRouteCoordinateLines(route).flat()
)
