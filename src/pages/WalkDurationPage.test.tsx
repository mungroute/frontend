import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalkDurationPage } from './WalkDurationPage'

describe('WalkDurationPage', () => {
  it('starts from 30 minutes and updates the course action in five-minute steps', () => {
    render(<WalkDurationPage />)

    const picker = screen.getByRole('spinbutton', { name: '목표 산책 시간' })
    expect(picker).toHaveAttribute('aria-valuenow', '30')
    expect(screen.getByRole('button', { name: '30분 코스 보기' })).toBeInTheDocument()

    fireEvent.keyDown(picker, { key: 'ArrowDown' })

    expect(picker).toHaveAttribute('aria-valuenow', '35')
    expect(screen.getByRole('button', { name: '35분 코스 보기' })).toBeInTheDocument()
  })

  it('selects a visible duration when it is clicked', () => {
    render(<WalkDurationPage initialDuration={10} />)

    fireEvent.click(screen.getByText('15분'))

    expect(screen.getByRole('spinbutton', { name: '목표 산책 시간' })).toHaveAttribute('aria-valuenow', '15')
    expect(screen.getByRole('button', { name: '15분 코스 보기' })).toBeInTheDocument()
  })

  it('submits the selected duration and exposes departure-time selection', () => {
    const onContinue = vi.fn()
    const onSelectDepartureTime = vi.fn()
    render(<WalkDurationPage onContinue={onContinue} onSelectDepartureTime={onSelectDepartureTime} />)

    fireEvent.click(screen.getByRole('button', { name: '시간 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '30분 코스 보기' }))

    expect(onSelectDepartureTime).toHaveBeenCalledOnce()
    expect(onContinue).toHaveBeenCalledWith(30)
  })

  it('opens a departure-time dialog and applies the confirmed time', () => {
    render(<WalkDurationPage />)

    fireEvent.click(screen.getByRole('button', { name: '시간 선택' }))
    expect(screen.getByRole('dialog', { name: '출발 시간 선택' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '오후 선택' }))
    fireEvent.change(screen.getByLabelText('출발 시'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('출발 분'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: '선택 완료' }))

    expect(screen.queryByRole('dialog', { name: '출발 시간 선택' })).not.toBeInTheDocument()
    expect(screen.getByText('15:30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시간 변경' })).toBeInTheDocument()
  })
})
