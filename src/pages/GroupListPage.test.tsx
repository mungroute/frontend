import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupListPage } from './GroupListPage'

describe('GroupListPage', () => {
  it('opens group creation and a selected group', async () => {
    const onCreateGroup = vi.fn()
    const onOpenGroup = vi.fn()
    const api = { list: vi.fn().mockResolvedValue([{ groupId: 10, name: '남산 댕댕이 산책단', description: '같이 걸어요', visibility: 'PRIVATE', joinPolicy: 'INVITE_ONLY', myRole: 'MEMBER', memberCount: 3, sharedCourseCount: 2, latestActivityAt: null, createdAt: '2026-08-18T09:00:00+09:00' }]), discover: vi.fn().mockResolvedValue([]), joinOpen: vi.fn(), shareCourse: vi.fn() }
    render(<GroupListPage api={api} onCreateGroup={onCreateGroup} onOpenGroup={onOpenGroup} />)

    expect(screen.getByRole('heading', { name: '그룹' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '그룹' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))
    fireEvent.click(await screen.findByRole('button', { name: /남산 댕댕이 산책단/ }))
    expect(onCreateGroup).toHaveBeenCalledOnce()
    expect(onOpenGroup).toHaveBeenCalledWith(10)
  })

  it('joins a public open group without an invitation code', async () => {
    const onOpenGroup = vi.fn()
    const publicGroup = { groupId: 20, name: '열린 산책단', description: '누구나 환영', visibility: 'PUBLIC' as const, joinPolicy: 'OPEN' as const, myRole: null, memberCount: 5, sharedCourseCount: 1, latestActivityAt: null, createdAt: '2026-08-18T09:00:00+09:00' }
    const api = { list: vi.fn().mockResolvedValue([]), discover: vi.fn().mockResolvedValue([publicGroup]), joinOpen: vi.fn().mockResolvedValue({ ...publicGroup, myRole: 'MEMBER' }), shareCourse: vi.fn() }
    render(<GroupListPage api={api} onOpenGroup={onOpenGroup} />)

    fireEvent.click(await screen.findByRole('button', { name: /열린 산책단/ }))

    expect(api.joinOpen).toHaveBeenCalledWith(20)
    await waitFor(() => expect(onOpenGroup).toHaveBeenCalledWith(20))
  })
})
