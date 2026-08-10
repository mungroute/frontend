import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalkStatisticsPage } from './WalkStatisticsPage'

describe('WalkStatisticsPage', () => {
  it('shows the monthly summary, weekly distances, and favorite course', () => {
    render(<WalkStatisticsPage onOpenRecords={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '산책 통계' })).toBeInTheDocument()
    expect(screen.getByText('18.7 km')).toBeInTheDocument()
    expect(screen.getByText('12회 · 5시간 18분')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '요일별 주간 거리' })).toBeInTheDocument()
    expect(screen.getByText('저녁 남산길')).toBeInTheDocument()
  })

  it('opens all walk records from the secondary action', () => {
    const onOpenRecords = vi.fn()
    render(<WalkStatisticsPage onOpenRecords={onOpenRecords} />)

    fireEvent.click(screen.getByRole('button', { name: '기록 전체 보기' }))
    expect(onOpenRecords).toHaveBeenCalledOnce()
  })
})
