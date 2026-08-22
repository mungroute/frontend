import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { distanceBetween, formatWalkDistance, formatWalkTime, useWalkTracker } from './useWalkTracker'
import { setDevLocationOverrideUser } from '../../utils/devLocationOverride'

describe('walk tracker calculations', () => {
  afterEach(() => {
    setDevLocationOverrideUser(undefined)
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('formats elapsed time and accumulated distance for the walk UI', () => {
    expect(formatWalkTime(3_661)).toBe('01:01:01')
    expect(formatWalkDistance(1_234)).toBe('1.23km')
  })

  it('calculates distance between GPS coordinates', () => {
    const meters = distanceBetween(
      { latitude: 37.5665, longitude: 126.978 },
      { latitude: 37.5675, longitude: 126.978 },
    )

    expect(meters).toBeGreaterThan(110)
    expect(meters).toBeLessThan(112)
  })

  it('updates time and distance from live browser GPS while tracking', () => {
    vi.useFakeTimers()
    const clearWatch = vi.fn()
    let reportPosition: PositionCallback = () => undefined
    const watchPosition = vi.fn((success: PositionCallback) => {
      reportPosition = success
      return 7
    })
    vi.stubGlobal('navigator', { ...window.navigator, geolocation: { watchPosition, clearWatch } })
    const { result, unmount } = renderHook(() => useWalkTracker(true))

    act(() => vi.advanceTimersByTime(2_000))
    expect(result.current.formattedTime).toBe('00:00:02')

    act(() => {
      reportPosition({
        timestamp: 1_000,
        coords: { latitude: 37.5665, longitude: 126.978, accuracy: 6 },
      } as GeolocationPosition)
      reportPosition({
        timestamp: 6_000,
        coords: { latitude: 37.5666, longitude: 126.978, accuracy: 6 },
      } as GeolocationPosition)
    })
    expect(result.current.formattedDistance).toBe('0.01km')
    expect(result.current.walkedCoordinates).toEqual([
      { latitude: 37.5665, longitude: 126.978 },
      { latitude: 37.5666, longitude: 126.978 },
    ])
    expect(result.current.currentPosition).toEqual({
      coordinate: { latitude: 37.5666, longitude: 126.978 },
      accuracy: 6,
      observedAt: 6_000,
      heading: null,
      speed: null,
    })

    unmount()
    expect(clearWatch).toHaveBeenCalledWith(7)
  })

  it('updates the navigation camera fix and heading before movement is large enough to record', () => {
    vi.useFakeTimers()
    let reportPosition: PositionCallback = () => undefined
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        watchPosition: (success: PositionCallback) => { reportPosition = success; return 19 },
        clearWatch: vi.fn(),
      },
    })
    const { result, unmount } = renderHook(() => useWalkTracker(true))

    act(() => {
      reportPosition({
        timestamp: 1_000,
        coords: { latitude: 37.5665, longitude: 126.978, accuracy: 5, heading: 0, speed: 1 },
      } as GeolocationPosition)
      reportPosition({
        timestamp: 2_000,
        coords: { latitude: 37.5665, longitude: 126.97801, accuracy: 5, heading: 90, speed: 1 },
      } as GeolocationPosition)
    })

    expect(result.current.walkedCoordinates).toHaveLength(1)
    expect(result.current.currentPosition).toEqual(expect.objectContaining({
      coordinate: { latitude: 37.5665, longitude: 126.97801 },
      heading: 90,
      observedAt: 2_000,
    }))
    unmount()
  })

  it('restores server elapsed time and distance after a page refresh', () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { watchPosition: vi.fn(() => 18), clearWatch: vi.fn() },
    })
    const { result, unmount } = renderHook(() => useWalkTracker(true))

    act(() => vi.advanceTimersByTime(2_000))
    expect(result.current.formattedTime).toBe('00:00:02')

    act(() => result.current.restore({ elapsedSeconds: 367, distanceMeters: 1_234 }))
    expect(result.current.formattedTime).toBe('00:06:07')
    expect(result.current.formattedDistance).toBe('1.23km')

    act(() => vi.advanceTimersByTime(1_000))
    expect(result.current.formattedTime).toBe('00:06:08')
    unmount()
  })

  it('does not record or send an inaccurate GPS fix', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T05:00:00.000Z'))
    let reportPosition: PositionCallback = () => undefined
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        watchPosition: (success: PositionCallback) => { reportPosition = success; return 8 },
        clearWatch: vi.fn(),
      },
    })
    const onPoint = vi.fn()
    const { unmount } = renderHook(() => useWalkTracker(true, onPoint))

    act(() => reportPosition({
      timestamp: Date.now() - 60_000,
      coords: { latitude: 37.5665, longitude: 126.978, accuracy: Number.NaN },
    } as GeolocationPosition))

    expect(onPoint).not.toHaveBeenCalled()
    unmount()
  })

  it('rejects a sudden GPS jump from the route and distance', () => {
    vi.useFakeTimers()
    let reportPosition: PositionCallback = () => undefined
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        watchPosition: (success: PositionCallback) => { reportPosition = success; return 9 },
        clearWatch: vi.fn(),
      },
    })
    const onPoint = vi.fn()
    const { result, unmount } = renderHook(() => useWalkTracker(true, onPoint))

    act(() => {
      reportPosition({
        timestamp: 1_000,
        coords: { latitude: 37.5665, longitude: 126.978, accuracy: 5 },
      } as GeolocationPosition)
      reportPosition({
        timestamp: 2_000,
        coords: { latitude: 37.567, longitude: 126.978, accuracy: 5 },
      } as GeolocationPosition)
    })

    expect(result.current.formattedDistance).toBe('0.00km')
    expect(result.current.walkedCoordinates).toEqual([
      { latitude: 37.5665, longitude: 126.978 },
    ])
    expect(onPoint).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('sends presence fixes every four seconds while moving and ten while stationary', () => {
    vi.useFakeTimers()
    let reportPosition: PositionCallback = () => undefined
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: {
        watchPosition: (success: PositionCallback) => { reportPosition = success; return 10 },
        clearWatch: vi.fn(),
      },
    })
    const onPresenceFix = vi.fn()
    const { unmount } = renderHook(() => useWalkTracker(true, undefined, onPresenceFix))

    act(() => {
      reportPosition({ timestamp: 1_000, coords: { latitude: 37.5665, longitude: 126.978, accuracy: 5, heading: 0 } } as GeolocationPosition)
      reportPosition({ timestamp: 5_000, coords: { latitude: 37.5666, longitude: 126.978, accuracy: 5, heading: 0 } } as GeolocationPosition)
      reportPosition({ timestamp: 9_000, coords: { latitude: 37.5666, longitude: 126.978, accuracy: 5, heading: 0 } } as GeolocationPosition)
      reportPosition({ timestamp: 15_000, coords: { latitude: 37.5666, longitude: 126.978, accuracy: 5, heading: 0 } } as GeolocationPosition)
    })

    expect(onPresenceFix).toHaveBeenCalledTimes(3)
    expect(onPresenceFix.mock.calls[1][0].stationary).toBe(false)
    expect(onPresenceFix.mock.calls[2][0].stationary).toBe(true)
    unmount()
  })

  it('publishes the fixed test-account location without using device GPS', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T00:00:00.000Z'))
    const watchPosition = vi.fn()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { watchPosition, clearWatch: vi.fn() },
    })
    setDevLocationOverrideUser('test2@naver.com')
    const onPoint = vi.fn()
    const onPresenceFix = vi.fn()

    const { result, unmount } = renderHook(() => useWalkTracker(true, onPoint, onPresenceFix))

    expect(watchPosition).not.toHaveBeenCalled()
    expect(result.current.gpsSignal).toBe('good')
    expect(result.current.walkedCoordinates).toEqual([
      { latitude: 37.56457, longitude: 126.98693 },
    ])
    expect(onPresenceFix).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 37.56457,
      longitude: 126.98693,
      accuracy: 5,
    }))

    act(() => vi.advanceTimersByTime(12_000))
    expect(onPresenceFix).toHaveBeenCalledTimes(2)
    expect(onPresenceFix.mock.calls[1][0].stationary).toBe(true)
    unmount()
  })

  it('stops an early device GPS watch when authentication resolves a fixed location', () => {
    vi.useFakeTimers()
    const clearWatch = vi.fn()
    const watchPosition = vi.fn(() => 17)
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { watchPosition, clearWatch },
    })
    const onPresenceFix = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ override }: { override?: { latitude: number; longitude: number } }) => (
        useWalkTracker(true, undefined, onPresenceFix, override)
      ),
      { initialProps: { override: undefined } as { override?: { latitude: number; longitude: number } } },
    )

    expect(watchPosition).toHaveBeenCalledOnce()

    rerender({ override: { latitude: 37.564, longitude: 126.997 } })

    expect(clearWatch).toHaveBeenCalledWith(17)
    expect(onPresenceFix).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 37.564,
      longitude: 126.997,
    }))
    unmount()
  })
})
