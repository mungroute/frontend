import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DrawCoursePage } from './DrawCoursePage'

describe('DrawCoursePage', () => {
  it('adds a map point and saves the edited course', () => {
    const onSave = vi.fn()
    render(<DrawCoursePage onSave={onSave} />)

    expect(screen.getByText('0개 지점')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '지도에 지점 추가' }), { clientX: 120, clientY: 240 })
    expect(screen.getByText('1개 지점')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '코스로 저장하기' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ pointCount: 1 }))
  })
})
