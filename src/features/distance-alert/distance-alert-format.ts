import type { NearbyPresence } from '../../api/walks'

export const distanceBandLabels: Record<NearbyPresence['distanceBand'], string> = {
  VERY_CLOSE: '약 30m 이내',
  BAND_30_50: '약 30~50m',
  BAND_50_100: '약 50~100m',
  BAND_100_500: '약 100~500m',
}

const headingDirections = ['앞쪽', '오른쪽 앞', '오른쪽', '오른쪽 뒤', '뒤쪽', '왼쪽 뒤', '왼쪽', '왼쪽 앞']
const mapDirections = ['지도 위쪽', '지도 오른쪽 위', '지도 오른쪽', '지도 오른쪽 아래', '지도 아래쪽', '지도 왼쪽 아래', '지도 왼쪽', '지도 왼쪽 위']

export const distanceTrendLabels: Record<NearbyPresence['trend'], string> = {
  NEW: '새로 감지',
  APPROACHING: '접근 중',
  STEADY: '거리 유지 중',
  LEAVING: '멀어지는 중',
}

export const distanceTrendDescriptions: Record<NearbyPresence['trend'], string> = {
  NEW: '주변에서 새로 감지됐어요.',
  APPROACHING: '가까워지고 있어요. 잠시 속도를 줄여주세요.',
  STEADY: '비슷한 거리를 유지하고 있어요.',
  LEAVING: '점점 멀어지고 있어요.',
}

export function distanceDirectionLabel(alert: NearbyPresence) {
  if (alert.directionOctant === null) return '바로 가까운 곳'
  const labels = alert.directionReference === 'HEADING' ? headingDirections : mapDirections
  return labels[alert.directionOctant] ?? '주변'
}

export function distanceNotificationBody(alert: NearbyPresence) {
  return `${distanceDirectionLabel(alert)} · ${distanceBandLabels[alert.distanceBand]} · ${distanceTrendLabels[alert.trend]}`
}

export function distanceAlertEventKey(alert: NearbyPresence) {
  return [
    alert.distanceBand,
    alert.directionReference ?? 'NONE',
    alert.directionOctant ?? 'NONE',
    alert.trend,
  ].join(':')
}
