import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CourseCatalogApi, CourseDetail, CourseSummary } from '../api/courses'
import { MyCoursesPage } from './MyCoursesPage'

const metrics = {
  lengthM: 1800, durationMin: 45, shadeRatio: 0.68, estimatedSurfaceTempC: 34,
  referenceHour: 15, weatherSource: 'SCENARIO' as const, basisDate: '2026-08-11',
  confidence: 'MEDIUM' as const, calculatedAt: '2026-08-15T06:00:00Z',
  solarState: 'DAYLIGHT' as const, solarElevationDeg: 45, shadeApplicable: true,
}
const courses: CourseSummary[] = [
  { courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', lengthM: 1800, durationMin: 45, loop: false, representative: true, createdAt: '2026-08-15T00:00:00Z', metrics },
  { courseSource: 'walk', courseId: 27, courseName: '아침 산책 기록', lengthM: 900, durationMin: 23, loop: false, representative: false, createdAt: '2026-08-14T00:00:00Z', metrics: { ...metrics, lengthM: 900, durationMin: 23, shadeRatio: 0.3 } },
]
const detail: CourseDetail = { ...courses[0], segmentIds: [1], route: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] } }
const api = {
  list: vi.fn(async () => courses), detail: vi.fn(async () => detail),
  setRepresentative: vi.fn(), delete: vi.fn(), comparison: vi.fn(),
} as unknown as CourseCatalogApi

describe('MyCoursesPage', () => {
  it('loads, filters, and opens a course using its source and id', async () => {
    const onOpenCourse = vi.fn()
    render(<MyCoursesPage api={api} onOpenCourse={onOpenCourse} />)
    expect(await screen.findByText('저녁 남산길')).toBeInTheDocument()
    expect(screen.getByText('아침 산책 기록')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '대표' }))
    expect(screen.queryByText('아침 산책 기록')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /저녁 남산길/ }))
    expect(onOpenCourse).toHaveBeenCalledWith('custom', 42)
    expect(screen.queryByRole('region', { name: '저장 코스 지도' })).not.toBeInTheDocument()
  })

  it('opens the direct course drawing flow', () => {
    const onOpenDrawCourse = vi.fn()
    render(<MyCoursesPage api={api} onOpenDrawCourse={onOpenDrawCourse} />)
    fireEvent.click(screen.getByRole('button', { name: '직접 코스 그리기' }))
    expect(onOpenDrawCourse).toHaveBeenCalledOnce()
  })
})
