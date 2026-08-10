import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalkRecordDetailPage } from './WalkRecordDetailPage'

describe('WalkRecordDetailPage', () => {
  it('shows the recorded route and opens its detail rows', () => {
    const onOpenDistanceAlerts = vi.fn()
    const onOpenDogs = vi.fn()
    render(<WalkRecordDetailPage onOpenDistanceAlerts={onOpenDistanceAlerts} onOpenDogs={onOpenDogs} />)

    expect(screen.getByRole('heading', { name: '산책 기록 상세' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '8월 7일 산책 경로 지도' })).toBeInTheDocument()
    expect(screen.getByText('3,246')).toBeInTheDocument()

    const representative = screen.getByRole('switch', { name: '대표 코스로 설정' })
    expect(representative).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(representative)
    expect(representative).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(screen.getByRole('button', { name: /거리두기 알림/ }))
    fireEvent.click(screen.getByRole('button', { name: /함께한 반려견/ }))
    expect(onOpenDistanceAlerts).toHaveBeenCalledOnce()
    expect(onOpenDogs).toHaveBeenCalledOnce()
  })

  it('opens the more sheet and confirms record deletion', () => {
    const onDelete = vi.fn()
    render(<WalkRecordDetailPage onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: '기록 더보기' }))
    expect(screen.getByRole('dialog', { name: '기록 더보기' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /산책 기록 삭제/ }))
    const deleteDialog = screen.getByRole('dialog', { name: '기록 삭제 확인' })
    expect(deleteDialog).toBeInTheDocument()
    fireEvent.click(within(deleteDialog).getByRole('button', { name: '삭제' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('opens course sharing from the record more sheet', () => {
    render(<WalkRecordDetailPage />)

    fireEvent.click(screen.getByRole('button', { name: '기록 더보기' }))
    fireEvent.click(screen.getByRole('button', { name: '그룹에 코스 공유' }))

    const shareDialog = screen.getByRole('dialog', { name: '코스 공유' })
    expect(shareDialog).toBeInTheDocument()
    fireEvent.click(within(shareDialog).getByRole('button', { name: '뒤로 가기' }))
    expect(screen.getByRole('dialog', { name: '기록 더보기' })).toBeInTheDocument()
  })

  it('changes the course name from the record more sheet', () => {
    render(<WalkRecordDetailPage />)

    fireEvent.click(screen.getByRole('button', { name: '기록 더보기' }))
    fireEvent.click(screen.getByRole('button', { name: '코스 이름 변경' }))
    const nameField = screen.getByRole('textbox', { name: '코스 이름' })
    fireEvent.change(nameField, { target: { value: '망고 저녁 산책길' } })
    fireEvent.click(screen.getByRole('button', { name: '변경 완료' }))

    expect(screen.getByText(/망고 저녁 산책길/)).toBeInTheDocument()
  })
})
