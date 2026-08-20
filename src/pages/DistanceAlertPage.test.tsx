import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DistanceAlertPage } from './DistanceAlertPage'

afterEach(() => vi.useRealTimers())

describe('DistanceAlertPage', () => {
  it('shows the nearby approach direction and keeps walk controls available', () => {
    render(<DistanceAlertPage />)

    expect(screen.getByRole('heading', { name: '주변 접근 알림' })).toBeInTheDocument()
    expect(screen.getByText('지도 왼쪽 위 · 약 50~100m')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '산책 종료' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내비게이션 음성 안내 끄기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '사진 촬영' })).not.toBeInTheDocument()
  })

  it('renders the anonymized band, direction and trend returned by the server', () => {
    render(<DistanceAlertPage alert={{
      distanceBand: 'BAND_30_50',
      directionOctant: 1,
      directionSpread: 45,
      directionReference: 'HEADING',
      trend: 'STEADY',
    }} />)

    expect(screen.getByText('오른쪽 앞 · 약 30~50m')).toBeInTheDocument()
    expect(screen.getByText('비슷한 거리를 유지하고 있어요.')).toBeInTheDocument()
  })

  it('dismisses the in-app alert after five seconds and shows a meaningful new event', () => {
    vi.useFakeTimers()
    const alert = {
      distanceBand: 'BAND_30_50' as const,
      directionOctant: 1,
      directionSpread: 45,
      directionReference: 'HEADING' as const,
      trend: 'STEADY' as const,
    }
    const view = render(<DistanceAlertPage alert={alert} />)

    act(() => vi.advanceTimersByTime(4_999))
    expect(screen.getByRole('heading', { name: '주변 접근 알림' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('heading', { name: '주변 접근 알림' })).not.toBeInTheDocument()

    view.rerender(<DistanceAlertPage alert={{ ...alert, trend: 'APPROACHING' }} />)
    expect(screen.getByRole('heading', { name: '주변 접근 알림' })).toBeInTheDocument()
  })

  it('keeps the alert when its body is tapped and dismisses it with the top-right close button', () => {
    render(<DistanceAlertPage />)
    fireEvent.click(screen.getByRole('status', { name: '주변 접근 알림' }))
    expect(screen.getByRole('heading', { name: '주변 접근 알림' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '거리두기 알림 닫기' }))
    expect(screen.queryByRole('heading', { name: '주변 접근 알림' })).not.toBeInTheDocument()
  })
})
