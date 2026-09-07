import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWalkSessionReducer } from './useWalkSessionReducer'

vi.mock('../navigation/route-storage', () => ({
  readPendingWalkRoute: () => ({ route: null, routeRequired: false }),
}))

describe('useWalkSessionReducer', () => {
  it('restores active session state and supports functional transitions', () => {
    const { result } = renderHook(() => useWalkSessionReducer({
      sessionId: 27,
      route: null,
      presenceMode: 'meet',
      presenceEnabled: true,
    }))

    expect(result.current.backendWalkStarted).toBe(true)
    expect(result.current.walkPresenceMode).toBe('meet')

    act(() => {
      result.current.setMeetRequests((current) => [
        ...current,
        { requestId: 'request-1', status: 'PENDING' } as never,
      ])
    })

    expect(result.current.meetRequests).toHaveLength(1)
  })
})
