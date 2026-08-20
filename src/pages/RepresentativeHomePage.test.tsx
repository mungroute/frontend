import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { RepresentativeHomePage } from './RepresentativeHomePage'
import type { CourseDetail, CourseDiagnostics } from '../api/courses'
import { placeApiStub } from '../test/placeApiStub'

const course: CourseDetail = {
  courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', loop: false, representative: true,
  createdAt: '2026-08-15T00:00:00Z', segmentIds: [1], route: {
    type: 'LineString',
    coordinates: [[126.98, 37.56], [126.985, 37.565], [126.99, 37.56]],
  },
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

const diagnostics: CourseDiagnostics = {
  courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', referenceHour: 15,
  temperatureLayerBasis: 'SELECTED_REFERENCE', solarState: 'DAYLIGHT', shadeApplicable: true,
  shadeMessage: null, courseAverageSurfaceTempC: 40, hottestSurfaceTempC: 44,
  hottestSegmentId: 2, summary: '현재 시각 기준 구간별 노면온도예요.',
  diagnosticMethod: 'EMPIRICAL_COUNTERFACTUAL', calculatedAt: '2026-08-20T06:00:00Z',
  segments: [
    {
      sequence: 1, legSequence: 1, segmentId: 1, lengthM: 900,
      route: { type: 'LineString', coordinates: [[126.98, 37.56], [126.985, 37.565]] },
      estimatedSurfaceTempC: 34, deviationFromCourseC: -6, temperatureGrade: 'LOW', weightedTemperatureShare: 0.4,
      shadeRatio: 0.8, treeShadeRatio: 0.5, buildingShadeRatio: 0.3, surfaceType: 'asphalt', svf: 0.4,
      albedo: 0.12, parkProximityM: 100, dominantFactor: 'SHADE', dominantImprovementC: 2,
      explanation: '그늘이 많은 구간이에요.', confidence: 'HIGH', basisDate: '2026-08-20',
    },
    {
      sequence: 2, legSequence: 2, segmentId: 2, lengthM: 900,
      route: { type: 'LineString', coordinates: [[126.985, 37.565], [126.99, 37.56]] },
      estimatedSurfaceTempC: 44, deviationFromCourseC: 4, temperatureGrade: 'HIGH', weightedTemperatureShare: 0.6,
      shadeRatio: 0.2, treeShadeRatio: 0.1, buildingShadeRatio: 0.1, surfaceType: 'asphalt', svf: 0.8,
      albedo: 0.12, parkProximityM: 300, dominantFactor: 'SHADE', dominantImprovementC: 1,
      explanation: '햇빛 노출이 많은 구간이에요.', confidence: 'HIGH', basisDate: '2026-08-20',
    },
  ],
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

  it('renders and fits the representative course route on the home map', () => {
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }

    render(<RepresentativeHomePage course={course} diagnostics={diagnostics} map={{ adapter, scene: mapScene }} />)

    expect(adapter.mount).toHaveBeenCalledOnce()
    const mountedScene = vi.mocked(adapter.mount).mock.calls[0][1]
    expect(mountedScene).toEqual(expect.objectContaining({
      center: { latitude: 37.5625, longitude: 126.985 },
      viewFit: expect.objectContaining({
        coordinates: [
          { latitude: 37.56, longitude: 126.98 },
          { latitude: 37.565, longitude: 126.985 },
          { latitude: 37.56, longitude: 126.99 },
        ],
      }),
      markers: expect.arrayContaining([
        expect.objectContaining({ id: 'representative-course-start' }),
        expect.objectContaining({
          id: 'representative-course-finish',
          revealAfterDraw: 'representative-home-custom-42',
        }),
      ]),
    }))
    expect(new Set(mountedScene.routes
      ?.filter((route) => !route.chevrons)
      .map((route) => route.color)).size).toBeGreaterThan(1)
    expect(mountedScene.routes?.some((route) => route.color === '#f47a50')).toBe(true)
    expect(mountedScene.routes?.some((route) => (
      route.chevrons
      && route.drawOnLoad
      && route.drawGroupId === 'representative-home-custom-42'
    ))).toBe(true)
  })
})
