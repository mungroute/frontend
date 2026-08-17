import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DraggableSheet, HomeBottomNavigation, HomeWalkStartAction } from '../Components/ui'
import type { CourseDetail } from '../api/courses'
import '../styles/pages/representative-home-page.css'

type RepresentativeHomePageProps = {
  onStartWalk?: () => void
  onCompareCourse?: () => void
  onRecommendCourse?: () => void
  onOpenCourse?: () => void
  course?: CourseDetail
  map?: BaseMapBinding
}

const asset = (name: string) => `/assets/s01/${name}`

export function RepresentativeHomePage({ onStartWalk = () => undefined, onCompareCourse = () => undefined, onRecommendCourse = () => undefined, onOpenCourse = () => undefined, course, map }: RepresentativeHomePageProps) {
  const [distanceMode, setDistanceMode] = useState(true)

  return (
    <main className="representative-home-page">
      <BaseMapViewport
        className="representative-home-page__map"
        ariaLabel="저녁 남산길 지도"
        map={map}
        showLocationControl
        fallback={{ src: asset('map-representative-route.png') }}
      >
        <img className="representative-home-page__logo" src="/assets/brand/logo-horizontal@2x.png" alt="멍루트" />
        <img className="representative-home-page__profile" src={asset('profile-circle.svg')} alt="" />
      </BaseMapViewport>

      <DraggableSheet className="representative-home-page__sheet" aria-label="대표 산책 코스">
        <button className="representative-home-page__course-card" type="button" onClick={onOpenCourse}>
          <span className="representative-home-page__course-copy">
            <h1>{course?.courseName ?? '대표 코스를 선택해 주세요'}</h1>
            <span className="representative-home-page__course-meta">
              {course?.metrics ? `${course.metrics.durationMin}분 · ${(course.metrics.lengthM / 1000).toFixed(2)}km` : '내 코스에서 대표 코스를 지정할 수 있어요'}
            </span>
            {course?.metrics?.shadeApplicable && <span className="representative-home-page__shade-chip">그늘 {Math.round((course.metrics.shadeRatio ?? 0) * 100)}%</span>}
            {course?.metrics && !course.metrics.shadeApplicable && <span className="representative-home-page__shade-chip">야간 그늘 미산출</span>}
          </span>
          <span className="representative-home-page__chevron" aria-hidden="true">›</span>
        </button>

        <div className="representative-home-page__actions">
          <HomeWalkStartAction className="representative-home-page__start" onClick={onStartWalk} />
          <button type="button" onClick={onCompareCourse}>오늘의 추천 대안 보기</button>
          <button type="button" onClick={onRecommendCourse}>새 코스 추천받기</button>
        </div>
        <button
          className="representative-home-page__switch"
          type="button"
          role="switch"
          aria-label="거리두기 모드"
          aria-checked={distanceMode}
          onClick={() => setDistanceMode((current) => !current)}
        ><span className="representative-home-page__mode-copy"><span>거리두기 모드</span><small>산책을 시작하면 작동해요</small></span><img src={asset('toggle-thumb.svg')} alt="" /></button>
      </DraggableSheet>

      <HomeBottomNavigation />
    </main>
  )
}
