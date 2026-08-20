import type { NearbyPresence } from '../../../api/walks'
import { distanceNotificationBody } from '../distance-alert-format'
import { getExternalNotificationPermission } from './notification-permission'

export const DISTANCE_NOTIFICATION_TAG = 'mungroute-distance-alert'

const bandSeverity: Record<NearbyPresence['distanceBand'], number> = {
  BAND_100_500: 0,
  BAND_50_100: 1,
  BAND_30_50: 2,
  VERY_CLOSE: 3,
}

export function distanceNotificationKey(alert: NearbyPresence) {
  return `${alert.distanceBand}:${alert.trend}`
}

export function shouldNotifyDistanceTransition(previous: NearbyPresence | undefined, current: NearbyPresence) {
  if (previous && distanceNotificationKey(previous) === distanceNotificationKey(current)) return false
  if (current.trend === 'NEW' || current.trend === 'APPROACHING' || current.trend === 'LEAVING') return true
  return Boolean(previous && bandSeverity[current.distanceBand] > bandSeverity[previous.distanceBand])
}

export async function showDistanceSystemNotification(alert: NearbyPresence) {
  if (getExternalNotificationPermission() !== 'granted') return false
  const options: NotificationOptions = {
    body: distanceNotificationBody(alert),
    tag: DISTANCE_NOTIFICATION_TAG,
    icon: '/assets/icons/mungroute-dog-wordmark-pwa-192.png',
    badge: '/assets/icons/mungroute-dog-wordmark-pwa-192.png',
    data: { url: '/walk/distance-alert' },
  }
  const registration = 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistration()
    : undefined
  if (registration) {
    await registration.showNotification('거리두기 알림', options)
  } else {
    new Notification('거리두기 알림', options)
  }
  return true
}
