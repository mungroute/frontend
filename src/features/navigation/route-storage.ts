import type { ActiveWalkRouteSnapshot, WalkNavigationRoute, WalkRouteSelection } from './types'
import { normalizeWalkRoute } from './route-normalizer'

const PENDING_KEY = 'mungroute.walk-route.pending.v1'
const ACTIVE_KEY = 'mungroute.walk-route.active.v1'
const VERSION = 1

type StoredPending = { version: 1; selection: WalkRouteSelection }
type StoredActive = { version: 1; snapshot: ActiveWalkRouteSnapshot }

const storage = () => {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

const origins = new Set<WalkNavigationRoute['origin']>([
  'REPRESENTATIVE_COURSE',
  'COURSE_DETAIL',
  'COMPARISON_USUAL',
  'COMPARISON_ALTERNATIVE',
  'TIME_RECOMMENDATION',
])

const restoreRoute = (value: unknown): WalkNavigationRoute | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const route = value as Partial<WalkNavigationRoute>
  const hasBaseShape = typeof route.routeKey === 'string'
    && typeof route.name === 'string'
    && origins.has(route.origin as WalkNavigationRoute['origin'])
    && typeof route.distanceM === 'number'
    && Boolean(route.geometry && typeof route.geometry === 'object')
  if (!hasBaseShape) return undefined
  try {
    return normalizeWalkRoute({
      routeKey: route.routeKey!,
      backendId: typeof route.backendId === 'string' ? route.backendId : undefined,
      origin: route.origin!,
      name: route.name!,
      geometry: route.geometry!,
      distanceM: route.distanceM,
      durationSec: route.durationSec,
      thermalSegments: route.thermalSegments,
      estimatedSurfaceTempC: route.estimatedSurfaceTempC,
      shadeRatio: route.shadeRatio,
    })
  } catch {
    return undefined
  }
}

const safeParse = <T,>(key: string): T | undefined => {
  const target = storage()
  if (!target) return undefined
  try {
    return JSON.parse(target.getItem(key) ?? '') as T
  } catch {
    target.removeItem(key)
    return undefined
  }
}

export function writePendingWalkRoute(selection: WalkRouteSelection) {
  storage()?.setItem(PENDING_KEY, JSON.stringify({ version: VERSION, selection } satisfies StoredPending))
}

export function readPendingWalkRoute(): WalkRouteSelection {
  const stored = safeParse<StoredPending>(PENDING_KEY)
  if (stored?.version !== VERSION || typeof stored.selection?.routeRequired !== 'boolean') {
    storage()?.removeItem(PENDING_KEY)
    return { route: null, routeRequired: false }
  }
  if (stored.selection.route !== null) {
    const route = restoreRoute(stored.selection.route)
    if (!route) {
      storage()?.removeItem(PENDING_KEY)
      return { route: null, routeRequired: true }
    }
    return { ...stored.selection, route }
  }
  return stored.selection
}

export function clearPendingWalkRoute() {
  storage()?.removeItem(PENDING_KEY)
}

export function writeActiveWalkRoute(snapshot: ActiveWalkRouteSnapshot) {
  storage()?.setItem(ACTIVE_KEY, JSON.stringify({ version: VERSION, snapshot } satisfies StoredActive))
}

export function readActiveWalkRoute(): ActiveWalkRouteSnapshot | undefined {
  const stored = safeParse<StoredActive>(ACTIVE_KEY)
  const snapshot = stored?.snapshot
  const route = snapshot?.route === null ? null : restoreRoute(snapshot?.route)
  if (
    stored?.version !== VERSION
    || !snapshot
    || !Number.isSafeInteger(snapshot.sessionId)
    || snapshot.sessionId < 1
    || route === undefined
  ) {
    storage()?.removeItem(ACTIVE_KEY)
    return undefined
  }
  const presenceMode = snapshot.presenceMode === 'distance' || snapshot.presenceMode === 'meet'
    ? snapshot.presenceMode
    : null
  return {
    ...snapshot,
    route,
    presenceMode,
    presenceEnabled: presenceMode !== null && snapshot.presenceEnabled === true,
  }
}

export function clearActiveWalkRoute() {
  storage()?.removeItem(ACTIVE_KEY)
}

export function clearWalkRoutes() {
  clearPendingWalkRoute()
  clearActiveWalkRoute()
}
