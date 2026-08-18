import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MeetWalkPanel } from './MeetWalkPanel'

const props = {
  candidates: [], requests: [], onRequest: vi.fn(), onAccept: vi.fn(), onReject: vi.fn(),
  onCancel: vi.fn(), onEnd: vi.fn(), onBlock: vi.fn(),
}

describe('MeetWalkPanel', () => {
  it('shows no profile or coordinate before mutual acceptance', () => {
    render(<MeetWalkPanel {...props} requests={[{
      requestId: 'request-1', direction: 'INCOMING', status: 'PENDING',
      createdAt: '2026-08-17T10:00:00Z', expiresAt: '2026-08-17T10:02:00Z', profile: null,
    }]} />)
    expect(screen.getByText(/수락 전에는 서로의 위치와 프로필이 공개되지 않아요/)).toBeInTheDocument()
    expect(screen.queryByText('망고')).not.toBeInTheDocument()
  })

  it('allows an incoming request to be accepted or rejected', () => {
    const onAccept = vi.fn()
    render(<MeetWalkPanel {...props} onAccept={onAccept} requests={[{
      requestId: 'request-1', direction: 'INCOMING', status: 'PENDING',
      createdAt: '2026-08-17T10:00:00Z', expiresAt: '2026-08-17T10:02:00Z', profile: null,
    }]} />)
    fireEvent.click(screen.getByRole('button', { name: '수락' }))
    expect(onAccept).toHaveBeenCalledWith('request-1')
  })
})
