import type { CourseRouteGeoJson } from '../../api/courses'
import type { ThermalRouteSegment } from '../../Components/courses/thermal-route'
import type { MapCoordinate } from '../../Components/map'
import type { LockedWalkPresenceMode } from '../../api/walks'

export type WalkNavigationRouteOrigin =
  | 'REPRESENTATIVE_COURSE'
  | 'COURSE_DETAIL'
  | 'COMPARISON_USUAL'
  | 'COMPARISON_ALTERNATIVE'
  | 'TIME_RECOMMENDATION'

export type WalkNavigationRoute = {
  routeKey: string
  backendId?: string
  origin: WalkNavigationRouteOrigin
  name: string
  geometry: CourseRouteGeoJson
  coordinateParts: MapCoordinate[][]
  navigationPolyline?: MapCoordinate[]
  distanceM: number
  durationSec?: number
  thermalSegments?: ThermalRouteSegment[]
  estimatedSurfaceTempC?: number | null
  shadeRatio?: number | null
}

export type NavigationPositionFix = {
  coordinate: MapCoordinate
  accuracy: number
  observedAt: number
  heading: number | null
  speed: number | null
}

export type WalkRouteSelection = {
  route: WalkNavigationRoute | null
  routeRequired: boolean
}

export type ActiveWalkRouteSnapshot = {
  sessionId: number
  startedAt?: string
  dogIds?: string[]
  route: WalkNavigationRoute | null
  presenceMode: LockedWalkPresenceMode | null
  presenceEnabled: boolean
}
