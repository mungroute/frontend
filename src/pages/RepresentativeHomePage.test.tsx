import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { RepresentativeHomePage } from './RepresentativeHomePage'
import type { CourseDetail } from '../api/courses'
import { placeApiStub } from '../test/placeApiStub'

const course: CourseDetail = {
  courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', loop: false, representative: true,
  createdAt: '2026-08-15T00:00:00Z', segmentIds: [1], route: { type: 'LineString', coordinates: [] },
  metrics: {
    lengthM: 1800, durationMin: 29, shadeRatio: 0.68, estimatedSurfaceTempC: 34,
    referenceHour: 15, weatherSource: 'SCENARIO', basisDate: '2026-08-11', confidence: 'MEDIUM',
    calculatedAt: '2026-08-15T06:00:00Z', solarState: 'DAYLIGHT', solarElevationDeg: 45, shadeApplicable: true,
  },
}

const mapScene: BaseMapScene = {
  center: { latitude: 37.5512, longitude: 126.9882 },
  zoom: 14,
}

describe('RepresentativeHomePage', () => {
  it('shows the representative route and the Figma home navigation copy', () => {
    render(<RepresentativeHomePage course={course} />)

    expect(screen.getByRole('heading', { name: '저녁 남산길' })).toBeInTheDocument()
    expect(screen.getByText('29분 · 1.80km')).toBeInTheDocument()
    expect(screen.getByText('그늘 68%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '장소 검색 열기' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '멍루트' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: '거리두기 모드' })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toHaveTextContent('홈코스그룹기록마이')
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')
  })

  it('starts a walk without exposing a home-level mode toggle', () => {
    const onStartWalk = vi.fn()
    render(<RepresentativeHomePage course={course} onStartWalk={onStartWalk} />)

    expect(screen.queryByRole('switch', { name: '거리두기 모드' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '산책 시작' }))
    expect(onStartWalk).toHaveBeenCalledOnce()
  })

  it('separates representative start, alternative comparison, and new recommendations', () => {
    render(<RepresentativeHomePage course={course} />)
    expect(screen.getByRole('button', { name: '산책 시작' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '오늘의 추천 대안 보기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새 코스 추천받기' })).toBeInTheDocument()
  })

  it('anchors the place preview to the draggable home sheet position', () => {
    render(<RepresentativeHomePage course={course} />)

    const searchRegion = screen.getByRole('region', { name: '지도 장소 검색' })
    expect(searchRegion.style.getPropertyValue('--place-preview-bottom'))
      .toContain('--map-sheet-top')
  })

  it('lowers the home course sheet while place search is open', () => {
    const { container } = render(<RepresentativeHomePage course={course} placeApi={placeApiStub} />)
    const sheetMotion = container.querySelector('.representative-home-page__sheet-motion')

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    expect(sheetMotion).toHaveAttribute('data-place-search', 'open')

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(sheetMotion).toHaveAttribute('data-place-search', 'closed')
  })

  it('slides the home course sheet away while place details are open', async () => {
    const { container } = render(<RepresentativeHomePage course={course} placeApi={placeApiStub} />)

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    fireEvent.click(screen.getByRole('button', { name: '음식점' }))
    fireEvent.click(await screen.findByRole('button', { name: '도그라운지 성수, 620m' }))
    fireEvent.click(await screen.findByRole('button', { name: '자세히 보기' }))

    expect(container.querySelector('.representative-home-page__sheet-motion'))
      .toHaveAttribute('data-place-detail', 'open')

    fireEvent.click(screen.getByRole('button', { name: '장소 상세 닫기' }))
    expect(container.querySelector('.representative-home-page__sheet-motion'))
      .toHaveAttribute('data-place-detail', 'closed')
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
