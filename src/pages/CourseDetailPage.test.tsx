import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CourseDetailPage } from './CourseDetailPage'

describe('CourseDetailPage', () => {
  it('updates the representative setting and exposes course actions', () => {
    const onStart = vi.fn()
    const onShare = vi.fn()
    render(<CourseDetailPage onStart={onStart} onShare={onShare} />)

    expect(screen.getByRole('heading', { name: '코스 상세' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '저녁 남산길 상세 지도' })).toBeInTheDocument()
    expect(screen.getByText('68%')).toBeInTheDocument()

    const representative = screen.getByRole('switch', { name: '대표 코스로 설정' })
    expect(representative).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(representative)
    expect(representative).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(screen.getByRole('button', { name: '이 코스로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '공유하기' }))
    fireEvent.click(screen.getByRole('button', { name: '선택한 코스 공유' }))
    expect(onStart).toHaveBeenCalledOnce()
    expect(onShare).toHaveBeenCalledWith('namsan')
  })
})
