import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteComparisonPage } from './RouteComparisonPage'

describe('RouteComparisonPage', () => {
  it('starts the recommended alternative or the usual route', () => {
    const onStartAlternative = vi.fn()
    const onStartUsual = vi.fn()
    render(<RouteComparisonPage onStartAlternative={onStartAlternative} onStartUsual={onStartUsual} />)

    expect(screen.getByRole('heading', { name: '오늘은 이 구간만 바꿔볼까요?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /오늘의 추천 대안/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /나의 평소 코스/ }))
    expect(screen.getByRole('button', { name: /나의 평소 코스/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /오늘의 추천 대안/ }))

    fireEvent.click(screen.getByRole('button', { name: '대안 코스로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '평소 코스로 시작' }))

    expect(onStartAlternative).toHaveBeenCalledOnce()
    expect(onStartUsual).toHaveBeenCalledOnce()
  })
})
