import { afterEach, describe, expect, it, vi } from 'vitest'
import { placeApi } from './places'

describe('placeApi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('loads the first rollout area without requesting authentication', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      items: [], page: 1, size: 100, totalCount: 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await placeApi.listJungGu({ latitude: 37.564, longitude: 126.997 })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/places/restaurants/areas/seoul-jung-gu?'),
      expect.objectContaining({ credentials: 'include' }),
    )
    const requestUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestUrl).toContain('latitude=37.564')
    expect(requestUrl).toContain('longitude=126.997')
  })

  it('loads details by content id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ contentId: '3012345' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))

    await placeApi.detail('3012345')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/places/restaurants/3012345'),
      expect.any(Object),
    )
  })
})
