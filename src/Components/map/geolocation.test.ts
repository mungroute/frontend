import { afterEach, describe, expect, it, vi } from 'vitest'
import { setDevLocationOverrideUser } from '../../utils/devLocationOverride'
import { requestBrowserLocation, watchBrowserLocation } from './geolocation'

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

  it('streams device GPS updates and clears the watcher', () => {
    let reportPosition: PositionCallback = () => undefined
    const clearWatch = vi.fn()
    const watchPosition = vi.fn((success: PositionCallback) => {
      reportPosition = success
      return 27
    })
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { watchPosition, clearWatch },
    })
    const onLocation = vi.fn()

    const stopWatching = watchBrowserLocation(onLocation)
    reportPosition({
      timestamp: Date.now(),
      coords: { latitude: 37.5661, longitude: 126.9823 },
    } as GeolocationPosition)

    expect(onLocation).toHaveBeenCalledWith({ latitude: 37.5661, longitude: 126.9823 })
    expect(watchPosition).toHaveBeenCalledWith(expect.any(Function), undefined, expect.objectContaining({ enableHighAccuracy: true }))
    stopWatching()
    expect(clearWatch).toHaveBeenCalledWith(27)
  })

  it('keeps development test accounts on their configured location without watching device GPS', () => {
    const watchPosition = vi.fn()
    vi.stubGlobal('navigator', { ...window.navigator, geolocation: { watchPosition } })
    setDevLocationOverrideUser('test2@naver.com')
    const onLocation = vi.fn()

    watchBrowserLocation(onLocation)

    expect(onLocation).toHaveBeenCalledWith({ latitude: 37.56457, longitude: 126.98693 })
    expect(watchPosition).not.toHaveBeenCalled()
  })
})
