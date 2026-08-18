import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupActivityPage } from './GroupActivityPage'

describe('GroupActivityPage', () => {
  it('shows the group activity feed in API order', async () => {
    const api = { activities: vi.fn().mockResolvedValue([
      { activityId: 2, actorUserId: 3, actorNickname: '민지', actorProfileImageUrl: null, activityType: 'COURSE_SHARED', subject: '남산 코스', message: '새 코스를 공유했어요', createdAt: '2026-08-18T12:00:00+09:00' },
      { activityId: 1, actorUserId: 4, actorNickname: '하늘', actorProfileImageUrl: null, activityType: 'COURSE_SAVED', subject: '한강 노을 산책', message: '한강 노을 산책을 저장했어요', createdAt: '2026-08-18T11:00:00+09:00' },
    ]) }
    render(<GroupActivityPage groupId={10} groupName="남산 댕댕이 산책단" api={api} />)

    expect(screen.getByRole('heading', { name: '그룹 활동' })).toBeInTheDocument()
    expect(screen.getByText('남산 댕댕이 산책단')).toBeInTheDocument()
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('민지')
    expect(items[0]).toHaveTextContent('새 코스를 공유했어요')
    expect(items[1]).toHaveTextContent('한강 노을 산책을 저장했어요')
  })
})
