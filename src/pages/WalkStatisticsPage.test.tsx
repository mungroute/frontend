import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WalkContributions, WalkStatistics } from '../api/walks'
import { WalkStatisticsPage } from './WalkStatisticsPage'

const statistics: WalkStatistics = {
  month: '2026-08',
  dogId: null,
  walkCount: 12,
  totalDistanceM: 18700,
  totalDurationSec: 19080,
  averageDistanceM: 1558.3,
  averageDurationSec: 1590,
  weekdayDistances: [
    { dayOfWeek: 1, distanceM: 2300 },
    { dayOfWeek: 6, distanceM: 5000 },
  ],
  favoriteCourse: { courseName: '저녁 남산길', walkCount: 5, averageDurationSec: 1860 },
}

const contributions: WalkContributions = {
  year: 2026,
  dogId: null,
  days: [{
    date: '2026-08-03',
    totalDistanceM: 2000,
    walkCount: 2,
    records: [
      { sessionId: 31, courseName: '아침 산책', distanceM: 650, startedAt: '2026-08-03T08:10:00+09:00', hasRoute: true },
      { sessionId: 32, courseName: '저녁 산책', distanceM: 1350, startedAt: '2026-08-03T18:40:00+09:00', hasRoute: true },
    ],
  }],
}

describe('WalkStatisticsPage', () => {
  it('shows the API monthly summary, weekday distances, and favorite course', () => {
    render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '산책 통계' })).toBeInTheDocument()
    expect(screen.getByText('18.7 km')).toBeInTheDocument()
    expect(screen.getByText('12회 · 5시간 18분')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '요일별 누적 거리' })).toBeInTheDocument()
    expect(screen.getByText('저녁 남산길')).toBeInTheDocument()
  })

  it('opens all walk records from the secondary action', () => {
    const onOpenRecords = vi.fn()
    render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={onOpenRecords} />)
    fireEvent.click(screen.getByRole('button', { name: '기록 전체 보기' }))
    expect(onOpenRecords).toHaveBeenCalledOnce()
  })

  it('shows daily totals in 2D and opens a selected route from the 3D skyline', async () => {
    const onOpenRecord = vi.fn()
    render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} onOpenRecord={onOpenRecord} />)

    fireEvent.click(screen.getByRole('button', { name: /8월 3일, 2.0km, 2회/ }))
    expect(screen.getByText('산책 완료 2회')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
    fireEvent.click(await screen.findByRole('button', { name: /8월 3일 산책 기록 열기/ }))
    fireEvent.click(screen.getByRole('button', { name: /아침 산책/ }))
    expect(onOpenRecord).toHaveBeenCalledWith(31)
  })

  it('morphs the same date element from the 2D grid into the 3D skyline', () => {
    render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    const flatDateBlock = screen.getByRole('button', { name: /8월 3일, 2.0km, 2회/ })

    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))

    const skylineDateBlock = screen.getByRole('button', { name: /8월 3일 산책 기록 열기/ })
    expect(skylineDateBlock).toBe(flatDateBlock)
    expect(document.querySelectorAll('.contribution-calendar__skyline-column')).toHaveLength(1)
  })

  it('centers the 3D camera on the section currently visible in the 2D scroller', () => {
    const { container } = render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    const viewport = container.querySelector('.contribution-calendar__skyline-viewport') as HTMLDivElement
    const skyline = container.querySelector('.contribution-calendar__skyline') as HTMLDivElement
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 400 },
      scrollLeft: { configurable: true, value: 170 },
    })

    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))

    expect(skyline.style.getPropertyValue('--skyline-pan-x')).toBe('-32px')
    expect(skyline.style.getPropertyValue('--skyline-zoom')).toBe('1')
  })

  it('rotates the 3D skyline with a mouse or touch pointer drag', () => {
    const { container } = render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
    const viewport = container.querySelector('.contribution-calendar__skyline-viewport') as HTMLDivElement
    const skyline = container.querySelector('.contribution-calendar__skyline') as HTMLDivElement
    Object.defineProperties(viewport, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: vi.fn() },
    })
    const initialTransform = skyline.getAttribute('style')

    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 145, clientY: 80 })

    expect(skyline.getAttribute('style')).not.toBe(initialTransform)
  })

  it('shows month markers and limits Ctrl+wheel zoom in the 3D skyline', () => {
    const { container } = render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
    const viewport = container.querySelector('.contribution-calendar__skyline-viewport') as HTMLDivElement
    const skyline = container.querySelector('.contribution-calendar__skyline') as HTMLDivElement

    expect(container.querySelectorAll('.contribution-calendar__skyline-month')).toHaveLength(12)
    fireEvent.wheel(viewport, { ctrlKey: true, deltaY: -1000 })
    expect(Number(skyline.style.getPropertyValue('--skyline-zoom'))).toBeLessThanOrEqual(2.2)
  })

  it('moves the 3D calendar horizontally with Shift+wheel', () => {
    const { container } = render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
    const viewport = container.querySelector('.contribution-calendar__skyline-viewport') as HTMLDivElement
    const skyline = container.querySelector('.contribution-calendar__skyline') as HTMLDivElement

    fireEvent.wheel(viewport, { shiftKey: true, deltaY: 120 })
    expect(skyline.style.getPropertyValue('--skyline-pan-x')).toBe('-84px')
  })

  it('rotates the 3D camera vertically and horizontally with a normal drag', () => {
    const { container } = render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
    const viewport = container.querySelector('.contribution-calendar__skyline-viewport') as HTMLDivElement
    const skyline = container.querySelector('.contribution-calendar__skyline') as HTMLDivElement
    Object.defineProperties(viewport, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: vi.fn() },
    })

    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 150, clientY: 120 })
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 200, clientY: 170 })

    expect(skyline.style.getPropertyValue('--rotate-x')).not.toBe('58deg')
    expect(skyline.style.getPropertyValue('--rotate-z')).not.toBe('-18deg')
  })

  it('pans the 3D camera with Shift+drag', () => {
    const { container } = render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
    const viewport = container.querySelector('.contribution-calendar__skyline-viewport') as HTMLDivElement
    const skyline = container.querySelector('.contribution-calendar__skyline') as HTMLDivElement
    Object.defineProperties(viewport, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: vi.fn() },
    })

    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 150, clientY: 120, shiftKey: true })
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 190, clientY: 150, shiftKey: true })

    expect(skyline.style.getPropertyValue('--skyline-pan-x')).toBe('40px')
    expect(skyline.style.getPropertyValue('--skyline-pan-y')).toBe('30px')
  })

  it('resets rotation, position, and zoom with the origin button', () => {
    const { container } = render(<WalkStatisticsPage statistics={statistics} contributions={contributions} onOpenRecords={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /자세히 보기/ }))
    const viewport = container.querySelector('.contribution-calendar__skyline-viewport') as HTMLDivElement
    const skyline = container.querySelector('.contribution-calendar__skyline') as HTMLDivElement
    Object.defineProperties(viewport, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: vi.fn() },
    })
    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 160, clientY: 140 })
    fireEvent.wheel(viewport, { ctrlKey: true, deltaY: -300 })

    fireEvent.click(screen.getByRole('button', { name: '3D 보기 원위치로 되돌리기' }))

    expect(skyline.style.getPropertyValue('--rotate-x')).toBe('58deg')
    expect(skyline.style.getPropertyValue('--rotate-z')).toBe('18deg')
    expect(skyline.style.getPropertyValue('--skyline-pan-x')).toBe('0px')
    expect(skyline.style.getPropertyValue('--skyline-pan-y')).toBe('0px')
    expect(skyline.style.getPropertyValue('--skyline-zoom')).toBe('1')
  })
})
