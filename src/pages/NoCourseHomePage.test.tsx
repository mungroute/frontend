import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { NoCourseHomePage } from './NoCourseHomePage'

const mapScene: BaseMapScene = {
  center: { latitude: 37.5512, longitude: 126.9882 },
  zoom: 15,
}

describe('NoCourseHomePage', () => {
  it('shows the current-location map without a representative course card', () => {
    render(<NoCourseHomePage />)

    expect(screen.getByRole('region', { name: '현재 위치 지도' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '현재 위치' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '저녁 남산길' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')
  })

  it('starts a walk from the primary map action', () => {
    const onStartWalk = vi.fn()
    render(<NoCourseHomePage onStartWalk={onStartWalk} />)

    fireEvent.click(screen.getByRole('button', { name: '산책 시작' }))

    expect(onStartWalk).toHaveBeenCalledOnce()
  })

  it('separates direct walking, drawing, and time-matched recommendations', () => {
    render(<NoCourseHomePage />)
    expect(screen.getByRole('button', { name: '산책 시작' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /지도에서 코스 그리기/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /시간 맞춤 코스 추천받기/ })).toBeInTheDocument()
  })

  it('passes the current-location scene to a future base-map adapter', () => {
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }

    render(<NoCourseHomePage map={{ adapter, scene: mapScene }} />)

    expect(adapter.mount).toHaveBeenCalledOnce()
    expect(adapter.mount).toHaveBeenCalledWith(expect.any(HTMLElement), mapScene)
  })

  it('removes the static location dot after the live map is ready', async () => {
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() })),
    }

    render(<NoCourseHomePage map={{ adapter, scene: mapScene }} />)

    await waitFor(() => expect(screen.queryByRole('img', { name: '현재 위치' })).not.toBeInTheDocument())
  })
})
