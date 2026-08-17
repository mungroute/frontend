import { useEffect, useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { courseRouteCoordinates } from '../Components/courses/course-map'
import { temperatureColor } from '../Components/courses/course-thermal'
import { DraggableSheet } from '../Components/ui'
import { CourseAlternativeUnavailableDialog } from '../Components/system'
import { courseCatalogApi } from '../api/courses'
import type { CourseCatalogApi, CourseComparison, CourseDiagnostics, CourseDrawMetrics, CourseSource } from '../api/courses'
import '../styles/pages/journey-page.css'
import '../styles/pages/route-comparison-page.css'

type RouteComparisonPageProps = {
  source: CourseSource
  courseId: number
  map?: BaseMapBinding
  api?: CourseCatalogApi
  onBack?: () => void
  onStartAlternative?: (comparison: CourseComparison) => void
  onStartUsual?: (comparison: CourseComparison) => void
}

const metricDescription = (metrics: CourseDrawMetrics) => {
  const shade = metrics.shadeApplicable
    ? `그늘 ${Math.round((metrics.shadeRatio ?? 0) * 100)}%`
    : '야간 그늘 미산출'
  return `${shade} · 추정 노면 ${metrics.estimatedSurfaceTempC.toFixed(1)}℃`
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

export function RouteComparisonPage({
  source,
  courseId,
  map,
  api = courseCatalogApi,
  onBack = () => window.history.back(),
  onStartAlternative = () => undefined,
  onStartUsual = () => undefined,
}: RouteComparisonPageProps) {
  const [selectedRoute, setSelectedRoute] = useState<'usual' | 'alternative'>('alternative')
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
        setUnavailableDialogOpen(!result.hasAlternative)
        setError(undefined)
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api, source, courseId])

  const sceneOverlay = useMemo(() => {
    if (!comparison) return undefined
    const routes = diagnostics?.segments.length
      ? diagnostics.segments.map((segment) => ({
        id: `usual-segment-${segment.sequence}`,
        coordinates: courseRouteCoordinates(segment.route),
        color: temperatureColor(segment.temperatureGrade),
        width: selectedRoute === 'usual' ? 6 : 4,
      }))
      : [{
        id: 'usual-course',
        coordinates: courseRouteCoordinates(comparison.usualRoute),
        color: '#80796f',
        width: 4,
      }]
    if (comparison.hasAlternative && comparison.alternativeRoute) {
      routes.push({
        id: 'alternative-course',
        coordinates: courseRouteCoordinates(comparison.alternativeRoute),
        color: '#ff753a',
        width: 6,
      })
    }
    return { routes: routes.filter((route) => route.coordinates.length > 1) }
  }, [comparison, diagnostics, selectedRoute])

  const hottestWasSwapped = Boolean(
    diagnostics?.hottestSegmentId
      && comparison?.swappedSections.some((section) => section.originalSegmentIds.includes(diagnostics.hottestSegmentId!)),
  )

  const alternativeSelected = selectedRoute === 'alternative' && Boolean(comparison?.hasAlternative)

  return (
    <main className="journey-page route-comparison-page">
      <BaseMapViewport
        className="route-comparison-page__map"
        ariaLabel="기존 코스와 추천 대안 비교 지도"
        map={map}
        sceneOverlay={sceneOverlay}
        fallback={{ src: '/assets/s05/map.jpg' }}
      />

      <button className="route-comparison-page__back" type="button" onClick={onBack} aria-label="코스 비교에서 뒤로 가기">
        <span aria-hidden="true">‹</span> 코스 비교
      </button>

      <DraggableSheet className="route-comparison-page__sheet">
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

            <div className="route-comparison-page__cards">
              <button type="button" className="route-comparison-page__card" aria-pressed={!alternativeSelected} onClick={() => setSelectedRoute('usual')}>
                <strong>나의 기존 코스</strong>
                <span>{comparison.usual.durationMin}분 · {(comparison.usual.lengthM / 1000).toFixed(2)}km</span>
                <small>{metricDescription(comparison.usual)}</small>
              </button>
              {comparison.hasAlternative && comparison.alternative && (
                <button type="button" className="route-comparison-page__card" aria-pressed={alternativeSelected} onClick={() => setSelectedRoute('alternative')}>
                  <strong>오늘의 추천 대안</strong>
                  <span>{comparison.alternative.durationMin}분 · {(comparison.alternative.lengthM / 1000).toFixed(2)}km</span>
                  <small>{metricDescription(comparison.alternative)}</small>
                </button>
              )}
            </div>

            {comparison.hasAlternative && <p className="route-comparison-page__difference">거리 {Math.round(comparison.distanceDifferenceM ?? 0)}m 추가 · 추정 노면온도 {comparison.temperatureImprovementC?.toFixed(1)}℃ 개선</p>}
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
                <button className="route-comparison-page__usual" type="button" onClick={() => alternativeSelected ? onStartUsual(comparison) : onStartAlternative(comparison)}>
                  {alternativeSelected ? '기존 코스로 시작' : '대안 코스로 시작'}
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
