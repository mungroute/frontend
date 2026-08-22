import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapMarker } from '../../../Components/map'
import { normalizeWalkRoute } from '../route-normalizer'
import { bearingBetween } from '../utils/bearing'
import { NavigationMap } from './NavigationMap'

const markerSpies = vi.hoisted(() => ({
  addTo: vi.fn(),
  remove: vi.fn(),
  setLngLat: vi.fn(),
  setRotation: vi.fn(),
  elements: [] as HTMLElement[],
}))

vi.mock('maplibre-gl', async () => {
  const actual = await vi.importActual<typeof import('maplibre-gl')>('maplibre-gl')
  class Marker {
    private hasLngLat = false
    constructor(options?: { element?: HTMLElement }) {
      if (options?.element) markerSpies.elements.push(options.element)
    }
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
  beforeEach(() => {
    vi.clearAllMocks()
    markerSpies.elements.length = 0
  })

  it('creates one MapLibre instance, loads navigation layers, and reuses it for GPS updates', async () => {
    const fake = createFakeMap()
    const factory = vi.fn(() => fake.map as never)
    const firstMeetSelect = vi.fn()
    const firstPlaceSelect = vi.fn()
    const view = render(
      <NavigationMap
        route={route}
        position={{ coordinate: route.coordinateParts[0][0], accuracy: 5, observedAt: 1, heading: 45, speed: 1 }}
        mapFactory={factory}
        styleUrl="https://example.test/style.json"
        onMeetSelect={firstMeetSelect}
        onPlaceSelect={firstPlaceSelect}
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
    expect(fake.map.fitBounds).not.toHaveBeenCalled()
    await waitFor(() => expect(markerSpies.setLngLat).toHaveBeenCalledWith([126.98, 37.56]))
    await waitFor(() => expect(fake.map.easeTo).toHaveBeenCalledWith(expect.objectContaining({
      center: [126.98, 37.56],
      bearing: bearingBetween(route.coordinateParts[0][0], route.coordinateParts[0][1]),
      offset: [0, 126],
    })))
    expect(markerSpies.setRotation).toHaveBeenLastCalledWith(
      bearingBetween(route.coordinateParts[0][0], route.coordinateParts[0][1]),
    )

    view.rerender(
      <NavigationMap
        route={route}
        position={{ coordinate: { latitude: 37.561, longitude: 126.981 }, accuracy: 5, observedAt: 2, heading: 46, speed: 1 }}
        walkedCoordinates={[route.coordinateParts[0][0], { latitude: 37.561, longitude: 126.981 }]}
        padding={{ top: 120, right: 24, bottom: 360, left: 24 }}
        mapFactory={factory}
        styleUrl="https://example.test/style.json"
        onMeetSelect={vi.fn()}
        onPlaceSelect={vi.fn()}
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
    expect(fake.map.easeTo).toHaveBeenCalledWith(expect.objectContaining({
      center: [126.98, 37.56],
      bearing: bearingBetween(route.coordinateParts[0][0], route.coordinateParts[0][1]),
      offset: [0, 126],
    }))
  })

  it('moves and rotates the follow camera when the live fix changes', async () => {
    const fake = createFakeMap()
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const firstPosition = { coordinate: route.coordinateParts[0][0], accuracy: 5, observedAt: 1, heading: 20, speed: 1 }
    const view = render(
      <NavigationMap
        route={route}
        position={firstPosition}
        heading={20}
        mapFactory={() => fake.map as never}
        styleUrl="https://example.test/style.json"
      />,
    )
    await waitFor(() => expect(fake.map.easeTo).toHaveBeenCalled())

    fake.map.easeTo.mockClear()
    now.mockReturnValue(1_400)
    const nextPosition = { coordinate: { latitude: 37.561, longitude: 126.981 }, accuracy: 5, observedAt: 2, heading: 95, speed: 1 }
    view.rerender(
      <NavigationMap
        route={route}
        position={nextPosition}
        heading={95}
        mapFactory={() => fake.map as never}
        styleUrl="https://example.test/style.json"
      />,
    )

    await waitFor(() => expect(fake.map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({
      center: [126.981, 37.561],
      bearing: 95,
      pitch: 54,
    })))
    expect(markerSpies.setRotation).toHaveBeenLastCalledWith(95)
    now.mockRestore()
  })

  it('opens the accepted meet profile instead of treating its marker as a place', async () => {
    const fake = createFakeMap()
    const onMeetSelect = vi.fn()
    const onPlaceSelect = vi.fn()
    render(
      <NavigationMap
        route={route}
        meetMarker={{ id: 'meet-friend', position: route.coordinateParts[0][0], kind: 'profile-location', label: '쿠키', profileImageSrc: '/cookie.jpg' }}
        mapFactory={() => fake.map as never}
        styleUrl="https://example.test/style.json"
        onMeetSelect={onMeetSelect}
        onPlaceSelect={onPlaceSelect}
      />,
    )
    await waitFor(() => expect(fake.map.addLayer).toHaveBeenCalled())

    await waitFor(() => expect(markerSpies.elements).toHaveLength(1))
    const profileMarker = markerSpies.elements[0]
    expect(profileMarker).toHaveAttribute('aria-label', '쿠키 프로필 보기')
    expect(profileMarker.querySelector('img')).toHaveAttribute('src', '/cookie.jpg')
    fireEvent.click(profileMarker)

    expect(onMeetSelect).toHaveBeenCalledOnce()
    expect(onPlaceSelect).not.toHaveBeenCalled()
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
        meetMarker={{ id: 'meet-friend', position: route.coordinateParts[0][1], kind: 'profile-location', label: '쿠키', profileImageSrc: '/registered/cookie.jpg' }}
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
        expect.objectContaining({
          id: 'meet-friend',
          kind: 'profile-location',
          label: '쿠키',
          profileImageSrc: '/registered/cookie.jpg',
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
      bearing: bearingBetween(route.coordinateParts[0][0], route.coordinateParts[0][1]),
      offset: [0, 126],
    }))
    expect(screen.getByRole('button', { name: '전체 경로 2D로 보기' })).toBeInTheDocument()
    expect(vworldInstance.destroy).toHaveBeenCalledOnce()
    await waitFor(() => expect(onViewModeChange).toHaveBeenLastCalledWith('navigation'))
  })

  it('focuses the 2D overview on place results and restores the route fit when they are cleared', async () => {
    const fake = createFakeMap()
    const vworldInstance = { ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() }
    const vworldAdapter = { mount: vi.fn(() => vworldInstance) }
    const position = { coordinate: route.coordinateParts[0][0], accuracy: 5, observedAt: 1, heading: 45, speed: 1 }
    const renderMap = (placeMarkers: MapMarker[]) => (
      <NavigationMap
        route={route}
        position={position}
        placeMarkers={placeMarkers}
        fallbackMap={{ adapter: vworldAdapter, scene: { center: position.coordinate, zoom: 17 } }}
        mapFactory={() => fake.map as never}
        styleUrl="https://example.test/style.json"
      />
    )
    const view = render(renderMap([]))
    await waitFor(() => expect(fake.map.addLayer).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: '전체 경로 2D로 보기' }))
    await waitFor(() => expect(vworldAdapter.mount).toHaveBeenCalled())

    const places: MapMarker[] = [
      { id: 'place:west', position: { latitude: 37.55, longitude: 126.96 }, category: 'pharmacy', kind: 'default' },
      { id: 'place:east', position: { latitude: 37.59, longitude: 127.02 }, category: 'pharmacy', kind: 'default' },
    ]
    vworldInstance.update.mockClear()
    view.rerender(renderMap(places))

    await waitFor(() => expect(vworldInstance.update).toHaveBeenCalled())
    expect(vworldInstance.update).toHaveBeenLastCalledWith(expect.objectContaining({
      center: { latitude: 37.57, longitude: 126.99 },
      zoom: expect.any(Number),
      viewFit: undefined,
      markers: expect.arrayContaining(places),
    }))

    vworldInstance.update.mockClear()
    view.rerender(renderMap([]))

    await waitFor(() => expect(vworldInstance.update).toHaveBeenCalled())
    expect(vworldInstance.update).toHaveBeenLastCalledWith(expect.objectContaining({
      viewFit: expect.objectContaining({
        coordinates: route.coordinateParts.flat(),
        padding: [72, 20, 180, 20],
        maxZoom: 17,
      }),
    }))
  })

  it('keeps the VWorld fallback camera on the user and rotates with the route heading', async () => {
    const instance = { ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() }
    const adapter = { mount: vi.fn(() => instance) }
    const firstPosition = { coordinate: route.coordinateParts[0][0], accuracy: 5, observedAt: 1, heading: 20, speed: 1 }
    const view = render(
      <NavigationMap
        route={route}
        position={firstPosition}
        heading={35}
        fallbackMap={{ adapter, scene: { center: route.coordinateParts[0][1], zoom: 16 } }}
        styleUrl=""
      />,
    )

    await waitFor(() => expect(adapter.mount).toHaveBeenCalled())
    expect(adapter.mount).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      center: firstPosition.coordinate,
      zoom: 18,
      bearing: 35,
      focusAnchorY: 0.68,
      focusBottomInset: 0,
      focusOffsetY: 0,
      viewFit: undefined,
    }))

    const nextPosition = { coordinate: { latitude: 37.561, longitude: 126.981 }, accuracy: 5, observedAt: 2, heading: 90, speed: 1 }
    view.rerender(
      <NavigationMap
        route={route}
        position={nextPosition}
        heading={90}
        walkedCoordinates={[route.coordinateParts[0][0], nextPosition.coordinate]}
        fallbackMap={{ adapter, scene: { center: route.coordinateParts[0][1], zoom: 16 } }}
        styleUrl=""
      />,
    )

    await waitFor(() => expect(instance.update).toHaveBeenLastCalledWith(expect.objectContaining({
      center: nextPosition.coordinate,
      zoom: 18,
      bearing: 90,
      focusAnchorY: 0.68,
      focusBottomInset: 0,
      focusOffsetY: 0,
      viewFit: undefined,
    })))
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
