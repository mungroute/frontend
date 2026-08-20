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
    addTo(map: unknown) { markerSpies.addTo(map); return this }
    remove() { markerSpies.remove(); return this }
    setLngLat(value: unknown) { markerSpies.setLngLat(value); return this }
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
    expect(fake.map.fitBounds).toHaveBeenCalledOnce()
    expect(markerSpies.setLngLat).toHaveBeenCalledWith([126.98, 37.56])

    view.rerender(
      <NavigationMap
        route={route}
        position={{ coordinate: { latitude: 37.561, longitude: 126.981 }, accuracy: 5, observedAt: 2, heading: 46, speed: 1 }}
        walkedCoordinates={[route.coordinateParts[0][0], { latitude: 37.561, longitude: 126.981 }]}
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

    act(() => fake.handlers.get('dragstart')?.({ originalEvent: {} }))
    expect(screen.getByRole('button', { name: '내 위치' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '내 위치' }))
    expect(screen.queryByRole('button', { name: '내 위치' })).not.toBeInTheDocument()
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
