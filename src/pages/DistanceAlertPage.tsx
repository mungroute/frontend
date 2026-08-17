import type React from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { PresenceModeControl } from '../Components/walk/DistanceModeControl'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import { WalkStats } from '../Components/walk/WalkStats'
import { DraggableSheet } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/distance-alert-page.css'
import '../styles/components/walk-session-glass.css'
import type { NearbyPresence } from '../api/walks'

type DistanceAlertPageProps = {
  map?: BaseMapBinding
  onPause?: () => void
  onStop?: () => void
  onPhoto?: () => void
  distanceMode?: boolean
  onDistanceModeChange?: (checked: boolean) => void
  time?: string
  distance?: string
  alert?: NearbyPresence
}

const distanceLabels: Record<NearbyPresence['distanceBand'], string> = {
  VERY_CLOSE: '30m 안쪽 아주 가까운 곳',
  BAND_30_50: '30~50m',
  BAND_50_100: '50~100m',
  BAND_100_500: '100m 이상',
}

const headingDirections = ['앞쪽', '오른쪽 앞', '오른쪽', '오른쪽 뒤', '뒤쪽', '왼쪽 뒤', '왼쪽', '왼쪽 앞']
const mapDirections = ['지도 위쪽', '지도 오른쪽 위', '지도 오른쪽', '지도 오른쪽 아래', '지도 아래쪽', '지도 왼쪽 아래', '지도 왼쪽', '지도 왼쪽 위']
const trendLabels: Record<NearbyPresence['trend'], string> = {
  NEW: '주변에서 새로 감지됐어요.',
  APPROACHING: '가까워지고 있어요. 잠시 속도를 줄여주세요.',
  STEADY: '비슷한 거리를 유지하고 있어요.',
  LEAVING: '점점 멀어지고 있어요.',
}

const directionLabel = (alert?: NearbyPresence) => {
  if (!alert || alert.directionOctant === null) return '바로 가까운 곳'
  const labels = alert.directionReference === 'HEADING' ? headingDirections : mapDirections
  return labels[alert.directionOctant] ?? '주변'
}

export function DistanceAlertPage({ map, onPause, onStop, onPhoto, distanceMode, onDistanceModeChange, time = '00:18:22', distance = '1.3km', alert }: DistanceAlertPageProps) {
  const resolvedAlert = alert ?? {
    distanceBand: 'BAND_50_100' as const,
    directionOctant: 7,
    directionSpread: 45,
    directionReference: 'MAP' as const,
    trend: 'APPROACHING' as const,
  }
  return (
    <main className="journey-page distance-alert-page">
      <BaseMapViewport
        className="distance-alert-page__map"
        ariaLabel="주변 반려견 접근 알림 지도"
        map={map}
        showLocationControl
        fallback={{
          src: '/assets/s07/map.jpg',
          overlay: (
            <img className="distance-alert-page__current" src="/assets/s08/marker-current-location.svg" alt="" />
          ),
        }}
      >
        <div
          className={`distance-alert-page__sector distance-alert-page__sector--${resolvedAlert.directionSpread ?? 'near'}`}
          style={{ '--presence-direction': `${(resolvedAlert.directionOctant ?? 0) * 45}deg` } as React.CSSProperties}
          aria-hidden="true"
        ><span /></div>
      </BaseMapViewport>

      <section className="distance-alert-page__alert" aria-live="polite">
        <img src="/assets/mascot/states/04-distance-alert.png" alt="" />
        <div><h1>주변 접근 알림</h1><strong>{directionLabel(resolvedAlert)} · {distanceLabels[resolvedAlert.distanceBand]}</strong><p>{trendLabels[resolvedAlert.trend]}</p></div>
      </section>

      <DraggableSheet className="distance-alert-page__sheet walk-session-glass">
        <div className="distance-alert-page__summary">
          <WalkStats time={time} distance={distance} compact />
          <PresenceModeControl mode="distance" enabled={distanceMode} onChange={onDistanceModeChange} />
        </div>
        <WalkSessionControls onPause={onPause} onStop={onStop} onPhoto={onPhoto} />
      </DraggableSheet>
    </main>
  )
}
