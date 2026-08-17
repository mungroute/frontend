import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { HomeBottomNavigation, HomeWalkStartAction } from '../Components/ui'
import '../styles/pages/no-course-home-page.css'

type NoCourseHomePageProps = {
  onStartWalk?: () => void
  onDrawCourse?: () => void
  onRecommendCourse?: () => void
  map?: BaseMapBinding
}

export function NoCourseHomePage({ onStartWalk = () => undefined, onDrawCourse = () => undefined, onRecommendCourse = () => undefined, map }: NoCourseHomePageProps) {
  return (
    <main className="no-course-home-page">
      <BaseMapViewport
        className="no-course-home-page__map"
        ariaLabel="현재 위치 지도"
        map={map}
        showLocationControl
        fallback={{
          src: '/assets/s02/map-current-location.png',
          overlay: <img className="no-course-home-page__current-location" src="/assets/s02/marker-current-location.svg" alt="현재 위치" />,
          hideOverlayWhenReady: true,
        }}
      >
        <img className="no-course-home-page__logo" src="/assets/brand/logo-horizontal@2x.png" alt="멍루트" />
        <img className="no-course-home-page__profile" src="/assets/s01/profile-circle.svg" alt="" />
      </BaseMapViewport>

      <HomeWalkStartAction className="no-course-home-page__start" onClick={onStartWalk} />
      <div className="no-course-home-page__course-actions" aria-label="코스 선택">
        <button type="button" onClick={onDrawCourse}><strong>지도에서 코스 그리기</strong><span>내가 원하는 길을 직접 만들어요</span></button>
        <button type="button" onClick={onRecommendCourse}><strong>시간 맞춤 코스 추천받기</strong><span>원하는 시간에 맞는 새 코스</span></button>
      </div>
      <HomeBottomNavigation />
    </main>
  )
}
