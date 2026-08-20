import { afterEach, describe, expect, it } from 'vitest'
import {
  DEV_TEST_ACCOUNT_LOCATIONS,
  getDevLocationOverride,
  setDevLocationOverrideUser,
} from './devLocationOverride'

describe('development account location overrides', () => {
  afterEach(() => setDevLocationOverrideUser(undefined))

  it('places the distance-mode test accounts 70m to 100m apart around the Euljiro corner', () => {
    setDevLocationOverrideUser(' TEST@NAVER.COM ')
    expect(getDevLocationOverride()).toEqual(DEV_TEST_ACCOUNT_LOCATIONS['test@naver.com'])

    setDevLocationOverrideUser('test1@naver.com')
    expect(getDevLocationOverride()).toEqual(DEV_TEST_ACCOUNT_LOCATIONS['test1@naver.com'])

    const first = DEV_TEST_ACCOUNT_LOCATIONS['test@naver.com']
    const second = DEV_TEST_ACCOUNT_LOCATIONS['test1@naver.com']
    const latitudeMeters = (second.latitude - first.latitude) * 111_320
    const longitudeMeters = (second.longitude - first.longitude)
      * 111_320
      * Math.cos(first.latitude * Math.PI / 180)
    const distanceMeters = Math.hypot(latitudeMeters, longitudeMeters)

    expect(distanceMeters).toBeGreaterThanOrEqual(70)
    expect(distanceMeters).toBeLessThanOrEqual(100)
  })

  it('does not override ordinary accounts', () => {
    setDevLocationOverrideUser('someone@example.com')
    expect(getDevLocationOverride()).toBeUndefined()
  })

  it('places test2 on the requested roadside pedestrian coordinate', () => {
    setDevLocationOverrideUser('test2@naver.com')
    expect(getDevLocationOverride()).toEqual({ latitude: 37.56457, longitude: 126.98693 })
  })
})
