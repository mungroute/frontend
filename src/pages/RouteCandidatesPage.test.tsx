import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getCourseCandidates } from '../Components/courses/course-data'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { RouteCandidatesPage } from './RouteCandidatesPage'

describe('RouteCandidatesPage', () => {
  it('shows only newly generated routes and selects the first recommendation by default', () => {
    render(<RouteCandidatesPage />)

    expect(screen.getByRole('heading', { name: '30분 안에 걸을 수 있는 코스예요' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '내 코스' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: '새 추천 코스' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /저녁 남산길/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /남산 둘레길 A/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ignores saved routes even when they are included in the candidate data', () => {
    render(<RouteCandidatesPage candidates={getCourseCandidates(30)} />)

    expect(screen.queryByRole('region', { name: '내 코스' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /저녁 남산길/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /한강 노을 산책/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /남산 둘레길 A/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('changes the map, CTA, and confirmed candidate with the selected route', () => {
    const onConfirm = vi.fn()
    render(<RouteCandidatesPage onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: /장충단 공원길 B/ }))
    expect(screen.getByRole('region', { name: '장충단 공원길 B 경로 지도' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '추천 코스로 산책 시작' }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: 'generated-jangchung-park-b', source: 'generated' }))
  })

  it('keeps the generated-route CTA consistent even when it exceeds the target time', () => {
    const candidates = getCourseCandidates(30, { includeSaved: false }).map((candidate, index) => (
      index === 1 ? { ...candidate, withinTargetTime: false } : candidate
    ))
    render(<RouteCandidatesPage candidates={candidates} />)

    fireEvent.click(screen.getByRole('button', { name: /장충단 공원길 B/ }))

    expect(screen.getByRole('button', { name: '추천 코스로 산책 시작' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '그래도 이 코스로 걷기' })).not.toBeInTheDocument()
  })

  it('fits the selected route bounds inside the visible map area', () => {
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }
    const scene: BaseMapScene = {
      center: { latitude: 37.564, longitude: 126.997 },
      zoom: 17,
    }
    const candidates = getCourseCandidates(30, { includeSaved: false }).slice(0, 2).map((candidate, index) => ({
      ...candidate,
      routeCoordinates: index === 0
        ? [{ latitude: 37.563, longitude: 126.996 }, { latitude: 37.565, longitude: 126.999 }]
        : [{ latitude: 37.561, longitude: 126.994 }, { latitude: 37.566, longitude: 127.001 }],
    }))

    render(<RouteCandidatesPage map={{ adapter, scene }} candidates={candidates} />)
    expect(adapter.mount).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ mouseWheelZoom: true }))
    fireEvent.click(screen.getByRole('button', { name: /장충단 공원길 B/ }))

    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      viewFit: {
        coordinates: candidates[1].routeCoordinates,
        padding: [66, 20, 18, 20],
        maxZoom: 17,
      },
    }))
    const updatedScene = update.mock.lastCall?.[0] as BaseMapScene
    expect(updatedScene.center.latitude).toBeCloseTo(37.5635)
    expect(updatedScene.center.longitude).toBeCloseTo(126.9975)
  })

  it('marks every surface temperature as estimated', () => {
    render(<RouteCandidatesPage />)
    const cards = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'))
    cards.forEach((card) => expect(within(card).getByText(/추정 노면 \d+℃/)).toBeInTheDocument())
  })

  it('does not let the candidate sheet move above its initial position', () => {
    render(<RouteCandidatesPage />)
    const handle = screen.getByRole('button', { name: '패널 높이 조절' })
    const sheet = handle.closest('section')

    fireEvent.keyDown(handle, { key: 'ArrowUp' })

    expect(sheet).toHaveStyle({ transform: 'translateY(0px)' })
  })
})
