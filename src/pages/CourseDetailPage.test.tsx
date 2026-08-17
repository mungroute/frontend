import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CourseCatalogApi, CourseDetail, CourseDiagnostics } from '../api/courses'
import { CourseDetailPage } from './CourseDetailPage'

const dayCourse: CourseDetail = {
  courseId: 42, courseSource: 'custom', courseName: '주말 산책길', loop: false,
  representative: false, createdAt: '2026-08-15T00:00:00Z', segmentIds: [1, 2],
  route: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
  metrics: {
    lengthM: 1420, durationMin: 36, shadeRatio: 0.42, estimatedSurfaceTempC: 38.4,
    referenceHour: 15, weatherSource: 'SCENARIO', basisDate: '2026-08-11', confidence: 'MEDIUM',
    calculatedAt: '2026-08-15T06:00:00Z', solarState: 'DAYLIGHT', solarElevationDeg: 57.2, shadeApplicable: true,
  },
}
const diagnostics: CourseDiagnostics = {
  courseSource: 'custom', courseId: 42, courseName: '주말 산책길', referenceHour: 15,
  temperatureLayerBasis: 'SELECTED_REFERENCE', solarState: 'DAYLIGHT', shadeApplicable: true,
  shadeMessage: null, courseAverageSurfaceTempC: 38.4, hottestSurfaceTempC: 40.1,
  hottestSegmentId: 2, summary: '가장 뜨거운 2번 구간은 추정 40.1℃예요.',
  diagnosticMethod: 'EMPIRICAL_COUNTERFACTUAL', calculatedAt: '2026-08-15T06:00:00Z',
  segments: [{
    sequence: 1, legSequence: 1, segmentId: 1, lengthM: 700,
    route: { type: 'LineString', coordinates: [[126.98, 37.56], [126.985, 37.565]] },
    estimatedSurfaceTempC: 36.7, deviationFromCourseC: -1.7, temperatureGrade: 'MODERATE',
    weightedTemperatureShare: 0.47, shadeRatio: 0.5, treeShadeRatio: 0.3, buildingShadeRatio: 0.2,
    surfaceType: 'asphalt', svf: 0.5, albedo: 0.12, parkProximityM: 120,
    dominantFactor: 'SHADE', dominantImprovementC: 1.2, explanation: '그늘이 적어요.',
    confidence: 'MEDIUM', basisDate: '2026-08-11',
  }, {
    sequence: 2, legSequence: 2, segmentId: 2, lengthM: 720,
    route: { type: 'LineString', coordinates: [[126.985, 37.565], [126.99, 37.57]] },
    estimatedSurfaceTempC: 40.1, deviationFromCourseC: 1.7, temperatureGrade: 'HIGH',
    weightedTemperatureShare: 0.53, shadeRatio: 0.2, treeShadeRatio: 0.1, buildingShadeRatio: 0.1,
    surfaceType: 'asphalt', svf: 0.8, albedo: 0.1, parkProximityM: 300,
    dominantFactor: 'SHADE', dominantImprovementC: 2.4, explanation: '그늘이 중구 중앙값보다 적어요.',
    confidence: 'MEDIUM', basisDate: '2026-08-11',
  }],
}
const apiFor = (course = dayCourse, diagnosticResult = diagnostics) => ({
  list: vi.fn(), detail: vi.fn(async () => course),
  setRepresentative: vi.fn(async (_source, _id, representative) => ({ ...course, representative })),
  delete: vi.fn(async () => undefined), comparison: vi.fn(), diagnostics: vi.fn(async () => diagnosticResult),
} as unknown as CourseCatalogApi)

