import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { RepresentativeHomePage } from './RepresentativeHomePage'

const mapScene: BaseMapScene = {
  center: { latitude: 37.5512, longitude: 126.9882 },
  zoom: 14,
}

describe('RepresentativeHomePage', () => {
  it('shows the representative route and the Figma home navigation copy', () => {
    render(<RepresentativeHomePage />)

    expect(screen.getByRole('heading', { name: '저녁 남산길' })).toBeInTheDocument()
    expect(screen.getByText('29분 · 1.8km')).toBeInTheDocument()
    expect(screen.getByText('그늘 68%')).toBeInTheDocument()
    expect(screen.getByText('산책을 시작하면 작동해요')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toHaveTextContent('홈코스그룹기록마이')
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')
  })

  it('lets the user toggle distance mode and start a walk', () => {
    const onStartWalk = vi.fn()
    render(<RepresentativeHomePage onStartWalk={onStartWalk} />)

    const distanceMode = screen.getByRole('switch', { name: '거리두기 모드' })
    expect(distanceMode).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(distanceMode)
    expect(distanceMode).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(screen.getByRole('button', { name: '산책 시작' }))
    expect(onStartWalk).toHaveBeenCalledOnce()
  })

  it('passes the representative route scene to a future base-map adapter', () => {
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }

    render(<RepresentativeHomePage map={{ adapter, scene: mapScene }} />)

    expect(adapter.mount).toHaveBeenCalledOnce()
    expect(adapter.mount).toHaveBeenCalledWith(expect.any(HTMLElement), mapScene)
  })
})
