import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { NoCourseHomePage } from './NoCourseHomePage'
import { placeApiStub } from '../test/placeApiStub'

const mapScene: BaseMapScene = {
  center: { latitude: 37.5512, longitude: 126.9882 },
  zoom: 15,
}

describe('NoCourseHomePage', () => {
  it('shows the current-location map without a representative course card', () => {
    render(<NoCourseHomePage />)

    expect(screen.getByRole('region', { name: '현재 위치 지도' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '현재 위치' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '장소 검색 열기' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '멍루트' })).not.toBeInTheDocument()
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

  it('slides the home actions away while place details are open', async () => {
    const { container } = render(<NoCourseHomePage placeApi={placeApiStub} />)

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    fireEvent.click(screen.getByRole('button', { name: '음식점' }))
    fireEvent.click(await screen.findByRole('button', { name: '도그라운지 성수, 620m' }))
    fireEvent.click(await screen.findByRole('button', { name: '자세히 보기' }))

    expect(container.querySelector('.no-course-home-page__actions-motion'))
      .toHaveAttribute('data-place-detail', 'open')

    fireEvent.click(screen.getByRole('button', { name: '장소 상세 닫기' }))
    expect(container.querySelector('.no-course-home-page__actions-motion'))
      .toHaveAttribute('data-place-detail', 'closed')
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
