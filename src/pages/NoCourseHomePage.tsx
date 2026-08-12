import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { HomeBottomNavigation, HomeWalkStartAction } from '../Components/ui'
import '../styles/pages/no-course-home-page.css'

type NoCourseHomePageProps = {
  onStartWalk?: () => void
  map?: BaseMapBinding
}

export function NoCourseHomePage({ onStartWalk = () => undefined, map }: NoCourseHomePageProps) {
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
        }}
      >
        <img className="no-course-home-page__logo" src="/assets/brand/logo-horizontal@2x.png" alt="멍루트" />
        <img className="no-course-home-page__profile" src="/assets/s01/profile-circle.svg" alt="" />
      </BaseMapViewport>

      <HomeWalkStartAction className="no-course-home-page__start" onClick={onStartWalk} />
      <HomeBottomNavigation />
    </main>
  )
}
