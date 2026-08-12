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
    expect(screen.getByText('126kcal')).toBeInTheDocument()
  })
})
