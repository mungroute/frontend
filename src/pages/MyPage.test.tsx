import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GroupSummary } from '../api/groups'
import { MyPage } from './MyPage'

const group = (groupId: number): GroupSummary => ({
  groupId,
  name: `테스트 그룹 ${groupId}`,
  description: '같이 걸어요',
  visibility: 'PUBLIC',
  joinPolicy: 'OPEN',
  myRole: 'MEMBER',
  memberCount: 3,
  sharedCourseCount: 0,
  latestActivityAt: null,
  createdAt: '2026-08-24T00:00:00Z',
})

const emptyGroupApi = () => ({ list: vi.fn().mockResolvedValue([]) })

describe('MyPage', () => {
  it('shows the saved profile and opens dog management', () => {
    const onOpenDogs = vi.fn()
    const onOpenGroups = vi.fn()
    render(<MyPage api={emptyGroupApi()} onOpenDogs={onOpenDogs} onOpenGroups={onOpenGroups} profileImageSrc="/registered/mango.jpg" />)

    expect(screen.getByRole('heading', { name: '마이' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '망고 프로필' })).toHaveAttribute('src', '/registered/mango.jpg')
    expect(screen.getByRole('link', { name: '마이' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: /반려견 관리/ }))
    expect(onOpenDogs).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /그룹 관리/ }))
    expect(onOpenGroups).toHaveBeenCalledOnce()
  })

  it('opens walk statistics from the summary row', () => {
    const onOpenStats = vi.fn()
    render(<MyPage api={emptyGroupApi()} onOpenStats={onOpenStats} walkStatisticsDescription="이번 달 3회 · 4.2km" />)

    expect(screen.getByText('이번 달 3회 · 4.2km')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /산책 통계/ }))
    expect(onOpenStats).toHaveBeenCalledOnce()
  })

  it('keeps the welcome copy and logout action in the page header', () => {
    const onLogout = vi.fn()
    render(<MyPage api={emptyGroupApi()} userNickname="aaaa" onLogout={onLogout} />)

    expect(screen.getByText('aaaa님')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('shows the number of groups returned for the current member', async () => {
    const api = { list: vi.fn().mockResolvedValue([group(1), group(2), group(3)]) }

    render(<MyPage api={api} />)

    expect(screen.getByText('참여 중인 그룹 확인 중')).toBeInTheDocument()
    expect(await screen.findByText('참여 중인 그룹 3개')).toBeInTheDocument()
    expect(api.list).toHaveBeenCalledOnce()
  })

  it('does not show a fabricated count when the member has no groups', async () => {
    const api = emptyGroupApi()

    render(<MyPage api={api} />)

    expect(await screen.findByText('참여 중인 그룹 없음')).toBeInTheDocument()
    expect(screen.queryByText('참여 중인 그룹 2개')).not.toBeInTheDocument()
  })

  it('shows an honest fallback when the group request fails', async () => {
    const api = { list: vi.fn().mockRejectedValue(new Error('network unavailable')) }

    render(<MyPage api={api} />)

    expect(await screen.findByText('그룹 수를 불러오지 못했어요')).toBeInTheDocument()
  })
})
