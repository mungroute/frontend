import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupRoomPage } from './GroupRoomPage'

describe('GroupRoomPage', () => {
  it('shows shared routes without exposing live member locations', () => {
    const onOpenSharedCourse = vi.fn()
    const onOpenActivity = vi.fn()
    render(<GroupRoomPage onOpenSharedCourse={onOpenSharedCourse} onOpenActivity={onOpenActivity} />)

    expect(screen.getByRole('heading', { name: '남산 댕댕이 산책단' })).toBeInTheDocument()
    expect(screen.getByText('멤버의 실시간 위치는 표시하지 않아요.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '그룹 공유 코스 지도' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '민지님이 공유한 남산 코스 보기' }))
    expect(onOpenSharedCourse).toHaveBeenCalledWith('namsan')
    fireEvent.click(screen.getByRole('button', { name: '그룹 활동 보기' }))
    expect(onOpenActivity).toHaveBeenCalledOnce()
  })

  it('selects a course to share from the share sheet', () => {
    const onShareCourse = vi.fn()
    render(<GroupRoomPage onShareCourse={onShareCourse} />)

    fireEvent.click(screen.getByRole('button', { name: '코스 공유하기' }))
    expect(screen.getByRole('dialog', { name: '코스 공유' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /한강 노을 산책/ }))
    fireEvent.click(screen.getByRole('button', { name: '선택한 코스 공유' }))
    expect(onShareCourse).toHaveBeenCalledWith('hangang')
  })
})
