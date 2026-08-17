import { useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding, MapClickEvent, MapCoordinate } from '../Components/map'
import { EditableCourseOverlay } from '../Components/courses/CourseVisuals'
import type { CoursePoint } from '../Components/courses/course-data'
import { Button, ManagementPageHeader, Switch } from '../Components/ui'
import { courseDrawApi } from '../api/courses'
import type {
  ConnectCourseResult,
  CourseDrawApi,
  CourseDrawMetrics,
  CustomCourseResult,
  DrawWaypoint,
  SnapCoursePointResult,
} from '../api/courses'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

type DrawCoursePageProps = {
  map?: BaseMapBinding
  api?: CourseDrawApi
  onBack?: () => void
  onSave?: (course: CustomCourseResult) => void
}

type DrawStep = {
  waypoint: DrawWaypoint
  overlayPoint: CoursePoint
  segmentIds: number[]
  routeCoordinates: MapCoordinate[]
  metrics?: CourseDrawMetrics
  loop: boolean
}

const MAX_COURSE_POINTS = 20
const MIN_COURSE_POINTS = 2

const toMapCoordinate = (point: { lat: number; lon: number }): MapCoordinate => ({
  latitude: point.lat,
  longitude: point.lon,
})

const toWaypoint = (snap: SnapCoursePointResult): DrawWaypoint => ({
  original: snap.original,
  snapped: snap.snapped,
  nodeId: snap.nodeId,
  segmentId: snap.segmentId,
  fallbackApplied: snap.originalPointRejected,
})

