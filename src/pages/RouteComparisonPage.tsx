import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding, MapCoordinate, MapMarker, MapRoute } from '../Components/map'
import { courseRouteCoordinateLines, courseRouteCoordinates } from '../Components/courses/course-map'
import { diagnosticRouteColor } from '../Components/courses/diagnostic-course-route'
import { splitLineIntoGradientPieces } from '../Components/courses/route-gradient'
import { DraggableSheet } from '../Components/ui'
import { CourseAlternativeUnavailableDialog } from '../Components/system'
import { courseCatalogApi } from '../api/courses'
import type { CourseCatalogApi, CourseComparison, CourseDiagnostics, CourseSource } from '../api/courses'
import '../styles/pages/journey-page.css'
import '../styles/pages/route-comparison-page.css'

const USUAL_ROUTE_COLOR = '#f47a3a'
const REPLACEMENT_ROUTE_COLOR = '#20bfa9'
const REPLACED_ROUTE_DASH = [4, 7]
const COMMON_ROUTE_WIDTH = 4
const COMMON_ROUTE_OUTLINE_WIDTH = 8
const REPLACED_ROUTE_WIDTH = 4
const REPLACED_ROUTE_OUTLINE_WIDTH = 8
const REPLACEMENT_ROUTE_WIDTH = 5
const REPLACEMENT_SELECTED_WIDTH = 6
const REPLACEMENT_ROUTE_OUTLINE_WIDTH = 8
const REPLACEMENT_SELECTED_OUTLINE_WIDTH = 10
const COURSE_ROUTE_OUTLINE_COLOR = 'rgba(255, 255, 255, .94)'
const REPLACEMENT_DRAW_DURATION_MS = 520

type RouteComparisonPageProps = {
  source: CourseSource
  courseId: number
  map?: BaseMapBinding
  api?: CourseCatalogApi
  onBack?: () => void
  onStartAlternative?: (comparison: CourseComparison) => void
  onStartUsual?: (comparison: CourseComparison) => void
}

const unavailableReasonMessages: Record<string, string> = {
  COURSE_NOT_CONNECTED: '현재 코스 구조에서는 우회 구간을 만들기 어려워요.',
  NO_ALTERNATIVE_PATH: '주변에서 연결 가능한 우회 경로를 찾지 못했어요.',
  NO_CANDIDATE_MEETS_DETOUR_LIMIT: '거리가 너무 늘지 않는 우회 경로를 찾지 못했어요.',
  NO_CANDIDATE_MEETS_TIME: '산책 시간에 맞는 우회 경로를 찾지 못했어요.',
  NO_TEMPERATURE_IMPROVEMENT: '기존 코스보다 시원한 우회 경로를 찾지 못했어요.',
  THERMAL_DATA_UNAVAILABLE: '노면온도 정보가 부족해 대안을 계산하지 못했어요.',
}

const unavailableReasonMessage = (reason: string | null) => {
  if (!reason) return '조건에 맞는 우회 구간을 찾지 못했어요.'
  return unavailableReasonMessages[reason] ?? reason
}

const appendCoordinates = (target: MapCoordinate[], added: MapCoordinate[]) => {
  added.forEach((coordinate) => {
    const previous = target.at(-1)
    if (!previous || previous.latitude !== coordinate.latitude || previous.longitude !== coordinate.longitude) {
      target.push(coordinate)
    }
  })
}

const coordinateDistance = (left: MapCoordinate, right: MapCoordinate) => (
  Math.hypot(left.latitude - right.latitude, left.longitude - right.longitude)
)

const orientLike = (coordinates: MapCoordinate[], reference: MapCoordinate[]) => {
  if (coordinates.length < 2 || reference.length < 2) return coordinates
  const forward = coordinateDistance(coordinates[0], reference[0])
    + coordinateDistance(coordinates.at(-1)!, reference.at(-1)!)
  const backward = coordinateDistance(coordinates.at(-1)!, reference[0])
    + coordinateDistance(coordinates[0], reference.at(-1)!)
  return backward < forward ? [...coordinates].reverse() : coordinates
}

