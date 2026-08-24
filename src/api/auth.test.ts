import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './auth'
import { apiRequest, setAccessToken } from './http'
import { apiUrl } from './url'
import { getDevLocationOverride, setDevLocationOverrideUser } from '../utils/devLocationOverride'

const authBody = {
  accessToken: 'issued-access-token',
  tokenType: 'Bearer',
  expiresIn: 1800,
  user: { userId: 7, email: 'mango@example.com', nickname: '망고 보호자', phoneNumber: '01012345678' },
}

describe('authApi', () => {
  afterEach(() => {
    setAccessToken(null)
    setDevLocationOverrideUser(undefined)
    vi.unstubAllGlobals()
  })

  it('logs in and attaches the issued access token to protected requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(authBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.login('mango@example.com', 'mungroute1')
    await apiRequest<{ ok: boolean }>('/api/protected')

    expect(fetchMock.mock.calls[0][0]).toBe(apiUrl('/api/auth/login'))
    const protectedHeaders = fetchMock.mock.calls[1][1].headers as Headers
    expect(protectedHeaders.get('Authorization')).toBe('Bearer issued-access-token')
  })

  it('restores the authenticated user from session storage without rotating the refresh cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(authBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.login('mango@example.com', 'mungroute1')
    await expect(authApi.restore()).resolves.toEqual(authBody)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem('mungroute.auth.access-token.v1')).toContain('issued-access-token')
  })

  it('restores an access token with the HttpOnly refresh cookie before a protected request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(authBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest<void>('/api/walks/start', { method: 'POST' })

    expect(fetchMock.mock.calls[0][0]).toBe(apiUrl('/api/auth/refresh'))
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ credentials: 'include' }))
    const protectedHeaders = fetchMock.mock.calls[1][1].headers as Headers
    expect(protectedHeaders.get('Authorization')).toBe('Bearer issued-access-token')
  })

  it('shares one refresh request when authentication restore runs concurrently', async () => {
    let resolveRefresh: ((response: Response) => void) | undefined
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    }))
    vi.stubGlobal('fetch', fetchMock)

    const first = authApi.restore()
    const second = authApi.restore()
    resolveRefresh?.(new Response(JSON.stringify(authBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(Promise.all([first, second])).resolves.toEqual([authBody, authBody])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('activates the local location override after authenticating a test account', async () => {
    const testAccountBody = {
      ...authBody,
      user: { ...authBody.user, email: 'test@naver.com' },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(testAccountBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    await authApi.login('test@naver.com', 'mungroute1')

    expect(getDevLocationOverride()).toEqual({ latitude: 37.565825, longitude: 126.9874593 })
  })

  it('refreshes a rejected access token and retries the protected request once', async () => {
    const refreshedBody = { ...authBody, accessToken: 'refreshed-access-token' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(authBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 401,
        code: 'AUTH_TOKEN_INVALID',
        detail: '인증이 필요하거나 토큰이 유효하지 않습니다.',
      }), { status: 401, headers: { 'Content-Type': 'application/problem+json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(refreshedBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.login('mango@example.com', 'mungroute1')
    await apiRequest<void>('/api/walks/start', { method: 'POST' })

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      apiUrl('/api/auth/login'),
      apiUrl('/api/walks/start'),
      apiUrl('/api/auth/refresh'),
      apiUrl('/api/walks/start'),
    ])
    const retriedHeaders = fetchMock.mock.calls[3][1].headers as Headers
    expect(retriedHeaders.get('Authorization')).toBe('Bearer refreshed-access-token')
  })
})
