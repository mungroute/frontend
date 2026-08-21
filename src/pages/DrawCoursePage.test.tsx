import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ConnectCourseResult, CourseDrawApi, CustomCourseResult, SnapCoursePointResult } from '../api/courses'
import { DrawCoursePage } from './DrawCoursePage'

const metrics = (lengthM: number) => ({
  lengthM,
  durationMin: Math.max(1, Math.round(lengthM / 40)),
  shadeRatio: 0.42,
  estimatedSurfaceTempC: 38.4,
  referenceHour: 15,
  weatherSource: 'SCENARIO' as const,
  basisDate: '2026-08-11',
  confidence: 'MEDIUM' as const,
  calculatedAt: '2026-08-15T06:00:00Z',
  solarState: 'DAYLIGHT' as const,
  solarElevationDeg: 57.2,
  shadeApplicable: true,
})

const snap = (nodeId: number, fallback = false): SnapCoursePointResult => ({
  snapStatus: fallback ? 'FALLBACK_APPLIED' : 'DIRECT',
  originalPointRejected: fallback,
  message: fallback ? '선택할 수 없는 위치라 가까운 산책로로 이동했어요.' : null,
  original: { lat: 37.56 + nodeId / 100_000, lon: 126.97 + nodeId / 100_000 },
  snapped: { lat: 37.561 + nodeId / 100_000, lon: 126.971 + nodeId / 100_000 },
  snapDistanceM: fallback ? 18.4 : 1.2,
  nodeId,
  segmentId: 800 + nodeId,
})

function createApi() {
  let snapIndex = 0
  let connectIndex = 0
  const api: CourseDrawApi = {
    snap: vi.fn().mockImplementation(async () => snap(++snapIndex)),
    connect: vi.fn().mockImplementation(async () => {
      const added = 900 + ++connectIndex
      return {
        addedSegmentIds: [added],
        segmentIds: Array.from({ length: connectIndex }, (_, index) => 901 + index),
        coordinates: [
          { lat: 37.56 + connectIndex / 10_000, lon: 126.97 },
          { lat: 37.561 + connectIndex / 10_000, lon: 126.971 },
        ],
        cumulative: metrics(connectIndex * 100),
      } satisfies ConnectCourseResult
    }),
    save: vi.fn().mockResolvedValue({
      courseId: 42,
      courseSource: 'custom',
      courseName: '나만의 산책길',
      loop: false,
      representative: false,
      metrics: metrics(100),
    } satisfies CustomCourseResult),
  }
  return api
}

