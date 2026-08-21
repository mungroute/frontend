import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from './http'
import { walkApi } from './walks'
import { apiUrl } from './url'

describe('walkApi', () => {
  beforeEach(() => setAccessToken('test-access-token'))
  afterEach(() => {
    setAccessToken(null)
    vi.unstubAllGlobals()
  })

  it('sends a live GPS point with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await walkApi.addPoint(42, {
      recordedAt: '2026-08-14T10:00:00.000Z',
      lon: 126.978,
      lat: 37.5665,
      accuracy: 7,
    })

    expect(fetchMock).toHaveBeenCalledWith(apiUrl('/api/walks/42/points'), expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        recordedAt: '2026-08-14T10:00:00.000Z',
        lon: 126.978,
        lat: 37.5665,
        accuracy: 7,
      }),
    }))
    const headers = fetchMock.mock.calls[0][1].headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer test-access-token')
  })

  it('exposes a problem detail when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ detail: '대표 코스로 지정할 수 없습니다.' }),
      { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
    )))

    await expect(walkApi.save(42, '저녁 공원길', true))
      .rejects.toThrow('대표 코스로 지정할 수 없습니다.')
  })

  it('uploads an adaptive presence fix without requesting exact nearby coordinates', async () => {
    const response = {
      sessionId: 42,
      updatedAt: '2026-08-17T12:00:00+09:00',
      nextUpdateAfterSeconds: 4,
      nearbyCount: 8,
      nearby: [{
        distanceBand: 'BAND_50_100',
        directionOctant: 7,
        directionSpread: 45,
        directionReference: 'HEADING',
        trend: 'APPROACHING',
      }],
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await walkApi.updatePresence({
      sessionId: 42,
      measuredAt: '2026-08-17T03:00:00.000Z',
      lon: 126.978,
      lat: 37.5665,
      accuracy: 6,
      heading: 15,
      stationary: false,
      radiusM: 100,
    })

    expect(fetchMock).toHaveBeenCalledWith(apiUrl('/api/presence'), expect.objectContaining({ method: 'PUT' }))
  })

  it('requests a privacy-preserving safe detour with only the remaining route', async () => {
    const result = {
      requestId: 'detour-1', decision: 'WAIT', message: '잠시 기다려 주세요.',
      firstManeuver: null, addedDistanceM: null, addedDurationSec: null,
      route: [], validUntil: '2026-08-20T12:00:10+09:00', retryAfterSeconds: 25,
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await walkApi.safeDetour(42, {
      requestId: 'detour-1',
      alertTrend: 'APPROACHING',
      remainingRoute: [{ lat: 37.5665, lon: 126.978 }, { lat: 37.568, lon: 126.979 }],
    })

    expect(fetchMock).toHaveBeenCalledWith(apiUrl('/api/presence/42/safe-detour'), expect.objectContaining({
      method: 'POST',
      body: expect.not.stringContaining('candidate'),
    }))
  })

  it('loads the authoritative active-walk timer after a refresh', async () => {
    const state = {
      sessionId: 42, status: 'ACTIVE', startedAt: '2026-08-20T12:00:00+09:00',
      elapsedSeconds: 367, distanceM: 1234, mode: 'distance', lockedMode: 'distance',
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(state), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(walkApi.state(42)).resolves.toEqual(state)
    expect(fetchMock).toHaveBeenCalledWith(apiUrl('/api/walks/42/state'), expect.anything())
  })
})
