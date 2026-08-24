import { apiRequest, hasAccessToken, refreshAuthentication, setAccessToken } from './http'
import { setDevLocationOverrideUser } from '../utils/devLocationOverride'

const AUTH_SESSION_STORAGE_KEY = 'mungroute.auth.session.v1'

export type AuthUser = {
  userId: number
  email: string
  nickname: string
  phoneNumber: string
  profileImageUrl?: string | null
}

export type AuthResponse = {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: AuthUser
}

type AvailabilityResponse = { available: boolean }
type PhoneVerificationResponse = { available: boolean; verified: boolean }

async function acceptAuth(request: Promise<AuthResponse>) {
  const response = await request
  setAccessToken(response.accessToken, response.expiresIn)
  setDevLocationOverrideUser(response.user.email)
  try {
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(response))
  } catch {
    // The access token remains usable in memory when storage is unavailable.
  }
  return response
}

function readStoredAuth(): AuthResponse | undefined {
  if (!hasAccessToken()) return undefined
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY) ?? 'null') as AuthResponse | null
    return stored?.user && stored.accessToken ? stored : undefined
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return undefined
  }
}

export const authApi = {
  login(email: string, password: string) {
    return acceptAuth(apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, { authenticated: false }))
  },
  signup(input: {
    email: string
    password: string
    nickname: string
    phoneNumber: string
    termsAgreed: boolean
  }) {
    return acceptAuth(apiRequest<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    }, { authenticated: false }))
  },
  async restore() {
    const stored = readStoredAuth()
    if (stored) {
      setDevLocationOverrideUser(stored.user.email)
      return stored
    }
    return acceptAuth(refreshAuthentication() as Promise<AuthResponse>)
  },
  async logout() {
    try {
      await apiRequest<void>('/api/auth/logout', { method: 'POST' }, { authenticated: false })
    } finally {
      setAccessToken(null)
      setDevLocationOverrideUser(undefined)
      try {
        window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
      } catch {
        // Nothing else is required when storage is unavailable.
      }
    }
  },
  async checkEmail(email: string) {
    const result = await apiRequest<AvailabilityResponse>(
      `/api/auth/check-email?email=${encodeURIComponent(email)}`,
      {},
      { authenticated: false },
    )
    return result.available
  },
  async checkNickname(nickname: string) {
    const result = await apiRequest<AvailabilityResponse>(
      `/api/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`,
      {},
      { authenticated: false },
    )
    return result.available
  },
  async verifyPhone(phoneNumber: string) {
    return apiRequest<PhoneVerificationResponse>('/api/auth/phone-verifications', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }, { authenticated: false })
  },
  requestPasswordReset(email: string) {
    return apiRequest<{ message: string; demoVerificationCode: string | null }>(
      '/api/auth/password-reset/request',
      { method: 'POST', body: JSON.stringify({ email }) },
      { authenticated: false },
    )
  },
  verifyPasswordReset(email: string, verificationCode: string) {
    return apiRequest<{ resetToken: string; expiresIn: number }>(
      '/api/auth/password-reset/verify',
      { method: 'POST', body: JSON.stringify({ email, verificationCode }) },
      { authenticated: false },
    )
  },
  confirmPasswordReset(resetToken: string, newPassword: string) {
    return apiRequest<void>(
      '/api/auth/password-reset/confirm',
      { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) },
      { authenticated: false },
    )
  },
}
