import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { Switch } from '../Components/ui'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import { WalkStats } from '../Components/walk/WalkStats'
import { WalkEndDialog } from '../Components/system'
import '../styles/pages/journey-page.css'
import '../styles/pages/active-walk-page.css'
import '../styles/components/walk-session-glass.css'

type ActiveWalkPageProps = {
  map?: BaseMapBinding
  onPause?: () => void
  onStop?: () => void
  onPhoto?: () => void
  onDistanceModeChange?: (checked: boolean) => void
}

export function ActiveWalkPage({ map, onPause, onStop, onPhoto, onDistanceModeChange }: ActiveWalkPageProps) {
  const [distanceMode, setDistanceMode] = useState(true)
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const updateDistanceMode = (checked: boolean) => { setDistanceMode(checked); onDistanceModeChange?.(checked) }

  return (
    <main className="journey-page active-walk-page">
      <BaseMapViewport
        className="active-walk-page__map"
        ariaLabel="진행 중인 산책 경로 지도"
        map={map}
        fallback={{ src: '/assets/s07/map.jpg', overlay: <><img className="active-walk-page__route" src="/assets/s07/route-active.svg" alt="" /><img className="active-walk-page__destination" src="/assets/s07/marker-destination.svg" alt="" /></> }}
      />
      <div className="active-walk-page__gps" role="status"><span>●</span> GPS 신호 좋음</div>
      <section className="active-walk-page__sheet walk-session-glass">
        <div className="active-walk-page__handle" aria-hidden="true" />
        <div className="active-walk-page__summary">
          <WalkStats time="00:17:00" distance="1.2km" />
          <Switch checked={distanceMode} onChange={updateDistanceMode} label="거리두기" />
        </div>
        <div className="active-walk-page__status-row">
          <h1>산책 중</h1>
        </div>
        <WalkSessionControls onPause={onPause} onStop={() => setIsEndDialogOpen(true)} onPhoto={onPhoto} />
      </section>
      {isEndDialogOpen && <WalkEndDialog onClose={() => setIsEndDialogOpen(false)} onConfirm={() => { setIsEndDialogOpen(false); onStop?.() }} />}
    </main>
  )
}
