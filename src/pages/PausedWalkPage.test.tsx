import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PausedWalkPage } from './PausedWalkPage'

describe('PausedWalkPage', () => {
  it('shows the paused walk summary and exposes its controls', () => {
    const onResume = vi.fn()
    const onStop = vi.fn()
    const onNavigationVoiceEnabledChange = vi.fn()

    render(<PausedWalkPage onResume={onResume} onStop={onStop} navigationVoiceEnabled onNavigationVoiceEnabledChange={onNavigationVoiceEnabledChange} />)

    expect(screen.getByRole('heading', { name: '산책을 잠시 멈췄어요' })).toBeInTheDocument()
    expect(screen.getByText('00:17:00')).toBeInTheDocument()
    expect(screen.getByText('1.2km')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '산책 재개' }))
    fireEvent.click(screen.getByRole('button', { name: '산책 종료' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '산책 종료 확인' })).getByRole('button', { name: '산책 종료 확정' }))
    fireEvent.click(screen.getByRole('button', { name: '내비게이션 음성 안내 끄기' }))

    expect(onResume).toHaveBeenCalledOnce()
    expect(onStop).toHaveBeenCalledOnce()
    expect(onNavigationVoiceEnabledChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('button', { name: '사진 촬영' })).not.toBeInTheDocument()
  })
})
