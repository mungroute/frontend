import { afterEach, describe, expect, it, vi } from 'vitest'
import { setDevLocationOverrideUser } from '../../utils/devLocationOverride'
import { requestBrowserLocation } from './geolocation'

describe('requestBrowserLocation', () => {
  afterEach(() => {
    setDevLocationOverrideUser(undefined)
    vi.unstubAllGlobals()
  })

  it('uses the development account location without requesting device GPS', async () => {
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', { ...window.navigator, geolocation: { getCurrentPosition } })
    setDevLocationOverrideUser('test@naver.com')

    await expect(requestBrowserLocation()).resolves.toEqual({
      latitude: 37.565825,
      longitude: 126.9874593,
    })
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('does not let a late device GPS response replace an authenticated test location', async () => {
    let reportPosition: PositionCallback = () => undefined
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => { reportPosition = success },
      },
    })

    const pendingLocation = requestBrowserLocation()
    setDevLocationOverrideUser('test@naver.com')
    reportPosition({
      timestamp: Date.now(),
      coords: { latitude: 37.485, longitude: 126.895, accuracy: 5 },
    } as GeolocationPosition)

    await expect(pendingLocation).resolves.toEqual({ latitude: 37.565825, longitude: 126.9874593 })
  })
})
