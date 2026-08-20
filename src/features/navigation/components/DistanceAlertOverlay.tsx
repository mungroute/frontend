import type { NearbyPresence } from '../../../api/walks'

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

const directionLabel = (alert: NearbyPresence) => {
  if (alert.directionOctant === null) return '바로 가까운 곳'
  const labels = alert.directionReference === 'HEADING' ? headingDirections : mapDirections
  return labels[alert.directionOctant] ?? '주변'
}

const defaultAlert: NearbyPresence = {
  distanceBand: 'BAND_50_100',
  directionOctant: 7,
  directionSpread: 45,
  directionReference: 'MAP',
  trend: 'APPROACHING',
}

export function DistanceAlertOverlay({ alert = defaultAlert }: { alert?: NearbyPresence }) {
  return (
    <section className="navigation-distance-alert" aria-live="polite">
      <img src="/assets/mascot/states/04-distance-alert.png" alt="" />
      <div>
        <h1>주변 접근 알림</h1>
        <strong>{directionLabel(alert)} · {distanceLabels[alert.distanceBand]}</strong>
        <p>{trendLabels[alert.trend]}</p>
      </div>
    </section>
  )
}

