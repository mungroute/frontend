import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MeetProfileDialog, MeetWalkPanel } from './MeetWalkPanel'

const preview = {
  profileImageUrl: '/cookie.jpg', leashGreeting: 'LIKES', strangerResponse: 'NEUTRAL',
  touchTolerance: 'COMFORTABLE', barkingLevel: 'RARE', bitingLevel: 'NONE',
} as const

const props = {
  candidates: [], requests: [], onRequest: vi.fn(), onAccept: vi.fn(), onReject: vi.fn(),
  onCancel: vi.fn(), onEnd: vi.fn(), onBlock: vi.fn(),
}

describe('MeetWalkPanel', () => {
  it('opens only the safe photo and personality preview before mutual acceptance', () => {
    const onProfileSelect = vi.fn()
    render(<MeetWalkPanel {...props} requests={[{
      requestId: 'request-1', direction: 'INCOMING', status: 'PENDING',
      createdAt: '2026-08-17T10:00:00Z', expiresAt: '2026-08-17T10:02:00Z', preview, profile: null,
    }]} onProfileSelect={onProfileSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '요청한 산책 친구 프로필 보기' }))
    expect(onProfileSelect).toHaveBeenCalledWith({ preview })
    expect(screen.queryByText('쿠키')).not.toBeInTheDocument()
  })

  it('allows an incoming request to be accepted or rejected', () => {
    const onAccept = vi.fn()
    render(<MeetWalkPanel {...props} onAccept={onAccept} requests={[{
      requestId: 'request-1', direction: 'INCOMING', status: 'PENDING',
      createdAt: '2026-08-17T10:00:00Z', expiresAt: '2026-08-17T10:02:00Z', preview, profile: null,
    }]} />)
    fireEvent.click(screen.getByRole('button', { name: '수락' }))
    expect(onAccept).toHaveBeenCalledWith('request-1')
  })

  it('hides detailed fields in preview and reveals them after acceptance', () => {
    const { rerender } = render(<MeetProfileDialog selection={{ preview }} onClose={vi.fn()} />)
    expect(screen.getByRole('img', { name: '강아지 프로필 사진' })).toHaveAttribute('src', '/cookie.jpg')
    expect(screen.getByText('목줄 인사')).toBeInTheDocument()
    expect(screen.getByText('좋아해요')).toBeInTheDocument()
    expect(screen.queryByText('쿠키')).not.toBeInTheDocument()
    expect(screen.queryByText('푸들 · 2살')).not.toBeInTheDocument()
    expect(screen.queryByText('#차분해요')).not.toBeInTheDocument()

    const profile = { ...preview, dogName: '쿠키', breed: '푸들', ageYears: 2, temperamentTags: ['차분해요'] }
    rerender(<MeetProfileDialog selection={{ preview: profile, profile }} onClose={vi.fn()} />)
    expect(screen.getByText('쿠키')).toBeInTheDocument()
    expect(screen.getByText('푸들 · 2살')).toBeInTheDocument()
    expect(screen.getByText('#차분해요')).toBeInTheDocument()
  })
})
