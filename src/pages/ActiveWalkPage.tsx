import { useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import type { MapCoordinate } from '../Components/map'
import { WalkRouteProgress } from '../Components/walk/WalkRouteProgress'
import { PresenceModeControl } from '../Components/walk/DistanceModeControl'
import { DistanceRangeControl } from '../Components/walk/DistanceRangeControl'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import { WalkStats } from '../Components/walk/WalkStats'
import { WalkEndDialog } from '../Components/system'
import type { GpsSignal } from '../features/walk-record/useWalkTracker'
import type { LockedWalkPresenceMode } from '../api/walks'
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
  presenceMode?: LockedWalkPresenceMode | null
  presenceEnabled?: boolean
  onPresenceEnabledChange?: (enabled: boolean) => void
  time?: string
  distance?: string
  distanceRadius?: number
  onDistanceRadiusChange?: (value: number) => void
  plannedRouteCoordinates?: MapCoordinate[]
  walkedCoordinates?: MapCoordinate[]
  gpsSignal?: GpsSignal
}

const gpsLabels: Record<GpsSignal, string> = {
  waiting: 'GPS 신호 확인 중',
  good: 'GPS 신호 좋음',
  weak: 'GPS 신호 약함',
  error: 'GPS 위치를 확인할 수 없음',
}

export function ActiveWalkPage({ map, onPause, onStop, onPhoto, distanceMode, onDistanceModeChange, presenceMode, presenceEnabled, onPresenceEnabledChange, time = '00:17:00', distance = '1.2km', distanceRadius = 100, onDistanceRadiusChange, plannedRouteCoordinates = [], walkedCoordinates = [], gpsSignal = 'waiting' }: ActiveWalkPageProps) {
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const resolvedMode = presenceMode === undefined ? 'distance' : presenceMode
  const resolvedEnabled = presenceEnabled ?? distanceMode ?? true
  const changePresence = onPresenceEnabledChange ?? onDistanceModeChange
  const routeOverlay = useMemo(() => ({ routes: [
    ...(plannedRouteCoordinates.length >= 2 ? [{ id: 'planned-course', coordinates: plannedRouteCoordinates, color: '#9f9c97', width: 7 }] : []),
    ...(walkedCoordinates.length >= 2 ? [{ id: 'walked-course', coordinates: walkedCoordinates, color: '#f47a3a', width: 6 }] : []),
  ] }), [plannedRouteCoordinates, walkedCoordinates])

  return (
    <main className="journey-page active-walk-page">
      <BaseMapViewport
        className="active-walk-page__map"
        ariaLabel="진행 중인 산책 경로 지도"
        map={map}
        sceneOverlay={routeOverlay}
        showLocationControl
        fallback={{ src: '/assets/s07/map.jpg', overlay: <><WalkRouteProgress planned={plannedRouteCoordinates} walked={walkedCoordinates} /><img className="active-walk-page__destination" src="/assets/s07/marker-destination.svg" alt="" /></> }}
      />
      <div className={`active-walk-page__gps active-walk-page__gps--${gpsSignal}`} role="status"><span>●</span> {gpsLabels[gpsSignal]}</div>
      <DraggableSheet className={`active-walk-page__sheet walk-session-glass${resolvedMode === 'distance' && resolvedEnabled ? ' active-walk-page__sheet--with-range' : ''}`}>
        <div className="active-walk-page__summary">
          <WalkStats time={time} distance={distance} />
          <PresenceModeControl mode={resolvedMode} enabled={resolvedEnabled} onChange={changePresence} />
        </div>
        {resolvedMode === 'distance' && resolvedEnabled && <DistanceRangeControl value={distanceRadius} onChange={onDistanceRadiusChange} />}
        <div className="active-walk-page__status-row">
          <h1>산책 중</h1>
        </div>
        <WalkSessionControls onPause={onPause} onStop={() => setIsEndDialogOpen(true)} onPhoto={onPhoto} />
      </DraggableSheet>
      {isEndDialogOpen && <WalkEndDialog onClose={() => setIsEndDialogOpen(false)} onConfirm={() => { setIsEndDialogOpen(false); onStop?.() }} />}
    </main>
  )
}
