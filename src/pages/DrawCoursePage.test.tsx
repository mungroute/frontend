import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DrawCoursePage } from './DrawCoursePage'

describe('DrawCoursePage', () => {
  it('requires two points, supports undo, and saves the edited course', () => {
    const onSave = vi.fn()
    render(<DrawCoursePage onSave={onSave} />)

    const addPoint = screen.getByRole('button', { name: '지도에 지점 추가' })
    const undo = screen.getByRole('button', { name: '마지막 지점 취소' })
    expect(screen.getByText('0/20개 지점')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '지점을 2개 이상 추가해 주세요' })).toBeDisabled()
    fireEvent.click(addPoint, { clientX: 120, clientY: 240 })
    expect(screen.getByText('1/20개 지점')).toBeInTheDocument()
    fireEvent.click(undo)
    expect(screen.getByText('0/20개 지점')).toBeInTheDocument()
    fireEvent.click(addPoint, { clientX: 120, clientY: 240 })
    fireEvent.click(addPoint, { clientX: 180, clientY: 280 })
    fireEvent.click(screen.getByRole('button', { name: '코스로 저장하기' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ pointCount: 2 }))
  })

  it('limits a course to twenty points', () => {
    render(<DrawCoursePage />)
    const addPoint = screen.getByRole('button', { name: '지도에 지점 추가' })

    for (let index = 0; index < 21; index += 1) fireEvent.click(addPoint)

    expect(screen.getByText('20/20개 지점')).toBeInTheDocument()
    expect(screen.getByText('최대 20개 지점까지 추가할 수 있어요.')).toBeInTheDocument()
  })
})
