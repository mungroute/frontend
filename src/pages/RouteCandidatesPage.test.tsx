import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteCandidatesPage } from './RouteCandidatesPage'

describe('RouteCandidatesPage', () => {
  it('shows both candidate routes with the first route selected', () => {
    render(<RouteCandidatesPage />)

    expect(screen.getByRole('heading', { name: '30분 안에 걸을 수 있는 코스예요' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /남산 둘레길 A/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /장충단 공원길 B/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('두 코스 모두 목표 시간에 맞아요')).toBeInTheDocument()
  })

  it('changes the selected route and confirms it', () => {
    const onConfirm = vi.fn()
    render(<RouteCandidatesPage onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: /장충단 공원길 B/ }))
    expect(screen.getByRole('button', { name: /장충단 공원길 B/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '이 코스로 선택' }))
    expect(onConfirm).toHaveBeenCalledWith('jangchung-park-b')
  })
})
