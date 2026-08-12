import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
})
