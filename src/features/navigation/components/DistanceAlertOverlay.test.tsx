import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SafeDetourResult } from '../../../api/walks'
import { DistanceAlertOverlay } from './DistanceAlertOverlay'

describe('DistanceAlertOverlay safe detour', () => {
  it('previews a road-validated detour and applies it only after confirmation', async () => {
    const result: SafeDetourResult = {
      requestId: 'detour-1',
      decision: 'DETOUR',
      message: '오른쪽 앞 길로 우회하면 약 1분 더 걸려요.',
      firstManeuver: 'RIGHT',
      addedDistanceM: 40,
      addedDurationSec: 32,
      route: [{ lat: 37.5665, lon: 126.978 }, { lat: 37.568, lon: 126.979 }],
      validUntil: '2026-08-20T12:00:10+09:00',
      retryAfterSeconds: 25,
    }
    const onRequestDetour = vi.fn().mockResolvedValue(result)
    const onApplyDetour = vi.fn()
    render(<DistanceAlertOverlay onRequestDetour={onRequestDetour} onApplyDetour={onApplyDetour} />)

    fireEvent.click(screen.getByRole('button', { name: '다른 길로 안내' }))

    expect(screen.getByText('겹치지 않는 길을 확인하고 있어요.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(result.message)).toBeInTheDocument())
    expect(onApplyDetour).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '이 경로로 이동' }))
    expect(onApplyDetour).toHaveBeenCalledWith(result)
  })
})
