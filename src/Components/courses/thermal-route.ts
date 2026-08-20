import type { CourseTemperatureGrade } from '../../api/courses'
import type { MapCoordinate, MapRoute } from '../map'
import { temperatureColor, temperatureGradeFor } from './course-thermal'
import { splitLineIntoGradientPieces, splitLineIntoWeightedGradientPieces } from './route-gradient'

export type ThermalRouteSegment = {
  lengthM: number
  temperatureGrade: CourseTemperatureGrade
}

type ThermalRouteOptions = {
  id: string
  coordinates: MapCoordinate[]
  thermalSegments?: ThermalRouteSegment[]
  estimatedSurfaceTempC?: number | null
  width?: number
  outlineColor?: string
  outlineWidth?: number
  selected?: boolean
  animated?: boolean
  chevrons?: boolean
}

export const buildThermalRoutes = ({
  id,
  coordinates,
  thermalSegments = [],
  estimatedSurfaceTempC,
  width = 7,
  outlineColor = 'rgba(255, 255, 255, .94)',
  outlineWidth = width + 4,
  selected = false,
  animated = false,
  chevrons = false,
}: ThermalRouteOptions): MapRoute[] => {
  if (coordinates.length < 2) return []

  const pieces = thermalSegments.length
    ? splitLineIntoWeightedGradientPieces(coordinates, thermalSegments.map((segment) => ({
        weight: segment.lengthM,
        color: temperatureColor(segment.temperatureGrade),
      })))
    : splitLineIntoGradientPieces(
        coordinates,
        temperatureColor(temperatureGradeFor(estimatedSurfaceTempC ?? 38)),
        temperatureColor(temperatureGradeFor(estimatedSurfaceTempC ?? 38)),
        12,
      )

  const pieceRoutes: MapRoute[] = pieces.map((piece, index) => ({
    id: `${id}-thermal-${index}`,
    coordinates: piece.coordinates,
    color: piece.color,
    width,
    outlineColor,
    outlineWidth,
    lineCap: 'round',
    selected,
  }))
  const guidanceRoute: MapRoute | undefined = animated || chevrons ? {
    id: `${id}-guidance`,
    coordinates,
    color: 'rgba(0, 0, 0, 0)',
    width: 0,
    animated,
    chevrons,
    selected,
  } : undefined

  return [...pieceRoutes, ...(guidanceRoute ? [guidanceRoute] : [])]
}
