import { apiRequest, refreshAuthentication, setAccessToken } from './http'

export type AuthUser = {
  userId: number
  email: string
  nickname: string
  phoneNumber: string
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
  return response
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
    return refreshAuthentication() as Promise<AuthResponse>
  },
  async logout() {
    try {
      await apiRequest<void>('/api/auth/logout', { method: 'POST' }, { authenticated: false })
    } finally {
      setAccessToken(null)
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
