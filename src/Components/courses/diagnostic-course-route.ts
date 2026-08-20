import type { CourseDiagnostics, CourseTemperatureGrade } from '../../api/courses'
import type { MapCoordinate, MapRoute } from '../map'
import { courseRouteCoordinates } from './course-map'
import { splitLineIntoGradientPieces } from './route-gradient'

export const diagnosticRouteColor = (grade: CourseTemperatureGrade) => ({
  LOW: '#20BFA9',
  MODERATE: '#F2A14B',
  HIGH: '#F47A50',
  VERY_HIGH: '#DE5A4F',
}[grade])

type DiagnosticCourseRouteOptions = {
  idPrefix: string
  drawGroupId: string
  coordinates: MapCoordinate[]
  diagnostics?: CourseDiagnostics
  interactive?: boolean
  selectedLegSequence?: number
  segmentFocusActive?: boolean
}

export function buildDiagnosticCourseRoutes({
  idPrefix,
  drawGroupId,
  coordinates,
  diagnostics,
  interactive = false,
  selectedLegSequence,
  segmentFocusActive = false,
}: DiagnosticCourseRouteOptions): MapRoute[] {
  if (coordinates.length < 2) return []

  const chevronRoute: MapRoute = {
    id: `${idPrefix}-direction-chevrons`,
    coordinates,
    color: 'rgba(0, 0, 0, 0)',
    width: 0,
    drawOnLoad: true,
    drawGroupId,
    drawOrder: 1,
    chevrons: true,
  }

  if (!diagnostics?.segments.length) {
    const plainPieces = splitLineIntoGradientPieces(coordinates, '#F47A3A', '#F47A3A', 24)
    return [
      ...plainPieces.map((piece, index) => ({
        id: `${idPrefix}-route-${index}`,
        coordinates: piece.coordinates,
        color: '#f47a3a',
        width: 8,
        outlineColor: 'rgba(255, 255, 255, .94)',
        outlineWidth: 12,
        lineCap: 'round' as const,
        drawOnLoad: true,
        drawGroupId,
        drawOrder: piece.progress,
      })),
      chevronRoute,
    ]
  }

  const routePieces: MapRoute[] = diagnostics.segments.flatMap((segment, segmentIndex) => {
    const segmentCoordinates = courseRouteCoordinates(segment.route)
    const nextSegment = diagnostics.segments[segmentIndex + 1]
    const pieces = splitLineIntoGradientPieces(
      segmentCoordinates,
      diagnosticRouteColor(segment.temperatureGrade),
      diagnosticRouteColor(nextSegment?.temperatureGrade ?? segment.temperatureGrade),
      6,
    )
    const totalPieceCount = Math.max(1, diagnostics.segments.length * 6)
    return pieces.map((piece, pieceIndex) => {
      const selected = segmentFocusActive && segment.legSequence === selectedLegSequence
      return {
        id: `${idPrefix}-segment-${segment.sequence}-${pieceIndex}`,
        coordinates: piece.coordinates,
        color: piece.color,
        width: selected ? 10 : 8,
        outlineColor: selected ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, .94)',
        outlineWidth: selected ? 15 : 12,
        lineCap: 'round' as const,
        interactive,
        interactionId: interactive ? `course-leg-${segment.legSequence}` : undefined,
        selected,
        drawOnLoad: true,
        drawGroupId,
        drawOrder: (segmentIndex * 6 + pieceIndex + 1) / totalPieceCount,
      }
    })
  })

  return [...routePieces, chevronRoute]
}
