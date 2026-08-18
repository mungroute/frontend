import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding, MapClickEvent, MapMarker, MapRoute } from '../Components/map'
import { courseRouteCoordinates } from '../Components/courses/course-map'
import { COURSE_REFERENCE_HOURS, requestedAtForHour } from '../Components/courses/course-thermal'
import { splitLineIntoGradientPieces } from '../Components/courses/route-gradient'
import { Button, DraggableSheet, ManagementPageHeader, MetricGrid, Switch } from '../Components/ui'
import { CourseShareSheet } from '../Components/system'
import { courseShareOptions } from '../Components/courses/course-data'
import { courseCatalogApi } from '../api/courses'
import type {
  CourseCatalogApi,
  CourseDetail,
  CourseDiagnostics,
  CourseSegmentDiagnostic,
  CourseSource,
  CourseTemperatureGrade,
} from '../api/courses'
import '../styles/pages/journey-page.css'
import '../styles/pages/management-pages.css'

type CourseDetailPageProps = {
  source: CourseSource
  courseId: number
  map?: BaseMapBinding
  api?: CourseCatalogApi
  onBack?: () => void
  onStart?: (course: CourseDetail) => void
  onCompare?: (course: CourseDetail) => void
  onDeleted?: () => void
  onShare?: (courseId: string) => void
}

const temperatureGradeLabel = {
  LOW: '쾌적',
  MODERATE: '보통',
  HIGH: '더움',
  VERY_HIGH: '매우 더움',
} as const

type DiagnosticLeg = {
  sequence: number
  segments: CourseSegmentDiagnostic[]
  lengthM: number
  estimatedSurfaceTempC: number
  temperatureGrade: CourseTemperatureGrade
  explanation: string
  shadeRatio: number | null
}

const temperatureGradeFor = (temperature: number): CourseTemperatureGrade => {
  if (temperature < 35) return 'LOW'
  if (temperature < 42) return 'MODERATE'
  if (temperature < 48) return 'HIGH'
  return 'VERY_HIGH'
}

const routeTemperatureColor = (grade: CourseTemperatureGrade) => ({
  LOW: '#20BFA9',
  MODERATE: '#F2A14B',
  HIGH: '#F47A50',
  VERY_HIGH: '#DE5A4F',
}[grade])

const mergeSegmentCoordinates = (segments: CourseSegmentDiagnostic[]) => segments.flatMap((segment, index) => {
  const coordinates = courseRouteCoordinates(segment.route)
  return index === 0 ? coordinates : coordinates.slice(1)
})

const formatLegDistance = (lengthM: number) => lengthM >= 1000
  ? `${(lengthM / 1000).toFixed(1)}km`
  : `${Math.round(lengthM)}m`

