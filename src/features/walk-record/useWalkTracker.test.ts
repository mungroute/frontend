import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { distanceBetween, formatWalkDistance, formatWalkTime, useWalkTracker } from './useWalkTracker'

describe('walk tracker calculations', () => {
  afterEach(() => {
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
      reportPosition({ coords: { latitude: 37.5665, longitude: 126.978 } } as GeolocationPosition)
      reportPosition({ coords: { latitude: 37.5675, longitude: 126.978 } } as GeolocationPosition)
    })
    expect(result.current.formattedDistance).toBe('0.11km')

    unmount()
    expect(clearWatch).toHaveBeenCalledWith(7)
  })
})
