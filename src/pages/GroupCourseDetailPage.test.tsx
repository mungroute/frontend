import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GroupDetail, GroupSharedCourse } from '../api/groups'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { GroupCourseDetailPage } from './GroupCourseDetailPage'

const firstRoute = { type: 'LineString' as const, coordinates: [[126.98, 37.55], [126.981, 37.551]] }
const secondRoute = { type: 'LineString' as const, coordinates: [[127.01, 37.57], [127.03, 37.59], [127.04, 37.575]] }

const sharedCourse = (sharedCourseId: number, name: string, route: typeof firstRoute | typeof secondRoute): GroupSharedCourse => ({
  sharedCourseId,
  groupId: 10,
  sharedByUserId: 2,
  sharerNickname: '민지',
  saveCount: 1,
  sharedAt: '2026-08-18T12:00:00+09:00',
  course: {
    courseSource: 'custom',
    courseId: sharedCourseId,
    courseName: name,
    loop: false,
    representative: false,
    createdAt: '2026-08-18T10:00:00+09:00',
    segmentIds: [1],
    route,
    metrics: null,
  },
})

const group: GroupDetail = {
  groupId: 10,
  name: '남산 산책',
  description: '같이 걸어요',
  visibility: 'PRIVATE',
  joinPolicy: 'INVITE_ONLY',
  myRole: 'MEMBER',
  memberCount: 1,
  sharedCourseCount: 2,
  latestActivityAt: '2026-08-18T12:00:00+09:00',
  createdAt: '2026-08-18T09:00:00+09:00',
  recentCourses: [],
  members: [],
}

describe('GroupCourseDetailPage', () => {
  it('fits the map to the full route of each selected shared course', async () => {
    const first = sharedCourse(31, '대표 코스', firstRoute)
    const second = sharedCourse(32, '나만의 산책길', secondRoute)
    const api = {
      sharedCourse: vi.fn(async (_groupId: number, sharedCourseId: number) => sharedCourseId === 31 ? first : second),
      detail: vi.fn().mockResolvedValue(group),
      saveSharedCourse: vi.fn(),
      unshareCourse: vi.fn(),
    }
    const instance = { ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() }
    const adapter: BaseMapAdapter = { mount: vi.fn(() => instance) }
    const mapScene: BaseMapScene = { center: { latitude: 37.55, longitude: 126.98 }, zoom: 18 }
    const view = render(<GroupCourseDetailPage groupId={10} sharedCourseId={31} api={api} map={{ adapter, scene: mapScene }} />)

    expect(await screen.findByRole('heading', { name: '대표 코스' })).toBeInTheDocument()
    await waitFor(() => expect(adapter.mount).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      viewFit: {
        coordinates: [
          { latitude: 37.55, longitude: 126.98 },
          { latitude: 37.551, longitude: 126.981 },
        ],
        padding: [36, 24, 36, 24],
        maxZoom: 17,
      },
    })))

    instance.update.mockClear()
    view.rerender(<GroupCourseDetailPage groupId={10} sharedCourseId={32} api={api} map={{ adapter, scene: mapScene }} />)

    expect(await screen.findByRole('heading', { name: '나만의 산책길' })).toBeInTheDocument()
    await waitFor(() => expect(instance.update).toHaveBeenCalledWith(expect.objectContaining({
      viewFit: {
        coordinates: [
          { latitude: 37.57, longitude: 127.01 },
          { latitude: 37.59, longitude: 127.03 },
          { latitude: 37.575, longitude: 127.04 },
        ],
        padding: [36, 24, 36, 24],
        maxZoom: 17,
      },
    })))
  })
})
