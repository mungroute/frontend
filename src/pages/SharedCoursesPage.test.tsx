import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SharedCoursesPage } from './SharedCoursesPage'

describe('SharedCoursesPage', () => {
  it('switches shared course filters', () => {
    render(<SharedCoursesPage />)

    expect(screen.getByRole('heading', { name: '공유 코스' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)

    const shortFilter = screen.getByRole('button', { name: '짧은 코스' })
    fireEvent.click(shortFilter)
    expect(shortFilter).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByText('조용한 공원길')).toBeInTheDocument()
  })
})
