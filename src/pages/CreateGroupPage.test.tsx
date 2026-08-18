import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreateGroupPage } from './CreateGroupPage'

describe('CreateGroupPage', () => {
  it('submits the entered group information', () => {
    const onCreate = vi.fn()
    render(<CreateGroupPage onCreate={onCreate} />)

    expect(screen.queryByText('공유 코스 공개 범위')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('그룹 이름'), { target: { value: '남산 댕댕이 산책단' } })
    fireEvent.change(screen.getByLabelText('그룹 소개'), { target: { value: '평일 저녁에 함께 걸어요.' } })
    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))

    expect(onCreate).toHaveBeenCalledWith({ name: '남산 댕댕이 산책단', description: '평일 저녁에 함께 걸어요.', visibility: 'PRIVATE', joinPolicy: 'INVITE_ONLY' })
  })

  it('lets an owner create a public group with open joining', () => {
    const onCreate = vi.fn()
    render(<CreateGroupPage onCreate={onCreate} />)

    fireEvent.change(screen.getByLabelText('그룹 이름'), { target: { value: '열린 산책단' } })
    fireEvent.click(screen.getByRole('button', { name: /공개그룹 탐색에 표시/ }))
    fireEvent.click(screen.getByRole('button', { name: '누구나 바로 참여' }))
    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'PUBLIC', joinPolicy: 'OPEN' }))
  })
})