const pointToSegmentDistanceM = (point: MapCoordinate, start: MapCoordinate, end: MapCoordinate) => {
  const latitudeScale = 111_320
  const longitudeScale = latitudeScale * Math.cos(point.latitude * Math.PI / 180)
  const startX = (start.longitude - point.longitude) * longitudeScale
  const startY = (start.latitude - point.latitude) * latitudeScale
  const endX = (end.longitude - point.longitude) * longitudeScale
  const endY = (end.latitude - point.latitude) * latitudeScale
  const deltaX = endX - startX
  const deltaY = endY - startY
  const squaredLength = deltaX * deltaX + deltaY * deltaY
  const ratio = squaredLength === 0
    ? 0
    : Math.max(0, Math.min(1, -(startX * deltaX + startY * deltaY) / squaredLength))
  return Math.hypot(startX + ratio * deltaX, startY + ratio * deltaY)
}

const coordinateAt = (start: MapCoordinate, end: MapCoordinate, ratio: number): MapCoordinate => ({
  latitude: start.latitude + (end.latitude - start.latitude) * ratio,
  longitude: start.longitude + (end.longitude - start.longitude) * ratio,
})

const followsExistingCourse = (
  start: MapCoordinate,
  end: MapCoordinate,
  existingLines: MapCoordinate[][],
) => [0.2, 0.5, 0.8].every((ratio) => {
  const sample = coordinateAt(start, end, ratio)
  return existingLines.some((line) => line.slice(1).some((lineEnd, index) => (
    pointToSegmentDistanceM(sample, line[index], lineEnd) <= 2.5
  )))
})

const routePartsOutsideExistingCourse = (
  coordinates: MapCoordinate[],
  existingLines: MapCoordinate[][],
) => {
  const parts: MapCoordinate[][] = []
  let activePart: MapCoordinate[] | undefined
  coordinates.slice(1).forEach((end, index) => {
    const start = coordinates[index]
    if (followsExistingCourse(start, end, existingLines)) {
      if (activePart && activePart.length >= 2) parts.push(activePart)
      activePart = undefined
      return
    }
    if (!activePart) activePart = [start]
    activePart.push(end)
  })
  if (activePart && activePart.length >= 2) parts.push(activePart)
  return parts
}

