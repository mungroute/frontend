import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CourseCatalogApi, CourseComparison, CourseDiagnostics } from '../api/courses'
import type { BaseMapAdapter, BaseMapScene, MapClickEvent } from '../Components/map'
import { RouteComparisonPage } from './RouteComparisonPage'

const usual = {
  lengthM: 1800, durationMin: 45, shadeRatio: 0.68, estimatedSurfaceTempC: 34,
  referenceHour: 15, weatherSource: 'SCENARIO' as const, basisDate: '2026-08-11', confidence: 'MEDIUM' as const,
  calculatedAt: '2026-08-15T06:00:00Z', solarState: 'DAYLIGHT' as const, solarElevationDeg: 45, shadeApplicable: true,
}
const comparison: CourseComparison = {
  courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', hasAlternative: true,
  usual, alternative: { ...usual, lengthM: 1900, durationMin: 48, shadeRatio: 0.74, estimatedSurfaceTempC: 31 },
  usualRoute: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
  alternativeRoute: { type: 'LineString', coordinates: [[126.98, 37.56], [127, 37.57]] },
  temperatureImprovementC: 3, distanceDifferenceM: 100,
  swappedSections: [{
    sectionIndex: 0,
    fromSegmentIndex: 0,
    toSegmentIndexExclusive: 1,
    originalSegmentIds: [1],
    alternativeSegmentIds: [2],
    originalRoute: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
    alternativeRoute: { type: 'LineString', coordinates: [[126.98, 37.56], [127, 37.57]] },
    temperatureImprovementC: 3,
    addedLengthM: 100,
  }],
  unavailableReason: null,
}
const diagnostics: CourseDiagnostics = {
  courseSource: 'custom', courseId: 42, courseName: '대표 남산길', referenceHour: 15,
  temperatureLayerBasis: 'SELECTED_REFERENCE', solarState: 'DAYLIGHT', shadeApplicable: true,
  shadeMessage: null, courseAverageSurfaceTempC: 34, hottestSurfaceTempC: 38,
  hottestSegmentId: 1, summary: '가장 뜨거운 1번 구간은 추정 38.0℃예요. 그늘이 적어요.',
  diagnosticMethod: 'EMPIRICAL_COUNTERFACTUAL', calculatedAt: '2026-08-15T06:00:00Z',
  segments: [{ sequence: 1, legSequence: 1, segmentId: 1, lengthM: 1800, route: comparison.usualRoute,
    estimatedSurfaceTempC: 38, deviationFromCourseC: 4, temperatureGrade: 'MODERATE',
    weightedTemperatureShare: 1, shadeRatio: 0.2, treeShadeRatio: 0.1, buildingShadeRatio: 0.1,
    surfaceType: 'asphalt', svf: 0.8, albedo: 0.1, parkProximityM: 300,
    dominantFactor: 'SHADE', dominantImprovementC: 3, explanation: '그늘이 적어요.',
    confidence: 'MEDIUM', basisDate: '2026-08-11' }],
}
const apiFor = (value: CourseComparison) => ({
  list: vi.fn(), detail: vi.fn(), setRepresentative: vi.fn(), delete: vi.fn(), comparison: vi.fn(async () => value),
  diagnostics: vi.fn(async () => diagnostics),
} as unknown as CourseCatalogApi)

