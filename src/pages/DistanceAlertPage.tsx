import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import { WalkStats } from '../Components/walk/WalkStats'
import '../styles/pages/journey-page.css'
import '../styles/pages/distance-alert-page.css'
import '../styles/components/walk-session-glass.css'

type DistanceAlertPageProps = {
  map?: BaseMapBinding
  onPause?: () => void
  onStop?: () => void
  onPhoto?: () => void
}

export function DistanceAlertPage({ map, onPause, onStop, onPhoto }: DistanceAlertPageProps) {
  return (
    <main className="journey-page distance-alert-page">
      <BaseMapViewport
        className="distance-alert-page__map"
        ariaLabel="주변 반려견 접근 알림 지도"
        map={map}
        fallback={{
          src: '/assets/s07/map.jpg',
          overlay: (
            <>
              <img className="distance-alert-page__route" src="/assets/s08/route-active.svg" alt="" />
              <img className="distance-alert-page__direction" src="/assets/s08/safe-direction.svg" alt="" />
              <img className="distance-alert-page__nearby" src="/assets/s08/marker-nearby-dog.svg" alt="" />
              <img className="distance-alert-page__current" src="/assets/s08/marker-current-location.svg" alt="" />
            </>
          ),
        }}
      />

      <section className="distance-alert-page__alert" aria-live="polite">
        <img src="/assets/mascot/states/04-distance-alert.png" alt="" />
        <div><h1>주변 접근 알림</h1><strong>화면 왼쪽 위 방향 50~100m</strong><p>가까워지고 있어요. 잠시 속도를 줄여주세요.</p></div>
      </section>

      <section className="distance-alert-page__sheet walk-session-glass">
        <WalkStats time="00:18:22" distance="1.3km" compact />
        <WalkSessionControls onPause={onPause} onStop={onStop} onPhoto={onPhoto} />
      </section>
    </main>
  )
}
