import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BaseMapViewport } from './BaseMapViewport'
import { BaseMapProvider } from './BaseMapProvider'
import type { BaseMapAdapter, BaseMapScene } from './types'

const scene: BaseMapScene = {
  center: { latitude: 37.5512, longitude: 126.9882 },
  zoom: 14,
}

describe('BaseMapViewport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the static Figma preview when no map adapter is connected', () => {
    render(
      <BaseMapViewport
        ariaLabel="현재 위치 지도"
        fallback={{ src: '/map.png', overlay: <span>현재 위치 마커</span> }}
      />,
    )

    expect(screen.getByRole('region', { name: '현재 위치 지도' })).toBeInTheDocument()
    expect(screen.getByTestId('base-map-fallback')).toBeInTheDocument()
    expect(screen.getByText('현재 위치 마커')).toBeInTheDocument()
  })

  it('mounts, updates, and destroys a supplied map adapter', async () => {
    const update = vi.fn()
    const destroy = vi.fn()
    const mount = vi.fn(() => ({ ready: Promise.resolve(), update, destroy }))
    const adapter: BaseMapAdapter = { mount }

    const { rerender, unmount } = render(
      <BaseMapViewport
        ariaLabel="대표 코스 지도"
        fallback={{ src: '/map.png' }}
        map={{ adapter, scene }}
      />,
    )

    expect(mount).toHaveBeenCalledWith(expect.any(HTMLElement), scene)
    await waitFor(() => expect(screen.queryByTestId('base-map-fallback')).not.toBeInTheDocument())

    const nextScene = { ...scene, zoom: 15 }
    rerender(
      <BaseMapViewport
        ariaLabel="대표 코스 지도"
        fallback={{ src: '/map.png' }}
        map={{ adapter, scene: nextScene }}
      />,
    )

    expect(mount).toHaveBeenCalledOnce()
    expect(update).toHaveBeenLastCalledWith(nextScene)

    unmount()
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('keeps the fallback visible until the provider reports that its tiles are ready', async () => {
    let markReady: () => void = () => undefined
    const ready = new Promise<void>((resolve) => {
      markReady = resolve
    })
    const adapter: BaseMapAdapter = {
      mount: () => ({ ready, update: vi.fn(), destroy: vi.fn() }),
    }

    render(<BaseMapViewport ariaLabel="지도" fallback={{ src: '/map.png' }} map={{ adapter, scene }} />)

    expect(screen.getByTestId('base-map-fallback')).toBeInTheDocument()
    markReady()
    await waitFor(() => expect(screen.queryByTestId('base-map-fallback')).not.toBeInTheDocument())
  })

  it('supplies the current scene when the adapter is replaced', async () => {
    const first = { mount: vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() })) }
    let markSecondReady: () => void = () => undefined
    const secondReady = new Promise<void>((resolve) => {
      markSecondReady = resolve
    })
    const second = { mount: vi.fn(() => ({ ready: secondReady, update: vi.fn(), destroy: vi.fn() })) }
    const { rerender } = render(
      <BaseMapViewport ariaLabel="지도" fallback={{ src: '/map.png' }} map={{ adapter: first, scene }} />,
    )

    await waitFor(() => expect(screen.queryByTestId('base-map-fallback')).not.toBeInTheDocument())

    rerender(<BaseMapViewport ariaLabel="지도" fallback={{ src: '/map.png' }} map={{ adapter: second, scene }} />)

    expect(second.mount).toHaveBeenCalledWith(expect.any(HTMLElement), scene)
    expect(screen.getByTestId('base-map-fallback')).toBeInTheDocument()
    markSecondReady()
    await waitFor(() => expect(screen.getByRole('region', { name: '지도' })).toHaveAttribute('data-map-provider', 'adapter'))
  })

  it('uses the app-level map provider and preserves the visual overlay after tiles load', async () => {
    const mount = vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() }))
    const adapter: BaseMapAdapter = { mount }

    render(
      <BaseMapProvider adapter={adapter} defaultScene={scene}>
        <BaseMapViewport ariaLabel="공통 지도" fallback={{ src: '/map.png', overlay: <span>추천 경로</span> }} />
      </BaseMapProvider>,
    )

    expect(mount).toHaveBeenCalledWith(expect.any(HTMLElement), scene)
    await waitFor(() => expect(screen.queryByTestId('base-map-fallback')).not.toBeInTheDocument())
    expect(screen.getByText('추천 경로')).toBeInTheDocument()
  })

  it('can replace shared location markers for a route-focused map', () => {
    const mount = vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() }))
    const adapter: BaseMapAdapter = { mount }
    const sceneWithLocation: BaseMapScene = {
      ...scene,
      markers: [{ id: 'current-location', position: scene.center, kind: 'current-location', label: '망고' }],
    }
    const routeCenter = { latitude: 37.57, longitude: 126.99 }

    render(
      <BaseMapViewport
        ariaLabel="산책 경로 지도"
        fallback={{ src: '/map.png' }}
        map={{ adapter, scene: sceneWithLocation }}
        sceneOverlay={{
          center: routeCenter,
          zoom: 16,
          markers: [{ id: 'route-start', position: routeCenter, kind: 'start', label: '출발' }],
        }}
        replaceBaseMarkers
      />,
    )

    expect(mount).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      center: routeCenter,
      zoom: 16,
      markers: [expect.objectContaining({ id: 'route-start' })],
    }))
  })

  it('connects map single-click events without placing a pointer-blocking button over an adapter', () => {
    const onMapClick = vi.fn()
    const setClickHandler = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), setClickHandler, destroy: vi.fn() })),
    }

    render(<BaseMapViewport ariaLabel="코스 지도" fallback={{ src: '/map.png' }} map={{ adapter, scene }} onMapClick={onMapClick} />)

    expect(setClickHandler).toHaveBeenCalledWith(expect.any(Function))
    expect(screen.queryByRole('button', { name: '지도에 지점 추가' })).not.toBeInTheDocument()
  })

  it('requests geolocation and recenters the map from the shared location control', async () => {
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({
      coords: { latitude: 37.5665, longitude: 126.978 } as GeolocationCoordinates,
    } as GeolocationPosition))
    vi.stubGlobal('navigator', { ...window.navigator, geolocation: { getCurrentPosition } })

    render(<BaseMapViewport ariaLabel="현재 위치 지도" fallback={{ src: '/map.png' }} map={{ adapter, scene }} showLocationControl />)
    fireEvent.click(screen.getByRole('button', { name: '내 위치로 이동' }))

    await waitFor(() => expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      center: { latitude: 37.5665, longitude: 126.978 },
      zoom: 17,
    })))
    expect(getCurrentPosition).toHaveBeenCalledOnce()
  })

  it('recenters on refresh when geolocation permission was already granted', async () => {
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }
    const getCurrentPosition = vi.fn()
    let reportWatchedPosition: PositionCallback = () => undefined
    const watchPosition = vi.fn((success: PositionCallback) => {
      reportWatchedPosition = success
      success({
        timestamp: Date.now(),
        coords: { latitude: 37.5012, longitude: 127.0396 } as GeolocationCoordinates,
      } as GeolocationPosition)
      return 31
    })
    const clearWatch = vi.fn()
    const query = vi.fn(() => Promise.resolve({ state: 'granted' } as PermissionStatus))
    vi.stubGlobal('navigator', { ...window.navigator, permissions: { query }, geolocation: { getCurrentPosition, watchPosition, clearWatch } })

    const { unmount } = render(
      <BaseMapProvider adapter={adapter} defaultScene={scene}>
        <BaseMapViewport ariaLabel="현재 위치 지도" fallback={{ src: '/map.png' }} />
      </BaseMapProvider>,
    )

    await waitFor(() => expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      center: { latitude: 37.5012, longitude: 127.0396 },
      zoom: 17,
    })))
    expect(query).toHaveBeenCalledWith({ name: 'geolocation' })
    expect(getCurrentPosition).not.toHaveBeenCalled()
    await waitFor(() => expect(watchPosition).toHaveBeenCalledOnce())

    act(() => reportWatchedPosition({
      timestamp: Date.now(),
      coords: { latitude: 37.5024, longitude: 127.0412 } as GeolocationCoordinates,
    } as GeolocationPosition))
    await waitFor(() => expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      center: { latitude: 37.5024, longitude: 127.0412 },
    })))

    unmount()
    expect(clearWatch).toHaveBeenCalledWith(31)
  })

  it('does not prompt for location automatically when permission is not granted', async () => {
    const getCurrentPosition = vi.fn()
    const query = vi.fn(() => Promise.resolve({ state: 'prompt' } as PermissionStatus))
    vi.stubGlobal('navigator', { ...window.navigator, permissions: { query }, geolocation: { getCurrentPosition } })

    render(
      <BaseMapProvider defaultScene={scene}>
        <BaseMapViewport ariaLabel="기본 지도" fallback={{ src: '/map.png' }} />
      </BaseMapProvider>,
    )

    await waitFor(() => expect(query).toHaveBeenCalledOnce())
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })
})