export function DrawCoursePage({ map, api = courseDrawApi, onBack, onSave }: DrawCoursePageProps) {
  const [steps, setSteps] = useState<DrawStep[]>([])
  const [notice, setNotice] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [courseName, setCourseName] = useState('나만의 산책길')
  const [representative, setRepresentative] = useState(false)
  const latest = steps.at(-1)
  const points = steps.map((step) => step.overlayPoint)
  const coordinates = latest?.routeCoordinates

  const applySnap = async (snap: SnapCoursePointResult, overlayPoint: CoursePoint) => {
    const previous = steps.at(-1)
    const waypoint = toWaypoint(snap)
    if (!previous) {
      setSteps([{
        waypoint,
        overlayPoint,
        segmentIds: [],
        routeCoordinates: [toMapCoordinate(snap.snapped)],
        loop: false,
      }])
      return
    }
    const connected = await api.connect({
      waypoints: [...steps.map((step) => step.waypoint), waypoint],
      requestedAt: new Date().toISOString(),
    })
    setSteps((current) => [...current, createConnectedStep(waypoint, overlayPoint, connected, false)])
  }

  const addPoint = async ({ coordinate, xPercent, yPercent }: MapClickEvent) => {
    if (busy || steps.length >= MAX_COURSE_POINTS || latest?.loop) return
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const snap = await api.snap({ lat: coordinate.latitude, lon: coordinate.longitude })
      if (snap.originalPointRejected && snap.message) setNotice(snap.message)
      await applySnap(snap, { x: xPercent, y: yPercent })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '지점을 산책로에 연결하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const removeLastPoint = () => {
    if (busy) return
    setSteps((current) => current.slice(0, -1))
    setNotice('마지막 지점과 연결 구간을 취소했어요.')
    setError(undefined)
  }

  const closeLoop = async () => {
    const first = steps[0]
    const previous = steps.at(-1)
    if (busy || !first || !previous || steps.length < MIN_COURSE_POINTS || steps.length >= MAX_COURSE_POINTS || previous.loop) return
    if (
      Math.abs(first.waypoint.snapped.lat - previous.waypoint.snapped.lat) < 1e-7
      && Math.abs(first.waypoint.snapped.lon - previous.waypoint.snapped.lon) < 1e-7
    ) {
      setSteps((current) => current.map((step, index) => index === current.length - 1 ? { ...step, loop: true } : step))
      setNotice('출발점으로 돌아온 한 바퀴 코스를 완성했어요.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const connected = await api.connect({
        waypoints: [...steps.map((step) => step.waypoint), first.waypoint],
        requestedAt: new Date().toISOString(),
      })
      setSteps((current) => [...current, createConnectedStep(
        first.waypoint,
        first.overlayPoint,
        connected,
        true,
      )])
      setNotice('출발점으로 연결해 한 바퀴 코스를 완성했어요.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '출발점으로 연결하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const saveCourse = async () => {
    if (!latest?.metrics || latest.segmentIds.length === 0 || !courseName.trim()) return
    setBusy(true)
    setError(undefined)
    try {
      const saved = await api.save({
        courseName: courseName.trim(),
        waypoints: steps.map((step) => step.waypoint),
        loop: latest.loop,
        representative,
        requestedAt: new Date().toISOString(),
      })
      setSaveOpen(false)
      onSave?.(saved)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '코스를 저장하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const sceneOverlay = useMemo(() => ({
    routes: coordinates && coordinates.length > 1 ? [{ id: 'drawn-course', coordinates, color: '#ff7139', width: 6 }] : [],
    markers: steps.map((step, index) => ({
      id: `drawn-course-point-${index}`,
      position: toMapCoordinate(step.waypoint.snapped),
      kind: index === 0 ? 'start' as const : index === steps.length - 1 ? 'finish' as const : 'default' as const,
    })),
  }), [coordinates, steps])

  const isAtLimit = steps.length >= MAX_COURSE_POINTS
  const distanceKm = ((latest?.metrics?.lengthM ?? 0) / 1000).toFixed(2)
  const pointCount = latest?.loop ? Math.max(0, steps.length - 1) : steps.length

  return (
    <main className="journey-page extended-management-page draw-course-page">
      <ManagementPageHeader title="직접 코스 그리기" subtitle="지도를 움직인 뒤 길을 짧게 탭해 이어보세요" onBack={onBack} />
      <BaseMapViewport
        className="draw-course-page__map"
        ariaLabel="직접 코스 편집 지도"
        map={map}
        fallback={{ src: '/assets/s09/map.jpg' }}
        sceneOverlay={sceneOverlay}
        onMapClick={(event) => void addPoint(event)}
      >
        <EditableCourseOverlay points={points} />
        <div className="draw-course-page__edit-actions">
          <button type="button" disabled={!steps.length || busy} onClick={removeLastPoint}>마지막 지점 취소</button>
          <button type="button" disabled={steps.length < MIN_COURSE_POINTS || steps.length >= MAX_COURSE_POINTS || Boolean(latest?.loop) || busy} onClick={() => void closeLoop()}>출발점으로 닫기</button>
        </div>
      </BaseMapViewport>
      <p className={isAtLimit ? 'draw-course-page__tip draw-course-page__tip--limit' : 'draw-course-page__tip'} role="status">
        {busy ? <strong>산책로를 확인하고 있어요.</strong> : isAtLimit ? (
          <strong>최대 20개 지점까지 추가할 수 있어요.</strong>
        ) : (
          <><strong>1. 지도를 드래그로 이동</strong><span>2. 원하는 위치를 탭하면 가까운 산책로에 연결돼요</span></>
        )}
      </p>
      {(notice || error) && <p className={error ? 'draw-course-page__notice draw-course-page__notice--error' : 'draw-course-page__notice'} role={error ? 'alert' : 'status'}>{error ?? notice}</p>}
      <div className="draw-course-page__summary" aria-label="직접 그린 코스 정보">
        <strong>{distanceKm}km</strong><strong>예상 {latest?.metrics?.durationMin ?? 0}분</strong><span>{pointCount}/{MAX_COURSE_POINTS}개 지점</span>
      </div>
      <Button
        className="draw-course-page__save"
        disabled={!latest?.metrics || pointCount < MIN_COURSE_POINTS || busy}
        onClick={() => setSaveOpen(true)}
      >
        {pointCount < MIN_COURSE_POINTS ? '지점을 2개 이상 추가해 주세요' : '코스로 저장하기'}
      </Button>
      {saveOpen && (
        <div className="draw-course-page__save-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setSaveOpen(false)
        }}>
          <section className="draw-course-page__save-dialog" role="dialog" aria-modal="true" aria-labelledby="draw-course-save-title">
            <span className="draw-course-page__save-handle" aria-hidden="true" />
            <header className="draw-course-page__save-header">
              <h2 id="draw-course-save-title">코스 저장하기</h2>
              <p>직접 그린 길을 내 코스에 추가해요.</p>
            </header>
            <div className="draw-course-page__save-summary" aria-label="저장할 코스 요약">
              <span><small>거리</small><strong>{distanceKm}km</strong></span>
              <span><small>예상 시간</small><strong>{latest?.metrics?.durationMin ?? 0}분</strong></span>
              <span>
                <small>그늘</small>
                <strong>{latest?.metrics?.shadeApplicable
                  ? `${Math.round((latest.metrics.shadeRatio ?? 0) * 100)}%`
                  : '햇빛 노출 없음'}</strong>
              </span>
            </div>
            {latest?.metrics && (
              <p className="draw-course-page__calculation-note">
                {latest.metrics.shadeApplicable
                  ? `${latest.metrics.referenceHour}시 기준 추정값이에요.`
                  : `${latest.metrics.referenceHour}시 온도 참고값 · 일몰 후에는 그늘 비율을 표시하지 않아요.`}
              </p>
            )}
            <label className="draw-course-page__save-field" htmlFor="draw-course-name">
              <span>코스 이름</span>
              <input id="draw-course-name" value={courseName} maxLength={100} placeholder="코스 이름을 입력해 주세요" autoFocus onChange={(event) => setCourseName(event.target.value)} />
            </label>
            <div className="draw-course-page__representative">
              <Switch
                checked={representative}
                onChange={setRepresentative}
                label="대표 코스로 설정"
                description="홈에서 바로 시작할 코스로 사용해요."
                ariaLabel="대표 코스로 설정"
              />
            </div>
            <div className="draw-course-page__save-actions">
              <Button variant="secondary" onClick={() => setSaveOpen(false)}>취소</Button>
              <Button disabled={busy || !courseName.trim()} onClick={() => void saveCourse()}>저장</Button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function createConnectedStep(
  waypoint: DrawWaypoint,
  overlayPoint: CoursePoint,
  connected: ConnectCourseResult,
  loop: boolean,
): DrawStep {
  return {
    waypoint,
    overlayPoint,
    segmentIds: connected.segmentIds,
    routeCoordinates: connected.coordinates.map(toMapCoordinate),
    metrics: connected.cumulative,
    loop,
  }
}
