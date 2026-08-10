import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DistanceModeControl } from '../Components/walk/DistanceModeControl'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import '../styles/pages/journey-page.css'
import '../styles/components/walk-session-glass.css'
import '../styles/pages/paused-walk-page.css'

type PausedWalkPageProps = {
  map?: BaseMapBinding
  dogName?: string
  onResume?: () => void
  onStop?: () => void
  onPhoto?: () => void
  distanceMode?: boolean
  onDistanceModeChange?: (checked: boolean) => void
}

export function PausedWalkPage({ map, dogName = '망고', onResume, onStop, onPhoto, distanceMode, onDistanceModeChange }: PausedWalkPageProps) {
  return (
    <main className="journey-page paused-walk-page">
      <BaseMapViewport
        className="paused-walk-page__map"
        ariaLabel="일시정지된 산책 경로 지도"
        map={map}
        fallback={{
          src: '/assets/s07/map.jpg',
          overlay: <img className="paused-walk-page__route" src="/assets/st02/route-paused.svg" alt="" />,
        }}
      />

      <img className="paused-walk-page__waiting" src="/assets/mascot/animated/05-pause-wait.gif" alt="산책 재개를 기다리는 강아지" />

      <section className="paused-walk-page__sheet walk-session-glass" aria-labelledby="paused-walk-title">
        <div className="paused-walk-page__handle" aria-hidden="true" />
        <h1 id="paused-walk-title">산책을 잠시 멈췄어요</h1>
        <p>{dogName}가 기다리는 동안 GPS 기록도 일시정지돼요.</p>

        <div className="paused-walk-page__summary">
          <dl className="paused-walk-page__stats">
            <div>
              <dt>현재 시간</dt>
              <dd>00:17:00</dd>
            </div>
            <div>
              <dt>현재 거리</dt>
              <dd>1.2km</dd>
            </div>
          </dl>
          <DistanceModeControl checked={distanceMode} onChange={onDistanceModeChange} />
        </div>

        <WalkSessionControls mode="paused" onResume={onResume} onStop={onStop} onPhoto={onPhoto} />
      </section>
    </main>
  )
}