describe('CourseDetailPage', () => {
  it('restores detail and updates representative state through the API', async () => {
    const api = apiFor()
    const onStart = vi.fn()
    render(<CourseDetailPage source="custom" courseId={42} api={api} onStart={onStart} />)
    expect(await screen.findByText('주말 산책길')).toBeInTheDocument()
    expect(screen.getByText('1.42km')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '구간 분석 보기' }))
    expect(screen.getByText(/2번 연결 구간 40.1℃/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: '대표 코스로 설정' }))
    await waitFor(() => expect(api.setRepresentative).toHaveBeenCalledWith('custom', 42, true))
    expect(screen.getByRole('switch', { name: '대표 코스로 설정' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: '이 코스로 산책 시작' }))
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ courseId: 42 }))
  })

  it('deletes only after confirmation', async () => {
    const api = apiFor()
    const onDeleted = vi.fn()
    render(<CourseDetailPage source="custom" courseId={42} api={api} onDeleted={onDeleted} />)
    await screen.findByText('주말 산책길')
    fireEvent.click(screen.getByRole('button', { name: '코스 삭제' }))
    expect(screen.getByRole('dialog', { name: '이 코스를 삭제할까요?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('custom', 42))
    expect(onDeleted).toHaveBeenCalledOnce()
  })

  it('labels shade as unavailable at night', async () => {
    const night = { ...dayCourse, metrics: { ...dayCourse.metrics!, shadeRatio: null, solarState: 'NIGHT' as const, shadeApplicable: false } }
    const nightDiagnostics: CourseDiagnostics = {
      ...diagnostics, referenceHour: 18, temperatureLayerBasis: 'H18_REFERENCE', solarState: 'NIGHT',
      shadeApplicable: false, shadeMessage: '일몰 후에는 그늘 지도를 제공하지 않아요.',
      segments: diagnostics.segments.map((segment) => ({
        ...segment, shadeRatio: null, treeShadeRatio: null, buildingShadeRatio: null,
      })),
    }
    render(<CourseDetailPage source="custom" courseId={42} api={apiFor(night, nightDiagnostics)} />)
    expect(await screen.findByText('야간·미산출')).toBeInTheDocument()
    expect(screen.queryByText('42%')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '구간 분석 보기' }))
    expect(screen.getByText(/일몰 후에는 그늘 지도를 제공하지 않아요/)).toBeInTheDocument()
  })

  it('groups multiple road links into the waypoint-to-waypoint connection shown to users', async () => {
    const groupedDiagnostics: CourseDiagnostics = {
      ...diagnostics,
      segments: [
        diagnostics.segments[0],
        { ...diagnostics.segments[1], sequence: 2, legSequence: 2, lengthM: 320 },
        {
          ...diagnostics.segments[1],
          sequence: 3,
          legSequence: 2,
          segmentId: 3,
          lengthM: 400,
          route: { type: 'LineString', coordinates: [[126.987, 37.567], [126.99, 37.57]] },
        },
      ],
    }
    render(<CourseDetailPage source="custom" courseId={42} api={apiFor(dayCourse, groupedDiagnostics)} />)
    await screen.findByText('주말 산책길')
    fireEvent.click(screen.getByRole('button', { name: '구간 분석 보기' }))

    expect(screen.getAllByRole('button', { name: /연결 구간 .*도/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /3번 연결 구간/ })).not.toBeInTheDocument()
    expect(screen.getByText(/내부 노면 2개 평균/)).toBeInTheDocument()
  })

  it('places the selected-temperature marker on the absolute 30–55 degree scale', async () => {
    const coolDiagnostics: CourseDiagnostics = {
      ...diagnostics,
      courseAverageSurfaceTempC: 33.8,
      segments: diagnostics.segments.map((segment, index) => ({
        ...segment,
        estimatedSurfaceTempC: index === 0 ? 33.0 : 34.5,
        temperatureGrade: 'LOW',
      })),
    }
    render(<CourseDetailPage source="custom" courseId={42} api={apiFor(dayCourse, coolDiagnostics)} />)
    await screen.findByText('주말 산책길')
    fireEvent.click(screen.getByRole('button', { name: '구간 분석 보기' }))

    expect(screen.getByLabelText('노면온도 색상 범례').querySelector('b')).toHaveStyle({ left: '18%' })
  })
})
