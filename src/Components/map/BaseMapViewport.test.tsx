import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BaseMapViewport } from './BaseMapViewport'
import type { BaseMapAdapter, BaseMapScene } from './types'

const scene: BaseMapScene = {
  center: { latitude: 37.5512, longitude: 126.9882 },
  zoom: 14,
}

describe('BaseMapViewport', () => {
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
})
