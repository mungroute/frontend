import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MyCoursesPage } from './MyCoursesPage'

describe('MyCoursesPage', () => {
  it('filters saved routes and opens the selected course', () => {
    const onOpenCourse = vi.fn()
    render(<MyCoursesPage onOpenCourse={onOpenCourse} />)

    expect(screen.getByRole('heading', { name: '내 코스' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '추천 그늘 시간' })).toBeInTheDocument()
    expect(screen.getByText('이 시간에 걸으면 코스의 그늘을 가장 많이 이용할 수 있어요.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '저녁 남산길 지도' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '코스' })).toHaveAttribute('aria-current', 'page')

    const representativeFilter = screen.getByRole('button', { name: '대표' })
    fireEvent.click(representativeFilter)
    expect(representativeFilter).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /저녁 남산길/ }))
    expect(onOpenCourse).toHaveBeenCalledOnce()
  })

  it('opens the direct course drawing flow', () => {
    const onOpenDrawCourse = vi.fn()
    render(<MyCoursesPage onOpenDrawCourse={onOpenDrawCourse} />)

    fireEvent.click(screen.getByRole('button', { name: '직접 코스 그리기' }))
    expect(onOpenDrawCourse).toHaveBeenCalledOnce()
  })
})
