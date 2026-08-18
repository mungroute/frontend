import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CourseCatalogApi, CourseSummary } from '../api/courses'
import type { GroupApi, GroupDetail, GroupSharedCourse } from '../api/groups'
import { GroupRoomPage, groupRouteColorForUser } from './GroupRoomPage'

const route = { type: 'LineString' as const, coordinates: [[126.98, 37.55], [126.981, 37.551]] }
const shared: GroupSharedCourse = {
  sharedCourseId: 31, groupId: 10, sharedByUserId: 2, sharerNickname: '민지', saveCount: 1, sharedAt: '2026-08-18T12:00:00+09:00',
  course: { courseSource: 'custom', courseId: 8, courseName: '남산 코스', loop: false, representative: false, createdAt: '2026-08-18T10:00:00+09:00', segmentIds: [1], route, metrics: null },
}
const detail: GroupDetail = {
  groupId: 10, name: '남산 댕댕이 산책단', description: '같이 걸어요', visibility: 'PRIVATE', joinPolicy: 'INVITE_ONLY', myRole: 'MEMBER', memberCount: 2, sharedCourseCount: 1,
  latestActivityAt: '2026-08-18T12:00:00+09:00', createdAt: '2026-08-18T09:00:00+09:00', recentCourses: [shared],
  members: [{ userId: 2, nickname: '민지', profileImageUrl: null, role: 'OWNER', joinedAt: '2026-08-18T09:00:00+09:00' }],
}

const apiWith = (extra: Partial<GroupApi> = {}) => ({ detail: vi.fn().mockResolvedValue(detail), ...extra }) as GroupApi

