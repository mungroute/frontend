import type { ServiceInfoSection } from '../pages/ServiceInfoPage'

const allowedWalkReturnPaths = new Set([
  '/home',
  '/courses/compare',
  '/courses/candidates',
  '/courses/detail',
  '/courses/shade',
])

export const activeWalkPaths = new Set(['/walk/active', '/walk/distance-alert', '/walk/paused'])

export const readWalkReturnTo = (search: string, origin = window.location.origin) => {
  const requested = new URLSearchParams(search).get('returnTo')
  if (!requested) return '/home'
  try {
    const url = new URL(requested, origin)
    return url.origin === origin && allowedWalkReturnPaths.has(url.pathname)
      ? `${url.pathname}${url.search}`
      : '/home'
  } catch {
    return '/home'
  }
}

export const walkSelectionUrl = (returnTo: string, context: Record<string, string | number>) => {
  const params = new URLSearchParams({ returnTo })
  Object.entries(context).forEach(([key, value]) => params.set(key, String(value)))
  return `/walk/dogs?${params.toString()}`
}

export type NavigationOptions = {
  replace?: boolean
  state?: Record<string, unknown>
}

export type RecommendationHistoryStep = 'time' | 'loading' | 'candidates'

export const recommendationHistoryStep = () => (
  window.history.state?.recommendationHistoryStep as RecommendationHistoryStep | undefined
)

export const readDuration = (search: string) => {
  const duration = Number(new URLSearchParams(search).get('duration'))
  return duration >= 10 && duration <= 60 && duration % 5 === 0 ? duration : 30
}

const serviceInfoSections = new Set<ServiceInfoSection>(['version', 'terms', 'privacy', 'licenses'])

export const isServiceInfoSection = (value: string | null): value is ServiceInfoSection => (
  value !== null && serviceInfoSections.has(value as ServiceInfoSection)
)
