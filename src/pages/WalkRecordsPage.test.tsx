import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalkRecordsPage } from './WalkRecordsPage'

describe('WalkRecordsPage', () => {
  it('switches month filters and opens a walk record', () => {
    const onOpenRecord = vi.fn()
    render(<WalkRecordsPage onOpenRecord={onOpenRecord} />)

    expect(screen.getByRole('heading', { name: '산책 기록' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '기록' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('button', { name: /산책/ })).toHaveLength(3)

    const julyFilter = screen.getByRole('button', { name: '7월' })
    fireEvent.click(screen.getByRole('button', { name: /8월 7일 저녁 산책/ }))
    expect(onOpenRecord).toHaveBeenCalledWith('august-7-evening')

    fireEvent.click(julyFilter)
    expect(julyFilter).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('7월 산책 기록이 아직 없어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /8월 7일 저녁 산책/ })).not.toBeInTheDocument()
  })
})
