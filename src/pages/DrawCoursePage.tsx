import { useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding, MapClickEvent, MapCoordinate } from '../Components/map'
import { EditableCourseOverlay } from '../Components/courses/CourseVisuals'
import { drawnCourseSummary } from '../Components/courses/course-data'
import type { CoursePoint } from '../Components/courses/course-data'
import { Button, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

type DrawCoursePageProps = {
  map?: BaseMapBinding
  onBack?: () => void
  onSave?: (course: { pointCount: number; distanceKm: number; durationMinutes: number }) => void
}

const MAX_COURSE_POINTS = 20
const MIN_COURSE_POINTS = 2

export function DrawCoursePage({ map, onBack, onSave }: DrawCoursePageProps) {
  const [points, setPoints] = useState<CoursePoint[]>([])
  const [coordinates, setCoordinates] = useState<MapCoordinate[]>([])

  const addPoint = ({ coordinate, xPercent, yPercent }: MapClickEvent) => {
    if (points.length >= MAX_COURSE_POINTS) return
    setPoints((current) => [...current, { x: xPercent, y: yPercent }])
    setCoordinates((current) => [...current, coordinate])
  }

  const removeLastPoint = () => {
    setPoints((current) => current.slice(0, -1))
    setCoordinates((current) => current.slice(0, -1))
  }

  const sceneOverlay = useMemo(() => ({
    routes: coordinates.length > 1 ? [{ id: 'drawn-course', coordinates, color: '#ff7139', width: 6 }] : [],
    markers: coordinates.map((position, index) => ({
      id: `drawn-course-point-${index}`,
      position,
      kind: index === 0 ? 'start' as const : index === coordinates.length - 1 ? 'finish' as const : 'default' as const,
    })),
  }), [coordinates])

  const isAtLimit = points.length >= MAX_COURSE_POINTS

  return (
    <main className="journey-page extended-management-page draw-course-page">
      <ManagementPageHeader title="직접 코스 그리기" subtitle="지도를 움직인 뒤 길을 짧게 탭해 이어보세요" onBack={onBack} />
      <BaseMapViewport
        className="draw-course-page__map"
        ariaLabel="직접 코스 편집 지도"
        map={map}
        fallback={{ src: '/assets/s09/map.jpg' }}
        sceneOverlay={sceneOverlay}
        onMapClick={addPoint}
      >
        <EditableCourseOverlay points={points} />
        <button className="draw-course-page__undo" type="button" disabled={!points.length} onClick={removeLastPoint}>
          마지막 지점 취소
        </button>
      </BaseMapViewport>
      <p className={isAtLimit ? 'draw-course-page__tip draw-course-page__tip--limit' : 'draw-course-page__tip'} role="status">
        {isAtLimit ? (
          <strong>최대 20개 지점까지 추가할 수 있어요.</strong>
        ) : (
          <><strong>1. 지도를 드래그로 이동</strong><span>2. 원하는 길을 짧게 탭해 연결</span></>
        )}
      </p>
      <div className="draw-course-page__summary" aria-label="직접 그린 코스 정보">
        <strong>{drawnCourseSummary.distanceKm}km</strong><strong>예상 {drawnCourseSummary.durationMinutes}분</strong><span>{points.length}/{MAX_COURSE_POINTS}개 지점</span>
      </div>
      <Button
        className="draw-course-page__save"
        disabled={points.length < MIN_COURSE_POINTS}
        onClick={() => onSave?.({ pointCount: points.length, ...drawnCourseSummary })}
      >
        {points.length < MIN_COURSE_POINTS ? '지점을 2개 이상 추가해 주세요' : '코스로 저장하기'}
      </Button>
    </main>
  )
}
