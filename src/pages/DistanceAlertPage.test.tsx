import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DistanceAlertPage } from './DistanceAlertPage'

describe('DistanceAlertPage', () => {
  it('shows the nearby approach direction and keeps walk controls available', () => {
    render(<DistanceAlertPage />)

    expect(screen.getByRole('heading', { name: '주변 접근 알림' })).toBeInTheDocument()
    expect(screen.getByText('지도 왼쪽 위 · 50~100m')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '산책 패널 펼치기' }))
    expect(screen.getByRole('button', { name: '산책 종료' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '사진 촬영' })).toBeInTheDocument()
  })

  it('renders the anonymized band, direction and trend returned by the server', () => {
    render(<DistanceAlertPage alert={{
      distanceBand: 'BAND_30_50',
      directionOctant: 1,
      directionSpread: 45,
      directionReference: 'HEADING',
      trend: 'STEADY',
    }} />)

    expect(screen.getByText('오른쪽 앞 · 30~50m')).toBeInTheDocument()
    expect(screen.getByText('비슷한 거리를 유지하고 있어요.')).toBeInTheDocument()
  })
})
