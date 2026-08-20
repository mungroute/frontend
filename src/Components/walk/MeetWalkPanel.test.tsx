import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('shows multiple nearby profiles in a horizontal list and requests the selected candidate', () => {
    const onRequest = vi.fn()
    render(<MeetWalkPanel {...props} onRequest={onRequest} candidates={[
      { candidateRef: 'candidate-1', distanceBand: 'BAND_30_50', expiresAt: '2026-08-17T10:01:00Z', preview },
      { candidateRef: 'candidate-2', distanceBand: 'BAND_50_100', expiresAt: '2026-08-17T10:01:00Z', preview: { ...preview, profileImageUrl: '/mango.jpg' } },
    ]} />)

    expect(screen.getByText('주변 산책 친구 2마리를 찾았어요')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '주변 산책 친구 프로필 목록' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '주변 산책 친구 1 프로필 보기' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '주변 산책 친구 2에게 만나기 요청' }))
    expect(onRequest).toHaveBeenCalledWith('candidate-2')
  })

  it('shows an explicit loading state while applying a changed search radius', () => {
    render(<MeetWalkPanel {...props} searching />)

    expect(screen.getByText('설정한 범위에서 산책 친구를 찾고 있어요')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: '산책 친구 다시 검색 중' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /만나기 요청/ })).not.toBeInTheDocument()
  })

  it('confirms before ending or blocking an accepted meet connection', () => {
    const onEnd = vi.fn()
    const onBlock = vi.fn()
    const profile = { ...preview, dogName: '쿠키', breed: '푸들', ageYears: 2, temperamentTags: ['차분해요'] }
    const connection = { requestId: 'request-1', lon: 126.98, lat: 37.56, updatedAt: '2026-08-17T10:00:00Z', profile }
    render(<MeetWalkPanel {...props} connection={connection} onEnd={onEnd} onBlock={onBlock} />)

    fireEvent.click(screen.getByRole('button', { name: '만남 종료' }))
    const endDialog = screen.getByRole('dialog', { name: '만남 종료 확인' })
    expect(onEnd).not.toHaveBeenCalled()
    fireEvent.click(within(endDialog).getByRole('button', { name: '계속 만나기' }))
    expect(onEnd).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '차단' }))
    const blockDialog = screen.getByRole('dialog', { name: '산책 친구 차단 확인' })
    expect(blockDialog).toHaveTextContent('앞으로 서로의 만나기 후보에 표시되지 않아요.')
    expect(onBlock).not.toHaveBeenCalled()
    fireEvent.click(within(blockDialog).getByRole('button', { name: '차단하기' }))
    expect(onBlock).toHaveBeenCalledWith('request-1')
  })

  it('shows the accepted profile immediately while live location is connecting', () => {
    const profile = { ...preview, dogName: '쿠키', breed: '푸들', ageYears: 2, temperamentTags: ['차분해요'] }
    render(<MeetWalkPanel {...props} candidates={[
      { candidateRef: 'candidate-1', distanceBand: 'BAND_30_50', expiresAt: '2026-08-17T10:01:00Z', preview },
    ]} requests={[{
      requestId: 'request-1', direction: 'INCOMING', status: 'ACCEPTED',
      createdAt: '2026-08-17T10:00:00Z', expiresAt: '2026-08-17T10:02:00Z', preview, profile,
    }]} />)

    expect(screen.getByRole('button', { name: '쿠키 프로필 보기' })).toBeInTheDocument()
    expect(screen.getByText('위치 연결 중')).toBeInTheDocument()
    expect(screen.queryByText('주변 산책 친구 1마리를 찾았어요')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /만나기 요청/ })).not.toBeInTheDocument()
  })
})
