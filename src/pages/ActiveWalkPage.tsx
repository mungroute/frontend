import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DistanceModeControl } from '../Components/walk/DistanceModeControl'
import { DistanceRangeControl } from '../Components/walk/DistanceRangeControl'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import { WalkStats } from '../Components/walk/WalkStats'
import { WalkEndDialog } from '../Components/system'
import { DraggableSheet } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/active-walk-page.css'
import '../styles/components/walk-session-glass.css'

type ActiveWalkPageProps = {
  map?: BaseMapBinding
  onPause?: () => void
  onStop?: () => void
  onPhoto?: () => void
  distanceMode?: boolean
  onDistanceModeChange?: (checked: boolean) => void
  time?: string
  distance?: string
  distanceRadius?: number
  onDistanceRadiusChange?: (value: number) => void
}

export function ActiveWalkPage({ map, onPause, onStop, onPhoto, distanceMode, onDistanceModeChange, time = '00:17:00', distance = '1.2km', distanceRadius = 100, onDistanceRadiusChange }: ActiveWalkPageProps) {
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)

  return (
    <main className="journey-page active-walk-page">
      <BaseMapViewport
        className="active-walk-page__map"
        ariaLabel="진행 중인 산책 경로 지도"
        map={map}
        showLocationControl
        fallback={{ src: '/assets/s07/map.jpg', overlay: <img className="active-walk-page__destination" src="/assets/s07/marker-destination.svg" alt="" /> }}
      />
      <div className="active-walk-page__gps" role="status"><span>●</span> GPS 신호 좋음</div>
      <DraggableSheet className={`active-walk-page__sheet walk-session-glass${distanceMode !== false ? ' active-walk-page__sheet--with-range' : ''}`}>
        <div className="active-walk-page__summary">
          <WalkStats time={time} distance={distance} />
          <DistanceModeControl checked={distanceMode} onChange={onDistanceModeChange} />
        </div>
        {distanceMode !== false && <DistanceRangeControl value={distanceRadius} onChange={onDistanceRadiusChange} />}
        <div className="active-walk-page__status-row">
          <h1>산책 중</h1>
        </div>
        <WalkSessionControls onPause={onPause} onStop={() => setIsEndDialogOpen(true)} onPhoto={onPhoto} />
      </DraggableSheet>
      {isEndDialogOpen && <WalkEndDialog onClose={() => setIsEndDialogOpen(false)} onConfirm={() => { setIsEndDialogOpen(false); onStop?.() }} />}
    </main>
  )
}
