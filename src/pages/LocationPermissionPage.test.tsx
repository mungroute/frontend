import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocationPermissionPage } from './LocationPermissionPage'

describe('LocationPermissionPage', () => {
  it('explains why location is needed before offering the permission action', () => {
    render(<LocationPermissionPage onRequestPermission={() => undefined} />)

    expect(screen.getByRole('heading', { name: '산책 시작 위치를 알려주세요' })).toBeInTheDocument()
    expect(screen.getByText('현재 위치를 확인하면 지금 시간과 날씨에 맞는 산책 코스를 찾아드릴 수 있어요.')).toBeInTheDocument()
    expect(screen.getByText('위치는 산책 기능을 사용할 때만 확인해요')).toBeInTheDocument()
  })

  it('requests location only after the primary action is pressed', () => {
    const onRequestPermission = vi.fn()
    render(<LocationPermissionPage onRequestPermission={onRequestPermission} />)

    expect(onRequestPermission).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '위치 권한 확인' }))
    expect(onRequestPermission).toHaveBeenCalledOnce()
  })
})