describe('RouteComparisonPage', () => {
  it('loads the computed comparison and starts either route', async () => {
    const onStartAlternative = vi.fn()
    const onStartUsual = vi.fn()
    render(<RouteComparisonPage source="custom" courseId={42} api={apiFor(comparison)} onStartAlternative={onStartAlternative} onStartUsual={onStartUsual} />)
    expect(await screen.findByRole('heading', { name: '오늘은 이 구간만 바꿔볼까요?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '패널 높이 조절' })).toBeEnabled()
    expect(screen.getByLabelText('추천 변경 효과')).toHaveTextContent('기존 34.0℃→추천 31.0℃↓ 3.0℃그늘 68% → 74%거리 100m 추가')
    expect(screen.getByText('추천 대안이 이 구간을 우회해요.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '대안 코스로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '기존 코스 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '기존 코스로 산책 시작' }))
    expect(onStartAlternative).toHaveBeenCalledOnce()
    expect(onStartUsual).toHaveBeenCalledOnce()
  })

  it('fits the selected route into the visible map area', async () => {
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }
    const scene: BaseMapScene = {
      center: { latitude: 37.56, longitude: 126.98 },
      zoom: 16,
    }
    render(<RouteComparisonPage source="custom" courseId={42} api={apiFor(comparison)} map={{ adapter, scene }} />)
    await screen.findByRole('heading', { name: '오늘은 이 구간만 바꿔볼까요?' })

    fireEvent.click(screen.getByRole('button', { name: /나의 기존 코스/ }))
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      viewFit: {
        coordinates: [
          { latitude: 37.56, longitude: 126.98 },
          { latitude: 37.57, longitude: 126.99 },
        ],
        padding: [66, 20, 18, 20],
        maxZoom: 17,
      },
    }))

    fireEvent.click(screen.getByRole('button', { name: /오늘의 추천 대안/ }))
    await waitFor(() => expect((update.mock.lastCall?.[0] as BaseMapScene).routes)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'alternative-section-0-0-0' })])))
    const updatedScene = update.mock.lastCall?.[0] as BaseMapScene
    expect(updatedScene.viewFit?.coordinates).toEqual([
      { latitude: 37.56, longitude: 126.98 },
      { latitude: 37.57, longitude: 127 },
    ])
    expect(updatedScene.center.latitude).toBeCloseTo(37.565)
    expect(updatedScene.center.longitude).toBeCloseTo(126.99)
    expect(updatedScene.routes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'usual-segment-1-replaced',
        width: 4,
        outlineWidth: 8,
        lineDash: [4, 7],
      }),
      expect.objectContaining({
        id: 'alternative-section-0-0-chevrons',
        chevrons: true,
      }),
    ]))
    expect(screen.getByLabelText('코스 색상 안내')).toHaveTextContent('기존 길변경 구간')
  })

  it('keeps shared geometry on the thermal existing course and colors only the actual detour mint', async () => {
    const sharedComparison: CourseComparison = {
      ...comparison,
      usualRoute: {
        type: 'LineString',
        coordinates: [[126.98, 37.56], [126.981, 37.56], [126.982, 37.56], [126.983, 37.56]],
      },
      alternativeRoute: {
        type: 'LineString',
        coordinates: [[126.98, 37.56], [126.981, 37.56], [126.9815, 37.561], [126.982, 37.56], [126.983, 37.56]],
      },
      swappedSections: [{
        ...comparison.swappedSections[0],
        fromSegmentIndex: 1,
        toSegmentIndexExclusive: 2,
        originalSegmentIds: [2],
        originalRoute: { type: 'LineString', coordinates: [[126.981, 37.56], [126.982, 37.56]] },
        // Deliberately includes both shared ends to guard against painting the whole alternative mint.
        alternativeRoute: {
          type: 'LineString',
          coordinates: [[126.98, 37.56], [126.981, 37.56], [126.9815, 37.561], [126.982, 37.56], [126.983, 37.56]],
        },
      }],
    }
    const sharedDiagnostics: CourseDiagnostics = {
      ...diagnostics,
      hottestSegmentId: 2,
      segments: [
        { ...diagnostics.segments[0], sequence: 1, segmentId: 1, temperatureGrade: 'LOW', route: { type: 'LineString', coordinates: [[126.98, 37.56], [126.981, 37.56]] } },
        { ...diagnostics.segments[0], sequence: 2, segmentId: 2, temperatureGrade: 'HIGH', route: { type: 'LineString', coordinates: [[126.981, 37.56], [126.982, 37.56]] } },
        { ...diagnostics.segments[0], sequence: 3, segmentId: 3, temperatureGrade: 'VERY_HIGH', route: { type: 'LineString', coordinates: [[126.982, 37.56], [126.983, 37.56]] } },
      ],
    }
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }
    const scene: BaseMapScene = { center: { latitude: 37.56, longitude: 126.98 }, zoom: 16 }
    const sharedApi = {
      ...apiFor(sharedComparison),
      diagnostics: vi.fn(async () => sharedDiagnostics),
    } as unknown as CourseCatalogApi

    render(<RouteComparisonPage source="custom" courseId={42} api={sharedApi} map={{ adapter, scene }} />)
    await screen.findByRole('heading', { name: '오늘은 이 구간만 바꿔볼까요?' })
    await waitFor(() => expect((update.mock.lastCall?.[0] as BaseMapScene).routes)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'alternative-section-0-0-0' })])))

    const updatedScene = update.mock.lastCall?.[0] as BaseMapScene
    const firstUsualPieces = updatedScene.routes?.filter((route) => route.id.startsWith('usual-segment-1-')) ?? []
    const replacedUsualPieces = updatedScene.routes?.filter((route) => route.id.startsWith('usual-segment-2-')) ?? []
    const lastUsualPieces = updatedScene.routes?.filter((route) => route.id.startsWith('usual-segment-3-')) ?? []
    expect(firstUsualPieces).toHaveLength(6)
    expect(replacedUsualPieces).toHaveLength(1)
    expect(lastUsualPieces).toHaveLength(6)
    expect(firstUsualPieces.every((route) => route.lineDash === undefined)).toBe(true)
    expect(replacedUsualPieces.every((route) => route.lineDash?.join(',') === '4,7')).toBe(true)
    expect(lastUsualPieces.every((route) => route.lineDash === undefined)).toBe(true)
    expect(new Set([...firstUsualPieces, ...replacedUsualPieces, ...lastUsualPieces].map((route) => route.color)).size)
      .toBeGreaterThan(3)
    expect(updatedScene.routes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'alternative-section-0-0-0',
        color: '#20bfa9',
        interactive: true,
      }),
    ]))
    const replacementRoutes = updatedScene.routes?.filter((route) => route.id.startsWith('alternative-')) ?? []
    expect(replacementRoutes).toHaveLength(9)
  })

  it('links a map route selection to the matching bottom-sheet section without changing the fitted route', async () => {
    let mapClick: ((event: MapClickEvent) => void) | undefined
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({
        ready: Promise.resolve(),
        update,
        destroy: vi.fn(),
        setClickHandler: (handler: ((event: MapClickEvent) => void) | undefined) => { mapClick = handler },
      })),
    }
    const scene: BaseMapScene = { center: { latitude: 37.56, longitude: 126.98 }, zoom: 16 }
    render(<RouteComparisonPage source="custom" courseId={42} api={apiFor(comparison)} map={{ adapter, scene }} />)
    await screen.findByRole('heading', { name: '오늘은 이 구간만 바꿔볼까요?' })
    await waitFor(() => expect(mapClick).toBeTypeOf('function'))
    await waitFor(() => expect((update.mock.lastCall?.[0] as BaseMapScene).routes)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'alternative-section-0-0-0', width: 5 })])))
    const fittedCoordinates = (update.mock.lastCall?.[0] as BaseMapScene).viewFit?.coordinates

    act(() => mapClick?.({
      coordinate: { latitude: 37.565, longitude: 126.99 },
      xPercent: 50,
      yPercent: 50,
      featureId: 'comparison-section-0',
    }))

    expect(screen.getByRole('button', { name: /변경 구간 1/ })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect((update.mock.lastCall?.[0] as BaseMapScene).routes)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'alternative-section-0-0-0', width: 6 })])))
    expect((update.mock.lastCall?.[0] as BaseMapScene).viewFit?.coordinates).toEqual(fittedCoordinates)
    await waitFor(() => expect((update.mock.lastCall?.[0] as BaseMapScene).markers)
      .toEqual(expect.arrayContaining([expect.objectContaining({
        id: 'comparison-callout-0',
        kind: 'route-callout',
        selected: true,
      })])), { timeout: 1_500 })
  })

  it('reveals the replacement and callout immediately when reduced motion is requested', async () => {
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    const update = vi.fn()
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update, destroy: vi.fn() })),
    }
    const scene: BaseMapScene = { center: { latitude: 37.56, longitude: 126.98 }, zoom: 16 }
    const view = render(<RouteComparisonPage source="custom" courseId={42} api={apiFor(comparison)} map={{ adapter, scene }} />)
    try {
      await screen.findByRole('heading', { name: '오늘은 이 구간만 바꿔볼까요?' })
      await waitFor(() => expect((update.mock.lastCall?.[0] as BaseMapScene).markers)
        .toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'route-callout' })])))
      expect((update.mock.lastCall?.[0] as BaseMapScene).routes)
        .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'alternative-section-0-0-0' })]))
    } finally {
      view.unmount()
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia })
    }
  })

  it('falls back to the existing course when no alternative exists', async () => {
    const noAlternative = { ...comparison, hasAlternative: false, alternative: null, alternativeRoute: null, temperatureImprovementC: null, distanceDifferenceM: null, swappedSections: [], unavailableReason: '교체 가능한 구간이 없어요.' }
    render(<RouteComparisonPage source="custom" courseId={42} api={apiFor(noAlternative)} />)
    const dialog = await screen.findByRole('dialog', { name: '추천 대안 생성 안내' })
    expect(within(dialog).getByText(/교체 가능한 구간이 없어요/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '기존 코스 확인' }))
    expect(screen.queryByRole('dialog', { name: '추천 대안 생성 안내' })).not.toBeInTheDocument()
    expect(screen.queryByText('오늘의 추천 대안')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기존 코스로 산책 시작' })).toBeInTheDocument()
  })

  it('shows a friendly modal instead of exposing an internal unavailable reason code', async () => {
    const noAlternative = {
      ...comparison,
      hasAlternative: false,
      alternative: null,
      alternativeRoute: null,
      temperatureImprovementC: null,
      distanceDifferenceM: null,
      swappedSections: [],
      unavailableReason: 'COURSE_NOT_CONNECTED',
    }
    render(<RouteComparisonPage source="custom" courseId={42} api={apiFor(noAlternative)} />)

    const dialog = await screen.findByRole('dialog', { name: '추천 대안 생성 안내' })
    expect(within(dialog).getByRole('heading', { name: '추천 대안을 만들지 못했어요' })).toBeInTheDocument()
    expect(within(dialog).getByText(/현재 코스 구조에서는 우회 구간을 만들기 어려워요/)).toBeInTheDocument()
    expect(screen.queryByText('COURSE_NOT_CONNECTED')).not.toBeInTheDocument()
  })
})
