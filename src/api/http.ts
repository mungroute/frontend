import { apiUrl } from './url'

export type ProblemDetail = {
  status?: number
  code?: string
  title?: string
  detail?: string
  message?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.message ?? `API 요청에 실패했습니다. (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = problem.code
  }
}

type AuthTokenResponse = {
  accessToken: string
  expiresIn?: number
}

const ACCESS_TOKEN_STORAGE_KEY = 'mungroute.auth.access-token.v1'

type StoredAccessToken = {
  token: string
  expiresAt: number
}

function readStoredAccessToken(): StoredAccessToken | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? 'null') as StoredAccessToken | null
    if (!stored?.token || !Number.isFinite(stored.expiresAt) || stored.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
      return undefined
    }
    return stored
  } catch {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    return undefined
  }
}

const storedAccessToken = readStoredAccessToken()
let accessToken: string | null = storedAccessToken?.token ?? null
let accessTokenExpiresAt = storedAccessToken?.expiresAt ?? 0
let refreshRequest: Promise<AuthTokenResponse> | null = null

export function setAccessToken(token: string | null, expiresInSeconds?: number) {
  accessToken = token
  accessTokenExpiresAt = token === null
    ? 0
    : expiresInSeconds === undefined
      ? Number.MAX_SAFE_INTEGER
      : Date.now() + expiresInSeconds * 1_000
  if (typeof window === 'undefined') return
  try {
    if (token === null) {
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    } else {
      window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, JSON.stringify({
        token,
        expiresAt: accessTokenExpiresAt,
      } satisfies StoredAccessToken))
    }
  } catch {
    // Authentication still works in memory when storage is unavailable.
  }
}

export function hasAccessToken() {
  return !tokenNeedsRefresh()
}

async function readProblem(response: Response): Promise<ProblemDetail> {
  return response.json().catch(() => ({})) as Promise<ProblemDetail>
}

export async function refreshAuthentication(): Promise<AuthTokenResponse> {
  if (!refreshRequest) {
    refreshRequest = fetch(apiUrl('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          accessToken = null
          throw new ApiError(response.status, await readProblem(response))
        }
        const body = await response.json() as AuthTokenResponse
        setAccessToken(body.accessToken, body.expiresIn)
        return body
      })
      .finally(() => {
        refreshRequest = null
      })
  }
  return refreshRequest
}

function tokenNeedsRefresh() {
  return !accessToken || accessTokenExpiresAt - Date.now() <= 30_000
}

export async function getValidAccessToken() {
  if (tokenNeedsRefresh()) {
    return (await refreshAuthentication()).accessToken
  }
  if (!accessToken) {
    throw new ApiError(401, { code: 'AUTH_TOKEN_INVALID', detail: '인증이 필요합니다.' })
  }
  return accessToken
}

type RequestOptions = {
  authenticated?: boolean
  retryOnUnauthorized?: boolean
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const authenticated = options.authenticated ?? true
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (authenticated && tokenNeedsRefresh() && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshAuthentication()
    headers.set('Authorization', `Bearer ${refreshed.accessToken}`)
  }
  if (authenticated && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers,
  })

  if (response.status === 401 && authenticated && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshAuthentication()
    const retryHeaders = new Headers(headers)
    retryHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`)
    return apiRequest<T>(path, { ...init, headers: retryHeaders }, {
      authenticated: true,
      retryOnUnauthorized: false,
    })
  }

  if (response.status === 401 && authenticated) setAccessToken(null)
  if (!response.ok) throw new ApiError(response.status, await readProblem(response))
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
