import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DistanceAlertPage } from './DistanceAlertPage'

describe('DistanceAlertPage', () => {
  it('shows the nearby approach direction and keeps walk controls available', () => {
    render(<DistanceAlertPage />)

    expect(screen.getByRole('heading', { name: '주변 접근 알림' })).toBeInTheDocument()
    expect(screen.getByText('화면 왼쪽 위 방향 50~100m')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '산책 종료' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '사진 촬영' })).toBeInTheDocument()
  })
})
