import { useState } from 'react'
import type { MouseEvent } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { EditableCourseOverlay } from '../Components/courses/CourseVisuals'
import { drawnCourseSummary } from '../Components/courses/course-data'
import type { CoursePoint } from '../Components/courses/course-data'
import { Button, ManagementPageHeader } from '../Components/ui'
import { clamp } from '../utils/number'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

type DrawCoursePageProps = {
  map?: BaseMapBinding
  onBack?: () => void
  onSave?: (course: { pointCount: number; distanceKm: number; durationMinutes: number }) => void
}

export function DrawCoursePage({ map, onBack, onSave }: DrawCoursePageProps) {
  const [points, setPoints] = useState<CoursePoint[]>([])

  const addPoint = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const keyboardActivated = event.detail === 0
    const x = keyboardActivated || !rect.width ? 50 : ((event.clientX - rect.left) / rect.width) * 100
    const y = keyboardActivated || !rect.height ? 50 : ((event.clientY - rect.top) / rect.height) * 100
    setPoints((current) => [...current, { x: clamp(x, 3, 97), y: clamp(y, 3, 97) }])
  }

  return (
    <main className="journey-page extended-management-page draw-course-page">
      <ManagementPageHeader title="직접 코스 그리기" subtitle="지도를 눌러 원하는 길을 이어보세요" onBack={onBack} />
      <BaseMapViewport className="draw-course-page__map" ariaLabel="직접 코스 편집 지도" map={map} fallback={{ src: '/assets/s09/map.jpg' }}>
        <button className="draw-course-page__map-target" type="button" aria-label="지도에 지점 추가" onClick={addPoint} />
        <EditableCourseOverlay points={points} />
      </BaseMapViewport>
      <p className="draw-course-page__tip">지도를 눌러 지점을 추가할 수 있어요.</p>
      <div className="draw-course-page__summary" aria-label="직접 그린 코스 정보">
        <strong>{drawnCourseSummary.distanceKm}km</strong><strong>예상 {drawnCourseSummary.durationMinutes}분</strong><span>{points.length}개 지점</span>
      </div>
      <Button className="draw-course-page__save" onClick={() => onSave?.({ pointCount: points.length, ...drawnCourseSummary })}>코스로 저장하기</Button>
    </main>
  )
}