describe('DrawCoursePage', () => {
  it('snaps, connects, saves, and returns the saved custom course', async () => {
    const api = createApi()
    const onSave = vi.fn()
    render(<DrawCoursePage api={api} onSave={onSave} />)

    const addPoint = screen.getByRole('button', { name: '지도에 지점 추가' })
    expect(screen.getByRole('button', { name: '지점을 2개 이상 추가해 주세요' })).toBeDisabled()

    fireEvent.click(addPoint, { clientX: 120, clientY: 240 })
    await waitFor(() => expect(screen.getByText('1/20개 지점')).toBeInTheDocument())
    fireEvent.click(addPoint, { clientX: 180, clientY: 280 })
    await waitFor(() => expect(screen.getByText('2/20개 지점')).toBeInTheDocument())
    expect(screen.getByText('0.10km')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '코스로 저장하기' }))
    const dialog = screen.getByRole('dialog', { name: '코스 저장하기' })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({
      courseName: '나만의 산책길',
      waypoints: expect.arrayContaining([expect.objectContaining({ nodeId: 1 }), expect.objectContaining({ nodeId: 2 })]),
      requestedAt: expect.any(String),
    })))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ courseId: 42, courseSource: 'custom' }))
  })

  it('undoes the last point together with its connected segments and cumulative metrics', async () => {
    const api = createApi()
    render(<DrawCoursePage api={api} />)
    const addPoint = screen.getByRole('button', { name: '지도에 지점 추가' })

    fireEvent.click(addPoint)
    await waitFor(() => expect(screen.getByText('1/20개 지점')).toBeInTheDocument())
    fireEvent.click(addPoint)
    await waitFor(() => expect(screen.getByText('0.10km')).toBeInTheDocument())
    fireEvent.click(addPoint)
    await waitFor(() => expect(screen.getByText('0.20km')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '마지막 지점 취소' }))

    expect(screen.getByText('2/20개 지점')).toBeInTheDocument()
    expect(screen.getByText('0.10km')).toBeInTheDocument()
    expect(screen.getByText('마지막 지점과 연결 구간을 취소했어요.')).toBeInTheDocument()
  })

  it('shows a rejection notice and automatically keeps the snapped walkway point', async () => {
    const api = createApi()
    vi.mocked(api.snap).mockResolvedValueOnce(snap(7, true))
    render(<DrawCoursePage api={api} />)

    fireEvent.click(screen.getByRole('button', { name: '지도에 지점 추가' }))

    expect(await screen.findByText('선택할 수 없는 위치라 가까운 산책로로 이동했어요.')).toBeInTheDocument()
    expect(screen.getByText('1/20개 지점')).toBeInTheDocument()
  })

  it('removes a fallback waypoint when the server detects a backtracking spur', async () => {
    const api = createApi()
    vi.mocked(api.snap)
      .mockResolvedValueOnce(snap(1))
      .mockResolvedValueOnce(snap(2, true))
      .mockResolvedValueOnce(snap(3))
    vi.mocked(api.connect)
      .mockResolvedValueOnce({
        addedSegmentIds: [901],
        segmentIds: [901],
        coordinates: [{ lat: 37.56, lon: 126.97 }, { lat: 37.561, lon: 126.971 }],
        cumulative: metrics(100),
        ignoredWaypointIndexes: [],
      })
      .mockResolvedValueOnce({
        addedSegmentIds: [902],
        segmentIds: [901, 902],
        coordinates: [{ lat: 37.56, lon: 126.97 }, { lat: 37.562, lon: 126.972 }],
        cumulative: metrics(180),
        ignoredWaypointIndexes: [1],
      })
    render(<DrawCoursePage api={api} />)

    const addPoint = screen.getByRole('button', { name: '지도에 지점 추가' })
    fireEvent.click(addPoint)
    await waitFor(() => expect(screen.getByText('1/20개 지점')).toBeInTheDocument())
    fireEvent.click(addPoint)
    await waitFor(() => expect(screen.getByText('2/20개 지점')).toBeInTheDocument())
    fireEvent.click(addPoint)

    expect(await screen.findByText('되돌아가는 자동 연결 구간을 제외하고 자연스럽게 이어졌어요.')).toBeInTheDocument()
    expect(screen.getByText('2/20개 지점')).toBeInTheDocument()
    expect(screen.getByText('0.18km')).toBeInTheDocument()
  })

  it('does not show a shade percentage after sunset', async () => {
    const api = createApi()
    vi.mocked(api.connect).mockResolvedValueOnce({
      addedSegmentIds: [901],
      segmentIds: [901],
      coordinates: [{ lat: 37.56, lon: 126.97 }, { lat: 37.561, lon: 126.971 }],
      cumulative: {
        ...metrics(100),
        shadeRatio: null,
        referenceHour: 18,
        weatherSource: 'SCENARIO_REFERENCE',
        solarState: 'NIGHT',
        solarElevationDeg: -18.2,
        shadeApplicable: false,
      },
    })
    render(<DrawCoursePage api={api} />)

    const addPoint = screen.getByRole('button', { name: '지도에 지점 추가' })
    fireEvent.click(addPoint)
    await waitFor(() => expect(screen.getByText('1/20개 지점')).toBeInTheDocument())
    fireEvent.click(addPoint)
    await waitFor(() => expect(screen.getByText('2/20개 지점')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '코스로 저장하기' }))

    expect(screen.getByText('햇빛 노출 없음')).toBeInTheDocument()
    expect(screen.getByText('18시 온도 참고값 · 일몰 후에는 그늘 비율을 표시하지 않아요.')).toBeInTheDocument()
    expect(screen.queryByText('42%')).not.toBeInTheDocument()
  })
})
