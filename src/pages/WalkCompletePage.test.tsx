import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalkCompletePage } from './WalkCompletePage'

describe('WalkCompletePage', () => {
  it('lets the walker name and save the completed route', () => {
    const onSave = vi.fn()
    render(<WalkCompletePage onSave={onSave} />)

    expect(screen.getByRole('heading', { name: '산책을 마쳤어요!' })).toBeInTheDocument()
    expect(screen.getByText('2.1km')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '코스 이름' }), { target: { value: '아침 공원길' } })
    fireEvent.click(screen.getByRole('button', { name: '대표 코스로 설정' }))
    fireEvent.click(screen.getByRole('button', { name: '코스 저장하기' }))

    expect(onSave).toHaveBeenCalledWith({ name: '아침 공원길', representative: false })
  })

  it('shows the final time and distance measured by the frontend tracker', () => {
    render(<WalkCompletePage time="00:17:42" distance="1.24km" />)

    expect(screen.getByText('00:17:42')).toBeInTheDocument()
    expect(screen.getByText('1.24km')).toBeInTheDocument()
    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument()
  })

  it('shows an alert modal instead of inline copy when GPS points are insufficient', () => {
    const onSave = vi.fn()
    render(<WalkCompletePage representativeEligible={false} matchStatus="INSUFFICIENT_POINTS" onSave={onSave} />)

    expect(screen.queryByText('GPS 지점이 부족해 대표 코스로는 설정할 수 없어요.')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '대표 코스 설정 불가' })).toBeInTheDocument()
    expect(screen.getByText(/GPS 지점이 부족해요/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(screen.queryByRole('dialog', { name: '대표 코스 설정 불가' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '대표 코스로 설정' }))
    expect(screen.getByRole('dialog', { name: '대표 코스 설정 불가' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    fireEvent.click(screen.getByRole('button', { name: '코스 저장하기' }))
    expect(onSave).toHaveBeenCalledWith({ name: '저녁 남산길', representative: false })
  })

  it('shows backend walk errors in a dismissible modal instead of inline copy', () => {
    render(<WalkCompletePage errorMessage="이미 종료된 산책입니다." />)

    const dialog = screen.getByRole('dialog', { name: '산책 처리 안내' })
    expect(dialog).toHaveTextContent('이미 종료된 산책입니다.')
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    expect(screen.queryByRole('dialog', { name: '산책 처리 안내' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('can leave without saving a course', () => {
    const onExitWithoutSaving = vi.fn()
    const onSave = vi.fn()
    render(<WalkCompletePage onSave={onSave} onExitWithoutSaving={onExitWithoutSaving} />)

    fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 나가기' }))

    expect(onExitWithoutSaving).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })
})