export function CourseDetailPage({
  source,
  courseId,
  map,
  api = courseCatalogApi,
  onBack,
  onStart,
  onCompare,
  onDeleted,
  onShare,
}: CourseDetailPageProps) {
  const [course, setCourse] = useState<CourseDetail>()
  const [diagnostics, setDiagnostics] = useState<CourseDiagnostics>()
  const [selectedHour, setSelectedHour] = useState<number | 'current'>('current')
  const [selectedLegSequence, setSelectedLegSequence] = useState<number>()
  const [segmentFocusActive, setSegmentFocusActive] = useState(false)
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false)
  const selectedLegButtonRef = useRef<HTMLButtonElement>(null)
  const segmentListRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    let active = true
    const requestedAt = selectedHour === 'current' ? new Date().toISOString() : requestedAtForHour(selectedHour)
    Promise.all([
      api.detail(source, courseId, requestedAt),
      api.diagnostics(source, courseId, requestedAt),
    ])
      .then(([detail, diagnosticResult]) => {
        if (!active) return
        setCourse(detail)
        setDiagnostics(diagnosticResult)
        const hottestSegment = diagnosticResult.segments.reduce<CourseSegmentDiagnostic | undefined>(
          (hottest, segment) => !hottest || segment.estimatedSurfaceTempC > hottest.estimatedSurfaceTempC ? segment : hottest,
          undefined,
        )
        setSelectedLegSequence(hottestSegment?.legSequence ?? diagnosticResult.segments[0]?.legSequence)
        setSegmentFocusActive(false)
        setError(undefined)
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api, source, courseId, selectedHour])

  useEffect(() => {
    const list = segmentListRef.current
    const selectedButton = selectedLegButtonRef.current
    if (!list || !selectedButton) return
    const centeredLeft = selectedButton.offsetLeft - (list.clientWidth - selectedButton.offsetWidth) / 2
    const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth)
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, centeredLeft))
    if (typeof list.scrollTo === 'function') {
      list.scrollTo({ left: nextScrollLeft, behavior: 'smooth' })
    } else {
      list.scrollLeft = nextScrollLeft
    }
  }, [selectedLegSequence])

  const routeCoordinates = useMemo(() => courseRouteCoordinates(course?.route), [course?.route])
  const diagnosticLegs = useMemo<DiagnosticLeg[]>(() => {
    const grouped = new Map<number, CourseSegmentDiagnostic[]>()
    diagnostics?.segments.forEach((segment) => {
      const current = grouped.get(segment.legSequence) ?? []
      current.push(segment)
      grouped.set(segment.legSequence, current)
    })
    return [...grouped.entries()].map(([sequence, segments]) => {
      const lengthM = segments.reduce((sum, segment) => sum + segment.lengthM, 0)
      const weightedTemperature = segments.reduce(
        (sum, segment) => sum + segment.estimatedSurfaceTempC * segment.lengthM,
        0,
      )
      const estimatedSurfaceTempC = lengthM > 0 ? weightedTemperature / lengthM : 0
      const hottest = segments.reduce(
        (current, segment) => segment.estimatedSurfaceTempC > current.estimatedSurfaceTempC ? segment : current,
        segments[0],
      )
      const shadedSegments = segments.filter((segment) => segment.shadeRatio !== null)
      const shadeLength = shadedSegments.reduce((sum, segment) => sum + segment.lengthM, 0)
      const shadeRatio = shadeLength > 0
        ? shadedSegments.reduce((sum, segment) => sum + (segment.shadeRatio ?? 0) * segment.lengthM, 0) / shadeLength
        : null
      return {
        sequence,
        segments,
        lengthM,
        estimatedSurfaceTempC,
        temperatureGrade: temperatureGradeFor(estimatedSurfaceTempC),
        explanation: hottest.explanation,
        shadeRatio,
      }
    })
  }, [diagnostics])
  const sceneOverlay = useMemo(() => {
    const routeMarkers: MapMarker[] = []
    const routeCenter = routeCoordinates.length
      ? {
          latitude: routeCoordinates.reduce((sum, coordinate) => sum + coordinate.latitude, 0) / routeCoordinates.length,
          longitude: routeCoordinates.reduce((sum, coordinate) => sum + coordinate.longitude, 0) / routeCoordinates.length,
        }
      : undefined
    const drawGroupId = `course-detail-${source}-${courseId}`
    const chevronRoute: MapRoute | undefined = routeCoordinates.length > 1 ? {
      id: 'course-direction-chevrons',
      coordinates: routeCoordinates,
      color: 'rgba(0, 0, 0, 0)',
      width: 0,
      drawOnLoad: true,
      drawGroupId,
      drawOrder: 1,
      chevrons: true,
    } : undefined
    if (routeCoordinates.length > 1) {
      routeMarkers.push(
        { id: 'course-start', position: routeCoordinates[0], kind: 'start', label: '출발' },
        {
          id: 'course-finish',
          position: routeCoordinates[routeCoordinates.length - 1],
          kind: 'finish',
          label: '도착',
          revealAfterDraw: drawGroupId,
        },
      )
    }
    const selectedDiagnosticLeg = diagnosticLegs.find((leg) => leg.sequence === selectedLegSequence)
    const selectedDiagnosticCoordinates = selectedDiagnosticLeg
      ? mergeSegmentCoordinates(selectedDiagnosticLeg.segments)
      : []
    let selectedFocusPosition: MapMarker['position'] | undefined
    if (segmentFocusActive && selectedDiagnosticLeg && selectedDiagnosticCoordinates.length > 1) {
      const midpointIndex = Math.floor((selectedDiagnosticCoordinates.length - 1) / 2)
      const midpointStart = selectedDiagnosticCoordinates[midpointIndex]
      const midpointEnd = selectedDiagnosticCoordinates[midpointIndex + 1]
      selectedFocusPosition = {
        latitude: (midpointStart.latitude + midpointEnd.latitude) / 2,
        longitude: (midpointStart.longitude + midpointEnd.longitude) / 2,
      }
    }
    const focusedMapCenter = segmentFocusActive && selectedFocusPosition
      ? {
          latitude: selectedFocusPosition.latitude - 0.00065,
          longitude: selectedFocusPosition.longitude,
        }
      : routeCenter

    if (!diagnostics?.segments.length) {
      const plainPieces = splitLineIntoGradientPieces(routeCoordinates, '#F47A3A', '#F47A3A', 24)
      return routeCoordinates.length
        ? {
            routes: [
              ...plainPieces.map((piece, index) => ({
                id: `course-detail-${index}`,
                coordinates: piece.coordinates,
                color: '#f47a3a',
                width: 8,
                outlineColor: 'rgba(255, 255, 255, .94)',
                outlineWidth: 12,
                drawOnLoad: true,
                drawGroupId,
                drawOrder: piece.progress,
              })),
              ...(chevronRoute ? [chevronRoute] : []),
            ],
            markers: routeMarkers,
            center: routeCenter,
            zoom: 17.2,
          }
        : undefined
    }
    const routePieces: MapRoute[] = diagnostics.segments.flatMap((segment, segmentIndex) => {
      const coordinates = courseRouteCoordinates(segment.route)
      const nextSegment = diagnostics.segments[segmentIndex + 1]
      const pieces = splitLineIntoGradientPieces(
        coordinates,
        routeTemperatureColor(segment.temperatureGrade),
        routeTemperatureColor(nextSegment?.temperatureGrade ?? segment.temperatureGrade),
        6,
      )
      const totalPieceCount = Math.max(1, diagnostics.segments.length * 6)
      return pieces.map((piece, pieceIndex) => {
        const selected = segmentFocusActive && segment.legSequence === selectedLegSequence
        return {
          id: `course-segment-${segment.sequence}-${pieceIndex}`,
          coordinates: piece.coordinates,
          color: piece.color,
          width: selected ? 10 : 8,
          outlineColor: selected ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, .94)',
          outlineWidth: selected ? 15 : 12,
          lineCap: 'round' as const,
          interactive: true,
          interactionId: `course-leg-${segment.legSequence}`,
          selected,
          drawOnLoad: true,
          drawGroupId,
          drawOrder: (segmentIndex * 6 + pieceIndex + 1) / totalPieceCount,
        }
      })
    })
    return {
      routes: [...routePieces, ...(chevronRoute ? [chevronRoute] : [])],
      markers: routeMarkers,
      center: focusedMapCenter,
      zoom: segmentFocusActive ? 17.5 : 17.2,
    }
  }, [courseId, diagnostics, diagnosticLegs, routeCoordinates, selectedLegSequence, segmentFocusActive, source])
  const selectedLeg = diagnosticLegs.find((leg) => leg.sequence === selectedLegSequence)
  const hottestLeg = diagnosticLegs.reduce<DiagnosticLeg | undefined>(
    (hottest, leg) => !hottest || leg.estimatedSurfaceTempC > hottest.estimatedSurfaceTempC ? leg : hottest,
    undefined,
  )
  const coolestLeg = diagnosticLegs.reduce<DiagnosticLeg | undefined>(
    (coolest, leg) => !coolest || leg.estimatedSurfaceTempC < coolest.estimatedSurfaceTempC ? leg : coolest,
    undefined,
  )
  const selectedLegDescription = selectedLeg?.sequence === coolestLeg?.sequence
    ? '가장 쾌적한 구간'
    : selectedLeg?.sequence === hottestLeg?.sequence
      ? '주의가 필요한 구간'
      : selectedLeg ? temperatureGradeLabel[selectedLeg.temperatureGrade] : ''
  const selectMapLeg = (event: MapClickEvent) => {
    const matched = event.featureId?.match(/^course-leg-(\d+)$/)
    if (!matched) return
    setSelectedLegSequence(Number(matched[1]))
    setSegmentFocusActive(true)
    setDiagnosticsVisible(true)
  }
  const metrics = course?.metrics
  const metricItems = [
    { label: '거리', value: metrics ? `${(metrics.lengthM / 1000).toFixed(2)}km` : '-' },
    { label: '예상 시간', value: metrics ? `${metrics.durationMin}분` : '-' },
    {
      label: metrics?.shadeApplicable ? `그늘 · ${metrics.referenceHour}시 기준` : '그늘',
      value: metrics?.shadeApplicable ? `${Math.round((metrics.shadeRatio ?? 0) * 100)}%` : '야간·미산출',
    },
  ]

  const updateRepresentative = async (representative: boolean) => {
    if (!course || busy) return
    setBusy(true)
    try {
      setCourse(await api.setRepresentative(source, courseId, representative))
      setError(undefined)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '대표 코스를 변경하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const deleteCourse = async () => {
    if (busy) return
    setBusy(true)
    try {
      await api.delete(source, courseId)
      onDeleted?.()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '코스를 삭제하지 못했습니다.')
      setDeleteConfirmOpen(false)
      setBusy(false)
    }
  }

  return (
    <main className="journey-page management-page course-detail-page">
      <ManagementPageHeader title="코스 상세" subtitle={course?.courseName} onBack={onBack} />
      {loading && <p className="course-detail-page__state" role="status">코스를 불러오는 중이에요.</p>}
      {error && <p className="course-detail-page__state" role="alert">{error}</p>}

      <BaseMapViewport
        className="course-detail-page__map"
        ariaLabel="저장 코스 상세 지도"
        map={map}
        sceneOverlay={sceneOverlay}
        onMapClick={selectMapLeg}
        fallback={{ src: '/assets/s09/map.jpg' }}
      >
        <div className="course-detail-page__thermal-time" aria-label="노면온도 기준 시각">
          <button
            type="button"
            aria-pressed={selectedHour === 'current'}
            onClick={() => { setLoading(true); setSelectedHour('current') }}
          >현재</button>
          {COURSE_REFERENCE_HOURS.map((hour) => (
            <button
              key={hour}
              type="button"
              aria-pressed={selectedHour === hour}
              onClick={() => { setLoading(true); setSelectedHour(hour) }}
            >{String(hour).padStart(2, '0')}시</button>
          ))}
        </div>
        {diagnostics && (
          <div className="course-detail-page__thermal-controls">
            {!diagnosticsVisible && <button
              className="course-detail-page__thermal-toggle"
              type="button"
              aria-expanded="false"
              aria-controls="course-thermal-details"
              onClick={() => {
                setDiagnosticsVisible(true)
                if (selectedLegSequence !== undefined) setSegmentFocusActive(true)
              }}
            >구간 정보</button>}
            {diagnosticsVisible && <div className="course-detail-page__thermal-card" id="course-thermal-details">
            {selectedLeg && <>
              <div className="course-detail-page__segment-heading">
                <div>
                  <span>{String(diagnostics.referenceHour).padStart(2, '0')}시 기준</span>
                  <strong>{selectedLeg.sequence}구간 · {selectedLegDescription}</strong>
                </div>
                <button type="button" aria-label="구간 정보 닫기" onClick={() => {
                  setDiagnosticsVisible(false)
                  setSegmentFocusActive(false)
                }}>×</button>
              </div>
              <dl className="course-detail-page__segment-facts">
                {selectedLeg.shadeRatio !== null && <div><dt>🌳 그늘 비율</dt><dd>{Math.round(selectedLeg.shadeRatio * 100)}%</dd></div>}
                <div><dt>🌡 노면 온도</dt><dd>{selectedLeg.estimatedSurfaceTempC.toFixed(1)}°C</dd></div>
                <div><dt>🚶 예상 거리</dt><dd>{formatLegDistance(selectedLeg.lengthM)}</dd></div>
              </dl>
              <p className="course-detail-page__segment-summary">{selectedLeg.explanation}</p>
              {diagnostics.shadeMessage && <p className="course-detail-page__thermal-night">{diagnostics.shadeMessage}</p>}
            </>}
            <div ref={segmentListRef} className="course-detail-page__thermal-segments" aria-label="코스 구간 선택">
                  {diagnosticLegs.map((leg) => (
                    <button
                      key={leg.sequence}
                      ref={leg.sequence === selectedLegSequence ? selectedLegButtonRef : undefined}
                      type="button"
                      aria-label={`${leg.sequence}번 연결 구간 ${leg.estimatedSurfaceTempC.toFixed(1)}도`}
                      aria-pressed={leg.sequence === selectedLegSequence}
                      style={{ '--segment-color': routeTemperatureColor(leg.temperatureGrade) } as CSSProperties}
                      onClick={() => {
                        setSelectedLegSequence(leg.sequence)
                        setSegmentFocusActive(true)
                        setDiagnosticsVisible(true)
                      }}
                    ><span>{leg.sequence}</span><small>{leg.estimatedSurfaceTempC.toFixed(0)}°</small></button>
                  ))}
            </div>
          </div>}
          </div>
        )}
      </BaseMapViewport>

      <DraggableSheet className="course-detail-page__sheet" aria-label="코스 상세 패널">
        <div className="course-detail-page__metrics">
          <MetricGrid ariaLabel="코스 정보" items={metricItems} />
        </div>

        <section className="course-detail-page__representative" aria-label="대표 코스 설정">
          <Switch
            checked={course?.representative ?? false}
            onChange={(checked) => void updateRepresentative(checked)}
            label="대표 코스로 설정"
            description="홈에서 바로 시작할 코스"
            ariaLabel="대표 코스로 설정"
          />
        </section>

        <Button className="course-detail-page__start" disabled={!course || busy} onClick={() => course && onStart?.(course)}>이 코스로 산책 시작</Button>
        <Button className="course-detail-page__compare" variant="secondary" disabled={!course || !metrics || busy} onClick={() => course && onCompare?.(course)}>오늘의 추천 대안 보기</Button>
        <Button className="course-detail-page__share" variant="ghost" disabled={!course || busy} onClick={() => setIsShareOpen(true)}>공유하기</Button>
        <button className="course-detail-page__delete" type="button" disabled={!course || busy} onClick={() => setDeleteConfirmOpen(true)}>코스 삭제</button>
      </DraggableSheet>

      {deleteConfirmOpen && (
        <div className="course-detail-page__delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-course-title">
          <strong id="delete-course-title">이 코스를 삭제할까요?</strong>
          <p>삭제한 코스는 복구할 수 없어요.</p>
          <div>
            <button type="button" onClick={() => setDeleteConfirmOpen(false)}>취소</button>
            <button type="button" disabled={busy} onClick={() => void deleteCourse()}>삭제</button>
          </div>
        </div>
      )}
      {isShareOpen && <CourseShareSheet courses={courseShareOptions} onBack={() => setIsShareOpen(false)} onClose={() => setIsShareOpen(false)} onConfirm={(sharedId) => { setIsShareOpen(false); onShare?.(sharedId) }} />}
    </main>
  )
}
