import type { CourseRouteGeoJson } from '../../api/courses'
import type { MapCoordinate } from '../../Components/map'
import { distanceBetween } from '../walk-record/useWalkTracker'
import type { WalkNavigationRoute, WalkNavigationRouteOrigin } from './types'

const PART_CONNECTION_TOLERANCE_M = 15

export type NormalizeWalkRouteInput = {
  routeKey: string
  backendId?: string
  origin: WalkNavigationRouteOrigin
  name: string
  geometry: CourseRouteGeoJson
  distanceM?: number
  durationSec?: number
  thermalSegments?: WalkNavigationRoute['thermalSegments']
  estimatedSurfaceTempC?: number | null
  shadeRatio?: number | null
}

const isFiniteCoordinate = (value: number[]) => (
  value.length >= 2
  && Number.isFinite(value[0])
  && Number.isFinite(value[1])
  && value[0] >= -180
  && value[0] <= 180
  && value[1] >= -90
  && value[1] <= 90
)

export function coordinateFromGeoJson(value: number[]): MapCoordinate {
  if (!isFiniteCoordinate(value)) throw new Error('경로 좌표 형식이 올바르지 않습니다.')
  return { longitude: value[0], latitude: value[1] }
}

export function coordinateToGeoJson(value: MapCoordinate): [number, number] {
  return [value.longitude, value.latitude]
}

export function routeCoordinateParts(geometry: CourseRouteGeoJson): MapCoordinate[][] {
  const rawParts = geometry.type === 'LineString'
    ? [geometry.coordinates as number[][]]
    : geometry.coordinates as number[][][]

  return rawParts.map((part) => part.map(coordinateFromGeoJson))
}

const routeDistance = (parts: MapCoordinate[][]) => parts.reduce((total, part) => (
  total + part.slice(1).reduce((partTotal, coordinate, index) => (
    partTotal + distanceBetween(part[index], coordinate)
  ), 0)
), 0)

const continuousPolyline = (parts: MapCoordinate[][]) => {
  if (parts.length === 0 || parts.some((part) => part.length < 2)) return undefined
  const combined = [...parts[0]]
  for (let index = 1; index < parts.length; index += 1) {
    const previous = combined[combined.length - 1]
    const nextPart = parts[index]
    if (distanceBetween(previous, nextPart[0]) > PART_CONNECTION_TOLERANCE_M) return undefined
    const startsAtPrevious = distanceBetween(previous, nextPart[0]) < 0.5
    combined.push(...nextPart.slice(startsAtPrevious ? 1 : 0))
  }
  return combined
}

export function normalizeWalkRoute(input: NormalizeWalkRouteInput): WalkNavigationRoute {
  const coordinateParts = routeCoordinateParts(input.geometry)
  if (coordinateParts.length === 0 || coordinateParts.some((part) => part.length < 2)) {
    throw new Error('산책을 시작하려면 경로 좌표가 2개 이상 필요합니다.')
  }

  const navigationPolyline = continuousPolyline(coordinateParts)
  const calculatedDistanceM = routeDistance(coordinateParts)
  if (!Number.isFinite(calculatedDistanceM) || calculatedDistanceM <= 0) {
    throw new Error('경로 거리를 계산할 수 없습니다.')
  }

  return {
    routeKey: input.routeKey,
    backendId: input.backendId,
    origin: input.origin,
    name: input.name,
    geometry: input.geometry,
    coordinateParts,
    navigationPolyline,
    distanceM: input.distanceM && input.distanceM > 0 ? input.distanceM : calculatedDistanceM,
    durationSec: input.durationSec && input.durationSec > 0 ? input.durationSec : undefined,
    thermalSegments: input.thermalSegments,
    estimatedSurfaceTempC: input.estimatedSurfaceTempC,
    shadeRatio: input.shadeRatio,
  }
}

