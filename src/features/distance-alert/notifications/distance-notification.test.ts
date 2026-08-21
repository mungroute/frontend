import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NearbyPresence } from '../../../api/walks'
import { distanceNotificationBody } from '../distance-alert-format'
import { DISTANCE_NOTIFICATION_TAG, shouldNotifyDistanceTransition, showDistanceSystemNotification } from './distance-notification'

const approaching: NearbyPresence = {
  distanceBand: 'BAND_50_100',
  directionOctant: 2,
  directionSpread: 45,
  directionReference: 'HEADING',
  trend: 'APPROACHING',
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('distance system notification transitions', () => {
  it('formats only anonymous approximate direction, distance and trend', () => {
    expect(distanceNotificationBody(approaching)).toBe('오른쪽 · 약 50~100m · 접근 중')
    expect(distanceNotificationBody({ ...approaching, additionalCount: 7 }))
      .toBe('오른쪽 · 약 50~100m · 접근 중 · 주변 7명 추가')
  })

  it('deduplicates repeated location updates but allows meaningful state changes', () => {
    expect(shouldNotifyDistanceTransition(undefined, approaching)).toBe(true)
    expect(shouldNotifyDistanceTransition(approaching, { ...approaching })).toBe(false)
    expect(shouldNotifyDistanceTransition(approaching, { ...approaching, distanceBand: 'BAND_30_50' })).toBe(true)
    expect(shouldNotifyDistanceTransition(approaching, { ...approaching, trend: 'LEAVING' })).toBe(true)
  })

  it('does not notify for a steady initial update', () => {
    expect(shouldNotifyDistanceTransition(undefined, { ...approaching, trend: 'STEADY' })).toBe(false)
  })

  it('uses the existing service worker and a replacement tag', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Notification', { permission: 'granted' })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration: vi.fn().mockResolvedValue({ showNotification }) },
    })

    await expect(showDistanceSystemNotification(approaching)).resolves.toBe(true)
    expect(showNotification).toHaveBeenCalledWith('거리두기 알림', expect.objectContaining({
      body: '오른쪽 · 약 50~100m · 접근 중',
      tag: DISTANCE_NOTIFICATION_TAG,
    }))
  })
})
