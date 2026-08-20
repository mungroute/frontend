import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GroupSharedCourse } from '../api/groups'
import type { GroupCourseEvent, GroupCourseSocketConnector } from '../api/groupCourseSocket'
import { SharedCoursesPage } from './SharedCoursesPage'

const course: GroupSharedCourse = {
  sharedCourseId: 4, groupId: 10, sharedByUserId: 2, sharerNickname: '민지', saveCount: 2, sharedAt: '2026-08-18T12:00:00+09:00',
  course: { courseSource: 'custom', courseId: 9, courseName: '조용한 공원길', loop: false, representative: false, createdAt: '2026-08-18T10:00:00+09:00', segmentIds: [1], route: { type: 'LineString', coordinates: [[126.98, 37.55], [126.981, 37.551]] }, metrics: null },
}

describe('SharedCoursesPage', () => {
  it('loads again when a shared course sort is selected', async () => {
    const api = { courses: vi.fn().mockResolvedValue([course]) }
    render(<SharedCoursesPage groupId={10} api={api} />)

    expect(screen.getByRole('heading', { name: '공유 코스' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '조용한 공원길 상세 보기' })).toBeInTheDocument()

    const shortFilter = screen.getByRole('button', { name: '짧은 코스' })
    fireEvent.click(shortFilter)
    expect(shortFilter).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(api.courses).toHaveBeenLastCalledWith(10, 'shortest'))
  })

  it('refreshes the list when a realtime course event arrives', async () => {
    const realtimeCourse = {
      ...course,
      sharedCourseId: 5,
      course: { ...course.course, courseId: 10, courseName: '방금 공유한 코스' },
    }
    const courses = vi.fn().mockResolvedValueOnce([course]).mockResolvedValueOnce([realtimeCourse, course])
    let receiveEvent: ((event: GroupCourseEvent) => void) | undefined
    const connectCourseEvents: GroupCourseSocketConnector = vi.fn((options) => {
      receiveEvent = options.onEvent
      return { close: vi.fn() }
    })

    render(<SharedCoursesPage groupId={10} api={{ courses }} connectCourseEvents={connectCourseEvents} />)
    await screen.findByRole('button', { name: '조용한 공원길 상세 보기' })

    act(() => receiveEvent?.({ groupId: 10, type: 'COURSE_SHARED', sharedCourseId: 5 }))

    expect(await screen.findByRole('button', { name: '방금 공유한 코스 상세 보기' })).toBeInTheDocument()
    expect(courses).toHaveBeenCalledTimes(2)
  })
})