describe('GroupRoomPage', () => {
  it('assigns a stable route color per sharing user', () => {
    expect(groupRouteColorForUser(2)).toBe(groupRouteColorForUser(2))
    expect(groupRouteColorForUser(2)).not.toBe(groupRouteColorForUser(3))
  })

  it('shows shared routes without exposing live member locations', async () => {
    const onOpenSharedCourse = vi.fn()
    const onOpenActivity = vi.fn()
    render(<GroupRoomPage groupId={10} api={apiWith()} onOpenSharedCourse={onOpenSharedCourse} onOpenActivity={onOpenActivity} />)

    expect(await screen.findByRole('heading', { name: '남산 댕댕이 산책단' })).toBeInTheDocument()
    expect(screen.getByText('멤버의 실시간 위치는 표시하지 않아요.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '그룹 공유 코스 지도' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '남산 코스 보기' }))
    expect(onOpenSharedCourse).toHaveBeenCalledWith(31)
    fireEvent.click(screen.getByRole('button', { name: '그룹 활동 보기' }))
    expect(onOpenActivity).toHaveBeenCalledOnce()
  })

  it('shows a read-only member list instead of management to a regular member', async () => {
    render(<GroupRoomPage groupId={10} api={apiWith()} />)

    const memberButton = await screen.findByRole('button', { name: '멤버' })
    expect(screen.queryByRole('button', { name: '관리' })).not.toBeInTheDocument()
    fireEvent.click(memberButton)

    expect(screen.getByRole('heading', { name: '멤버 목록' })).toBeInTheDocument()
    expect(screen.getByText('민지')).toBeInTheDocument()
    expect(screen.getByText('방장')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '그룹 이름' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '그룹 탈퇴' })).toBeInTheDocument()
  })

  it('confirms leaving through the MungRoute dialog', async () => {
    const leave = vi.fn().mockResolvedValue(undefined)
    const onClosed = vi.fn()
    render(<GroupRoomPage groupId={10} api={apiWith({ leave })} onClosed={onClosed} />)

    fireEvent.click(await screen.findByRole('button', { name: '멤버' }))
    fireEvent.click(screen.getByRole('button', { name: '그룹 탈퇴' }))

    const dialog = screen.getByRole('dialog', { name: '그룹 탈퇴 확인' })
    expect(within(dialog).getByRole('heading', { name: '그룹에서 탈퇴할까요?' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '그룹 탈퇴' }))
    await waitFor(() => expect(leave).toHaveBeenCalledWith(10))
    expect(onClosed).toHaveBeenCalledOnce()
  })

  it('lets only the owner confirm member removal and group deletion', async () => {
    const ownerDetail: GroupDetail = {
      ...detail,
      myRole: 'OWNER',
      members: [
        { userId: 2, nickname: '민지', profileImageUrl: null, role: 'OWNER', joinedAt: '2026-08-18T09:00:00+09:00' },
        { userId: 3, nickname: '쿠키 보호자', profileImageUrl: null, role: 'MEMBER', joinedAt: '2026-08-18T10:00:00+09:00' },
      ],
    }
    const removeMember = vi.fn().mockResolvedValue(undefined)
    const deleteGroup = vi.fn().mockResolvedValue(undefined)
    const onClosed = vi.fn()
    const api = apiWith({ detail: vi.fn().mockResolvedValue(ownerDetail), removeMember, delete: deleteGroup })
    render(<GroupRoomPage groupId={10} api={api} onClosed={onClosed} />)

    fireEvent.click(await screen.findByRole('button', { name: '관리' }))
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
    const removalDialog = screen.getByRole('dialog', { name: '멤버 내보내기 확인' })
    expect(within(removalDialog).getByRole('heading', { name: '쿠키 보호자님을 내보낼까요?' })).toBeInTheDocument()
    fireEvent.click(within(removalDialog).getByRole('button', { name: '내보내기' }))
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith(10, 3))

    fireEvent.click(screen.getByRole('button', { name: '그룹 삭제' }))
    const deleteDialog = screen.getByRole('dialog', { name: '그룹 삭제 확인' })
    fireEvent.click(within(deleteDialog).getByRole('button', { name: '그룹 삭제' }))
    await waitFor(() => expect(deleteGroup).toHaveBeenCalledWith(10))
    expect(onClosed).toHaveBeenCalledOnce()
  })

  it('asks the owner to confirm before saving group information', async () => {
    const ownerDetail: GroupDetail = { ...detail, myRole: 'OWNER' }
    const update = vi.fn().mockResolvedValue(ownerDetail)
    const api = apiWith({ detail: vi.fn().mockResolvedValue(ownerDetail), update })
    render(<GroupRoomPage groupId={10} api={api} />)

    fireEvent.click(await screen.findByRole('button', { name: '관리' }))
    fireEvent.click(screen.getByRole('button', { name: '그룹 정보 저장' }))

    expect(update).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: '그룹 정보 저장 확인' })
    expect(within(dialog).getByRole('heading', { name: '변경 내용을 저장할까요?' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '변경 저장' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(10, {
      name: '남산 댕댕이 산책단',
      description: '같이 걸어요',
      visibility: 'PRIVATE',
      joinPolicy: 'INVITE_ONLY',
    }))
  })

  it('selects a real course to share from the share sheet', async () => {
    const shareCourse = vi.fn().mockResolvedValue(shared)
    const course: CourseSummary = { courseSource: 'custom', courseId: 8, courseName: '한강 노을 산책', lengthM: 1800, durationMin: 25, loop: false, representative: false, createdAt: '2026-08-18T10:00:00+09:00', metrics: null }
    const courseApi = { list: vi.fn().mockResolvedValue([course]) } as Pick<CourseCatalogApi, 'list'>
    render(<GroupRoomPage groupId={10} api={apiWith({ shareCourse })} courseApi={courseApi} />)

    fireEvent.click(await screen.findByRole('button', { name: '코스 공유하기' }))
    expect(await screen.findByRole('dialog', { name: '코스 공유' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /한강 노을 산책/ }))
    fireEvent.click(screen.getByRole('button', { name: '선택한 코스 공유' }))
    await waitFor(() => expect(shareCourse).toHaveBeenCalledWith(10, 'custom', 8))
  })
})
