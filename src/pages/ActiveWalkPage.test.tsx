import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActiveWalkPage } from './ActiveWalkPage'

describe('ActiveWalkPage', () => {
  it('exposes the active walk controls and distance mode', () => {
    const onPause = vi.fn()
    const onStop = vi.fn()
    const onPhoto = vi.fn()
    const onDistanceModeChange = vi.fn()
    render(
      <ActiveWalkPage
        onPause={onPause}
        onStop={onStop}
        onPhoto={onPhoto}
        onDistanceModeChange={onDistanceModeChange}
      />,
    )

    expect(screen.getByText('00:17:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    fireEvent.click(screen.getByRole('button', { name: '산책 종료' }))
    const endDialog = screen.getByRole('dialog', { name: '산책 종료 확인' })
    expect(endDialog).toBeInTheDocument()
    expect(onStop).not.toHaveBeenCalled()
    fireEvent.click(within(endDialog).getByRole('button', { name: '산책 종료 확정' }))
    const photoInput = screen.getByLabelText('산책 사진 선택')
    const photoPicker = vi.spyOn(photoInput, 'click')
    fireEvent.click(screen.getByRole('button', { name: '사진 촬영' }))
    const distanceMode = screen.getByRole('switch', { name: '거리두기' })
    fireEvent.click(distanceMode)

    const distanceModeDialog = screen.getByRole('dialog', { name: '거리두기 모드 끄기 확인' })
    expect(distanceMode).toHaveAttribute('aria-checked', 'true')
    expect(onDistanceModeChange).not.toHaveBeenCalled()
    fireEvent.click(within(distanceModeDialog).getByRole('button', { name: '취소' }))
    expect(onDistanceModeChange).not.toHaveBeenCalled()
    expect(distanceMode).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(distanceMode)
    fireEvent.click(within(screen.getByRole('dialog', { name: '거리두기 모드 끄기 확인' })).getByRole('button', { name: '끄기' }))

    expect(onPause).toHaveBeenCalledOnce()
    expect(onStop).toHaveBeenCalledOnce()
    expect(onPhoto).toHaveBeenCalledOnce()
    expect(photoPicker).toHaveBeenCalledOnce()
    expect(onDistanceModeChange).toHaveBeenCalledWith(false)
    expect(distanceMode).toHaveAttribute('aria-checked', 'false')
  })
})
