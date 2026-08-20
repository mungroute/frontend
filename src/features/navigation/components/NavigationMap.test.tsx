import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { normalizeWalkRoute } from '../route-normalizer'
import { NavigationMap } from './NavigationMap'

const markerSpies = vi.hoisted(() => ({
  addTo: vi.fn(),
  remove: vi.fn(),
  setLngLat: vi.fn(),
  setRotation: vi.fn(),
}))

vi.mock('maplibre-gl', async () => {
  const actual = await vi.importActual<typeof import('maplibre-gl')>('maplibre-gl')
  class Marker {
    private hasLngLat = false
    addTo(map: unknown) {
      if (!this.hasLngLat) throw new Error('Marker must receive coordinates before addTo')
      markerSpies.addTo(map)
      return this
    }
    remove() { markerSpies.remove(); return this }
    setLngLat(value: unknown) { this.hasLngLat = true; markerSpies.setLngLat(value); return this }
    setRotation(value: unknown) { markerSpies.setRotation(value); return this }
  }
  return { ...actual, Marker }
})

const route = normalizeWalkRoute({
  routeKey: 'map-route',
  origin: 'COURSE_DETAIL',
  name: '지도 테스트 코스',
  geometry: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
})

const createFakeMap = () => {
  const handlers = new Map<string, (event: { originalEvent?: unknown }) => void>()
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const map = {
    on: vi.fn((event: string, layerOrHandler: string | ((value: { originalEvent?: unknown }) => void), handler?: (value: { originalEvent?: unknown }) => void) => {
      handlers.set(event, typeof layerOrHandler === 'function' ? layerOrHandler : handler!)
      return map
    }),
    once: vi.fn((event: string, handler: () => void) => {
      if (event === 'load') queueMicrotask(handler)
      return map
    }),
    addSource: vi.fn((id: string) => { sources.set(id, { setData: vi.fn() }); return map }),
    addLayer: vi.fn(() => map),
    getStyle: vi.fn(() => ({ layers: [
      { id: 'terrain-shade', type: 'hillshade' },
      { id: '3d-buildings', type: 'fill-extrusion' },
    ] })),
    setLayoutProperty: vi.fn(() => map),
    setTerrain: vi.fn(() => map),
    getSource: vi.fn((id: string) => sources.get(id)),
    fitBounds: vi.fn(() => map),
    easeTo: vi.fn(() => map),
    getBearing: vi.fn(() => 0),
    remove: vi.fn(),
  }
  return { handlers, map }
}