const withOpacity = (color: string, opacity: number) => {
  const value = color.replace('#', '')
  if (value.length !== 6) return color
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${opacity})`
}

const routeLength = (coordinates: MapCoordinate[]) => coordinates.slice(1).reduce(
  (sum, coordinate, index) => sum + coordinateDistance(coordinates[index], coordinate),
  0,
)

const routeMidpoint = (coordinates: MapCoordinate[]) => {
  if (coordinates.length < 2) return coordinates[0]
  const total = routeLength(coordinates)
  let travelled = 0
  for (let index = 1; index < coordinates.length; index += 1) {
    const distance = coordinateDistance(coordinates[index - 1], coordinates[index])
    if (travelled + distance >= total / 2) {
      return coordinateAt(coordinates[index - 1], coordinates[index], (total / 2 - travelled) / Math.max(distance, Number.EPSILON))
    }
    travelled += distance
  }
  return coordinates.at(-1)
}

export function RouteComparisonPage({
  source,
  courseId,
  map,
  api = courseCatalogApi,
  onBack = () => window.history.back(),
  onStartAlternative = () => undefined,
  onStartUsual = () => undefined,
}: RouteComparisonPageProps) {
  const reduceMotion = useReducedMotion()
  const [selectedRoute, setSelectedRoute] = useState<'usual' | 'alternative'>('alternative')
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null)
  const [comparisonReveal, setComparisonReveal] = useState(false)
  const [calloutVisible, setCalloutVisible] = useState(false)
  const [comparison, setComparison] = useState<CourseComparison>()
  const [diagnostics, setDiagnostics] = useState<CourseDiagnostics>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [unavailableDialogOpen, setUnavailableDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    const requestedAt = new Date().toISOString()
    Promise.all([
      api.comparison(source, courseId, requestedAt),
      api.diagnostics(source, courseId, requestedAt),
    ])
      .then(([result, diagnosticResult]) => {
        if (!active) return
        setComparison(result)
        setDiagnostics(diagnosticResult)
        setSelectedRoute(result.hasAlternative ? 'alternative' : 'usual')
        setSelectedSectionIndex(null)
        setComparisonReveal(false)
        setCalloutVisible(false)
        setUnavailableDialogOpen(!result.hasAlternative)
        setError(undefined)
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api, source, courseId])

  useEffect(() => {
    if (!comparison?.hasAlternative) return
    const revealDelay = reduceMotion ? 0 : 180
    const revealTimer = window.setTimeout(() => setComparisonReveal(true), revealDelay)
    const calloutTimer = window.setTimeout(
      () => setCalloutVisible(true),
      reduceMotion ? 0 : 180 + REPLACEMENT_DRAW_DURATION_MS + 100,
    )
    return () => {
      window.clearTimeout(revealTimer)
      window.clearTimeout(calloutTimer)
    }
  }, [comparison?.courseId, comparison?.hasAlternative, reduceMotion])

  const comparisonViewFit = useMemo(() => {
    if (!comparison) return undefined
    const route = selectedRoute === 'alternative' && comparison.alternativeRoute
      ? comparison.alternativeRoute
      : comparison.usualRoute
    const coordinates = courseRouteCoordinates(route)
    return coordinates.length ? {
      coordinates,
      padding: [66, 20, 18, 20] as [number, number, number, number],
      maxZoom: 17,
    } : undefined
  }, [comparison, selectedRoute])

  const sceneOverlay = useMemo(() => {
    if (!comparison) return undefined
    const usualCoordinates = courseRouteCoordinates(comparison.usualRoute)
    const usualCoordinateLines = courseRouteCoordinateLines(comparison.usualRoute)
    const alternativeCoordinates = comparison.hasAlternative && comparison.alternativeRoute
      ? courseRouteCoordinates(comparison.alternativeRoute)
      : []
    const alternativeSelected = selectedRoute === 'alternative' && alternativeCoordinates.length > 0
    const replacedDiagnosticIndexes = new Set<number>()
    const originalCoordinatesBySection = new Map<number, MapCoordinate[]>()
    let diagnosticSearchStart = 0
    if (diagnostics?.segments.length) {
      [...comparison.swappedSections]
        .sort((left, right) => left.sectionIndex - right.sectionIndex)
        .forEach((section) => {
          const ids = section.originalSegmentIds
          if (
            Number.isInteger(section.fromSegmentIndex)
            && Number.isInteger(section.toSegmentIndexExclusive)
            && section.fromSegmentIndex >= 0
            && section.toSegmentIndexExclusive <= diagnostics.segments.length
            && section.toSegmentIndexExclusive > section.fromSegmentIndex
          ) {
            const matchedCoordinates: MapCoordinate[] = []
            for (let index = section.fromSegmentIndex; index < section.toSegmentIndexExclusive; index += 1) {
              replacedDiagnosticIndexes.add(index)
              appendCoordinates(matchedCoordinates, courseRouteCoordinates(diagnostics.segments[index].route))
            }
            originalCoordinatesBySection.set(section.sectionIndex, matchedCoordinates)
            diagnosticSearchStart = section.toSegmentIndexExclusive
            return
          }
          let matchedFrom = -1
          for (let start = diagnosticSearchStart; start + ids.length <= diagnostics.segments.length; start += 1) {
            if (ids.every((id, offset) => diagnostics.segments[start + offset]?.segmentId === id)) {
              matchedFrom = start
              break
            }
          }
          if (matchedFrom < 0) return
          const matchedCoordinates: MapCoordinate[] = []
          for (let index = matchedFrom; index < matchedFrom + ids.length; index += 1) {
            replacedDiagnosticIndexes.add(index)
            appendCoordinates(matchedCoordinates, courseRouteCoordinates(diagnostics.segments[index].route))
          }
          originalCoordinatesBySection.set(section.sectionIndex, matchedCoordinates)
          diagnosticSearchStart = matchedFrom + ids.length
        })
    }

    let sectionVisuals = comparison.swappedSections.map((section) => {
      const reference = originalCoordinatesBySection.get(section.sectionIndex)
        ?? courseRouteCoordinates(section.originalRoute)
      const parts = courseRouteCoordinateLines(section.alternativeRoute).flatMap((line) => (
        routePartsOutsideExistingCourse(orientLike(line, reference), usualCoordinateLines)
      ))
      return { section, parts }
    })
    if (!sectionVisuals.some((visual) => visual.parts.length) && sectionVisuals.length) {
      const fallbackParts = courseRouteCoordinateLines(comparison.alternativeRoute).flatMap((line) => (
        routePartsOutsideExistingCourse(orientLike(line, usualCoordinates), usualCoordinateLines)
      ))
      sectionVisuals = sectionVisuals.map((visual, index) => index === 0
        ? { ...visual, parts: fallbackParts }
        : visual)
    }
    const activeSectionIndex = selectedSectionIndex ?? sectionVisuals[0]?.section.sectionIndex
    const selectionActive = selectedSectionIndex !== null && alternativeSelected && comparisonReveal

    const routes: MapRoute[] = diagnostics?.segments.length
      ? diagnostics.segments.flatMap<MapRoute>((segment, index) => {
        const replaced = alternativeSelected && comparisonReveal && replacedDiagnosticIndexes.has(index)
        const commonDimmed = selectionActive && !replaced
        const segmentCoordinates = courseRouteCoordinates(segment.route)
        if (replaced) {
          return [{
            id: `usual-segment-${segment.sequence}-replaced`,
            coordinates: segmentCoordinates,
            color: withOpacity(USUAL_ROUTE_COLOR, .78),
            width: REPLACED_ROUTE_WIDTH,
            outlineColor: 'rgba(255, 255, 255, .88)',
            outlineWidth: REPLACED_ROUTE_OUTLINE_WIDTH,
            lineCap: 'butt' as const,
            lineDash: REPLACED_ROUTE_DASH,
          }]
        }
        const nextSegment = diagnostics.segments[index + 1]
        const pieces = splitLineIntoGradientPieces(
          segmentCoordinates,
          diagnosticRouteColor(segment.temperatureGrade),
          diagnosticRouteColor(nextSegment?.temperatureGrade ?? segment.temperatureGrade),
          6,
        )
        return pieces.map((piece, pieceIndex) => ({
          id: `usual-segment-${segment.sequence}-${pieceIndex}`,
          coordinates: piece.coordinates,
          color: withOpacity(piece.color, commonDimmed ? .66 : 1),
          width: COMMON_ROUTE_WIDTH,
          outlineColor: COURSE_ROUTE_OUTLINE_COLOR,
          outlineWidth: COMMON_ROUTE_OUTLINE_WIDTH,
          lineCap: 'round' as const,
        }))
      })
      : [{
        id: 'usual-course',
        coordinates: usualCoordinates,
        color: withOpacity(USUAL_ROUTE_COLOR, selectionActive ? .66 : 1),
        width: COMMON_ROUTE_WIDTH,
        outlineColor: COURSE_ROUTE_OUTLINE_COLOR,
        outlineWidth: COMMON_ROUTE_OUTLINE_WIDTH,
        lineCap: 'round',
      }]

    if (alternativeSelected && comparisonReveal) {
      const drawGroupId = `comparison-replacement-${source}-${courseId}`
      sectionVisuals.forEach(({ section, parts }) => {
        const sectionSelected = selectedSectionIndex === section.sectionIndex
        parts.forEach((coordinates, partIndex) => {
          const pieces = splitLineIntoGradientPieces(coordinates, REPLACEMENT_ROUTE_COLOR, REPLACEMENT_ROUTE_COLOR, 8)
          routes.push(...pieces.map((piece, pieceIndex) => ({
            id: `alternative-section-${section.sectionIndex}-${partIndex}-${pieceIndex}`,
            coordinates: piece.coordinates,
            color: REPLACEMENT_ROUTE_COLOR,
            width: sectionSelected ? REPLACEMENT_SELECTED_WIDTH : REPLACEMENT_ROUTE_WIDTH,
            outlineColor: sectionSelected ? 'rgba(255, 255, 255, 1)' : COURSE_ROUTE_OUTLINE_COLOR,
            outlineWidth: sectionSelected ? REPLACEMENT_SELECTED_OUTLINE_WIDTH : REPLACEMENT_ROUTE_OUTLINE_WIDTH,
            lineCap: 'round' as const,
            selected: true,
            interactive: true,
            interactionId: `comparison-section-${section.sectionIndex}`,
            drawOnLoad: true,
            drawGroupId,
            drawOrder: piece.progress,
            drawDurationMs: REPLACEMENT_DRAW_DURATION_MS,
          })))
          routes.push({
            id: `alternative-section-${section.sectionIndex}-${partIndex}-chevrons`,
            coordinates,
            color: 'rgba(0, 0, 0, 0)',
            width: 0,
            selected: true,
            interactive: true,
            interactionId: `comparison-section-${section.sectionIndex}`,
            drawOnLoad: true,
            drawGroupId,
            drawOrder: 1,
            drawDurationMs: REPLACEMENT_DRAW_DURATION_MS,
            chevrons: true,
          })
        })
      })
    }
    const selectedCoordinates = selectedRoute === 'alternative' && alternativeCoordinates.length
      ? alternativeCoordinates
      : usualCoordinates
    const latitudes = selectedCoordinates.map((coordinate) => coordinate.latitude)
    const longitudes = selectedCoordinates.map((coordinate) => coordinate.longitude)
    const markers: MapMarker[] = selectedCoordinates.length ? [
      { id: 'comparison-start', kind: 'start', position: selectedCoordinates[0], label: '출발' },
      { id: 'comparison-finish', kind: 'finish', position: selectedCoordinates.at(-1)!, label: '도착' },
    ] : []
    if (alternativeSelected && comparisonReveal) {
      const markerKeys = new Set<string>()
      sectionVisuals.forEach(({ section, parts }) => {
        const sectionSelected = selectedSectionIndex === section.sectionIndex
        parts.forEach((coordinates, partIndex) => {
          const endpoints = [coordinates[0], coordinates.at(-1)!]
          endpoints.forEach((position, endpointIndex) => {
            const key = `${position.latitude.toFixed(7)}:${position.longitude.toFixed(7)}`
            if (markerKeys.has(key)) return
            markerKeys.add(key)
            markers.push({
              id: `comparison-junction-${section.sectionIndex}-${partIndex}-${endpointIndex}`,
              kind: 'detour-junction',
              position,
              selected: sectionSelected,
            })
          })
        })
      })
      const activeVisual = sectionVisuals.find(({ section }) => section.sectionIndex === activeSectionIndex)
      const calloutPart = activeVisual?.parts.reduce<MapCoordinate[] | undefined>(
        (longest, part) => !longest || routeLength(part) > routeLength(longest) ? part : longest,
        undefined,
      )
      const calloutPosition = calloutPart ? routeMidpoint(calloutPart) : undefined
      if (calloutVisible && activeVisual && calloutPosition) {
        const shadeDifference = comparison.alternative?.shadeApplicable && comparison.usual.shadeApplicable
          ? Math.round(((comparison.alternative.shadeRatio ?? 0) - (comparison.usual.shadeRatio ?? 0)) * 100)
          : 0
        const temperatureText = `노면 -${activeVisual.section.temperatureImprovementC.toFixed(1)}℃`
        markers.push({
          id: `comparison-callout-${activeVisual.section.sectionIndex}`,
          kind: 'route-callout',
          position: calloutPosition,
          label: shadeDifference > 0 ? `그늘 +${shadeDifference}% · ${temperatureText}` : temperatureText,
          interactive: true,
          interactionId: `comparison-section-${activeVisual.section.sectionIndex}`,
          selected: selectedSectionIndex === activeVisual.section.sectionIndex,
        })
      }
    }
    return {
      center: selectedCoordinates.length
        ? {
            latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
            longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
          }
        : undefined,
      viewFit: comparisonViewFit,
      markers,
      routes: routes.filter((route) => route.coordinates.length > 1),
    }
  }, [calloutVisible, comparison, comparisonReveal, comparisonViewFit, courseId, diagnostics, selectedRoute, selectedSectionIndex, source])

  const hottestWasSwapped = Boolean(
    diagnostics?.hottestSegmentId
      && comparison?.swappedSections.some((section) => section.originalSegmentIds.includes(diagnostics.hottestSegmentId!)),
  )

  const alternativeSelected = selectedRoute === 'alternative' && Boolean(comparison?.hasAlternative)
  const selectSection = (sectionIndex: number) => {
    setSelectedRoute('alternative')
    setSelectedSectionIndex(sectionIndex)
  }

  return (
    <main className="journey-page route-comparison-page">
      <BaseMapViewport
        className="route-comparison-page__map"
        ariaLabel="기존 코스와 추천 대안 비교 지도"
        map={map}
        sceneOverlay={sceneOverlay}
        fallback={{ src: '/assets/s05/map.jpg' }}
        onMapClick={({ featureId }) => {
          const matched = featureId?.match(/^comparison-section-(\d+)$/)
          if (matched) selectSection(Number(matched[1]))
        }}
        mapClickLabel="추천 변경 구간 선택"
      >
        {alternativeSelected && comparisonReveal && (
          <div className="route-comparison-page__legend" aria-label="코스 색상 안내">
            <span>기존 길<i className="route-comparison-page__legend-line route-comparison-page__legend-line--usual" /></span>
            <span>변경 구간<i className="route-comparison-page__legend-line route-comparison-page__legend-line--replacement" /></span>
          </div>
        )}
      </BaseMapViewport>

      <button className="route-comparison-page__back" type="button" onClick={onBack} aria-label="코스 비교에서 뒤로 가기">
        <span aria-hidden="true">‹</span> 코스 비교
      </button>

      <DraggableSheet
        className="route-comparison-page__sheet"
        upwardDragBoundarySelector=".route-comparison-page__actions"
        upwardDragBoundarySpacing={32}
      >
        {loading && <p role="status">추천 대안을 계산하는 중이에요.</p>}
        {error && <p role="alert">{error}</p>}
        {comparison && (
          <>
            <h1>{comparison.hasAlternative ? '오늘은 이 구간만 바꿔볼까요?' : '지금 코스를 그대로 걸어도 좋아요'}</h1>
            <p className="route-comparison-page__intro">
              {comparison.hasAlternative
                ? `${comparison.swappedSections.length}개 구간을 바꾸면 노면온도가 ${comparison.temperatureImprovementC?.toFixed(1)}℃ 낮아져요.`
                : unavailableReasonMessage(comparison.unavailableReason)}
            </p>
            {comparison.hasAlternative && <div className="route-comparison-page__recommendation"><img src="/assets/s05/recommendation-dot.svg" alt="" /> 추천 코스</div>}

            {comparison.hasAlternative && comparison.alternative && (
              <div className="route-comparison-page__impact" aria-label="추천 변경 효과">
                <strong>오늘의 변화</strong>
                <p>
                  기존 {comparison.usual.estimatedSurfaceTempC.toFixed(1)}℃
                  <span aria-hidden="true">→</span>
                  추천 {comparison.alternative.estimatedSurfaceTempC.toFixed(1)}℃
                  <em>↓ {comparison.temperatureImprovementC?.toFixed(1)}℃</em>
                </p>
                {comparison.usual.shadeApplicable && comparison.alternative.shadeApplicable && (
                  <small>그늘 {Math.round((comparison.usual.shadeRatio ?? 0) * 100)}% → {Math.round((comparison.alternative.shadeRatio ?? 0) * 100)}%</small>
                )}
                <small>거리 {Math.round(comparison.distanceDifferenceM ?? 0)}m 추가</small>
              </div>
            )}

            {comparison.hasAlternative && (
              <div className="route-comparison-page__sections" aria-label="변경 구간 목록">
                {comparison.swappedSections.map((section, index) => (
                  <button
                    key={section.sectionIndex}
                    type="button"
                    aria-pressed={selectedSectionIndex === section.sectionIndex}
                    onClick={() => selectSection(section.sectionIndex)}
                  >
                    <span><i aria-hidden="true" /> 변경 구간 {index + 1}</span>
                    <strong>노면 -{section.temperatureImprovementC.toFixed(1)}℃</strong>
                    <small>거리 +{Math.round(section.addedLengthM)}m</small>
                  </button>
                ))}
              </div>
            )}

            <div className="route-comparison-page__route-toggle" aria-label="표시할 코스 선택">
              <button type="button" aria-pressed={!alternativeSelected} onClick={() => setSelectedRoute('usual')}>
                <strong>나의 기존 코스</strong>
                <span>{comparison.usual.durationMin}분 · {(comparison.usual.lengthM / 1000).toFixed(2)}km</span>
              </button>
              {comparison.hasAlternative && comparison.alternative && (
                <button type="button" aria-pressed={alternativeSelected} onClick={() => setSelectedRoute('alternative')}>
                  <strong>오늘의 추천 대안</strong>
                  <span>{comparison.alternative.durationMin}분 · {(comparison.alternative.lengthM / 1000).toFixed(2)}km</span>
                </button>
              )}
            </div>

            {diagnostics && (
              <div className="route-comparison-page__diagnostic">
                <strong>{diagnostics.referenceHour}시 가장 뜨거운 구간</strong>
                <p>{diagnostics.summary}</p>
                {hottestWasSwapped && <span>추천 대안이 이 구간을 우회해요.</span>}
              </div>
            )}
            <div className="route-comparison-page__actions">
              <button className="journey-page__primary-action" type="button" onClick={() => alternativeSelected ? onStartAlternative(comparison) : onStartUsual(comparison)}>
                {alternativeSelected ? '대안 코스로 산책 시작' : '기존 코스로 산책 시작'}
              </button>
              {comparison.hasAlternative && (
                <button className="route-comparison-page__usual" type="button" onClick={() => setSelectedRoute(alternativeSelected ? 'usual' : 'alternative')}>
                  {alternativeSelected ? '기존 코스 선택' : '대안 코스 선택'}
                </button>
              )}
            </div>
          </>
        )}
      </DraggableSheet>
      {comparison && unavailableDialogOpen && !comparison.hasAlternative && (
        <CourseAlternativeUnavailableDialog
          message={unavailableReasonMessage(comparison.unavailableReason)}
          onClose={() => setUnavailableDialogOpen(false)}
        />
      )}
    </main>
  )
}