describe('NavigationMap', () => {
  it('creates one MapLibre instance, loads navigation layers, and reuses it for GPS updates', async () => {
    const fake = createFakeMap()
    const factory = vi.fn(() => fake.map as never)
    const view = render(
      <NavigationMap
        route={route}
        position={{ coordinate: route.coordinateParts[0][0], accuracy: 5, observedAt: 1, heading: 45, speed: 1 }}
        mapFactory={factory}
        styleUrl="https://example.test/style.json"
      />,
    )

    await waitFor(() => expect(fake.map.addLayer).toHaveBeenCalled())
    expect(fake.map.setTerrain).toHaveBeenCalledWith(null)
    expect(fake.map.setLayoutProperty).toHaveBeenCalledWith('terrain-shade', 'visibility', 'none')
    expect(fake.map.setLayoutProperty).not.toHaveBeenCalledWith('3d-buildings', 'visibility', 'none')
    expect(fake.map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'navigation-chevron-symbol',
      layout: expect.objectContaining({
        'text-field': '›',
        'text-rotate': ['get', 'rotation'],
        'text-ignore-placement': true,
      }),
    }))
    expect(fake.map.fitBounds).toHaveBeenCalledOnce()
    await waitFor(() => expect(markerSpies.setLngLat).toHaveBeenCalledWith([126.98, 37.56]))

    view.rerender(
      <NavigationMap
        route={route}
        position={{ coordinate: { latitude: 37.561, longitude: 126.981 }, accuracy: 5, observedAt: 2, heading: 46, speed: 1 }}
        walkedCoordinates={[route.coordinateParts[0][0], { latitude: 37.561, longitude: 126.981 }]}
        padding={{ top: 120, right: 24, bottom: 360, left: 24 }}
        mapFactory={factory}
        styleUrl="https://example.test/style.json"
      />,
    )

    expect(factory).toHaveBeenCalledOnce()
    view.unmount()
    expect(fake.map.remove).toHaveBeenCalledOnce()
  })

  it('keeps manual map interaction until the user restores follow mode', async () => {
    const fake = createFakeMap()
    const position = { coordinate: route.coordinateParts[0][0], accuracy: 5, observedAt: 1, heading: 45, speed: 1 }
    render(<NavigationMap route={route} position={position} mapFactory={() => fake.map as never} styleUrl="https://example.test/style.json" />)
    await waitFor(() => expect(fake.map.addLayer).toHaveBeenCalled())

    expect(screen.getByRole('button', { name: '내 위치로 이동' })).toHaveClass('base-map-viewport__location-button')
    act(() => fake.handlers.get('dragstart')?.({ originalEvent: {} }))
    fake.map.easeTo.mockClear()

    fireEvent.click(screen.getByRole('button', { name: '내 위치로 이동' }))
    expect(fake.map.easeTo).toHaveBeenCalledOnce()
  })

  it('switches between the full-route 2D overview and current-location navigation', async () => {
    const fake = createFakeMap()
    const onViewModeChange = vi.fn()
    const vworldInstance = { ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() }
    const vworldAdapter = { mount: vi.fn(() => vworldInstance) }
    const position = { coordinate: route.coordinateParts[0][0], accuracy: 5, observedAt: 1, heading: 45, speed: 1 }
    render(
      <NavigationMap
        route={route}
        position={position}
        currentLocationMarker={{ label: '망고', profileImageSrc: '/registered/mango.jpg' }}
        fallbackMap={{ adapter: vworldAdapter, scene: { center: position.coordinate, zoom: 17 } }}
        mapFactory={() => fake.map as never}
        styleUrl="https://example.test/style.json"
        onViewModeChange={onViewModeChange}
      />,
    )
    await waitFor(() => expect(fake.map.addLayer).toHaveBeenCalled())

    fake.map.fitBounds.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '전체 경로 2D로 보기' }))

    await waitFor(() => expect(vworldAdapter.mount).toHaveBeenCalled())
    expect(screen.getByRole('region', { name: '전체 경로 2D 지도' })).toBeInTheDocument()
    expect(vworldAdapter.mount).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      viewFit: expect.objectContaining({
        coordinates: route.coordinateParts.flat(),
        padding: [72, 20, 180, 20],
        maxZoom: 17,
      }),
      markers: expect.arrayContaining([
        expect.objectContaining({
          id: 'current-location',
          label: '망고',
          profileImageSrc: '/registered/mango.jpg',
        }),
      ]),
    }))
    expect(fake.map.fitBounds).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^내 위치로$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '전체 경로 2D로 보기' })).not.toBeInTheDocument()
    await waitFor(() => expect(onViewModeChange).toHaveBeenLastCalledWith('overview'))

    fake.map.easeTo.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /^내 위치로$/ }))

    expect(fake.map.easeTo).toHaveBeenCalledWith(expect.objectContaining({
      center: [126.98, 37.56],
      zoom: 18,
      pitch: 54,
    }))
    expect(screen.getByRole('button', { name: '전체 경로 2D로 보기' })).toBeInTheDocument()
    expect(vworldInstance.destroy).toHaveBeenCalledOnce()
    await waitFor(() => expect(onViewModeChange).toHaveBeenLastCalledWith('navigation'))
  })

  it('shows the existing-map fallback and a retry action when MapLibre cannot start', async () => {
    const factory = vi.fn(() => { throw new Error('WebGL unavailable') })
    render(<NavigationMap route={route} mapFactory={factory} styleUrl="https://example.test/style.json" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('이 기기에서 3D 지도를 시작할 수 없습니다.')
    expect(screen.getByRole('region', { name: '산책 내비게이션 지도' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(factory).toHaveBeenCalledTimes(2))
  })
})
