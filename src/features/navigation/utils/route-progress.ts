import type { MapCoordinate } from '../../../Components/map'
import { distanceBetween } from '../../walk-record/useWalkTracker'
import { bearingBetween } from './bearing'

type PreparedSegment = {
  start: MapCoordinate
  end: MapCoordinate
  lengthM: number
  cumulativeStartM: number
}

export type PreparedRoute = {
  coordinates: MapCoordinate[]
  segments: PreparedSegment[]
  totalDistanceM: number
  closedLoop: boolean
}

export type RouteProjection = {
  coordinate: MapCoordinate
  distanceFromRouteM: number
  progressM: number
  segmentIndex: number
  segmentBearing: number
  offRoute: boolean
}

export type RouteProgressGeometry = RouteProjection & {
  passed: MapCoordinate[]
  remaining: MapCoordinate[]
  progressRatio: number
}

const toLocalMeters = (coordinate: MapCoordinate, origin: MapCoordinate) => {
  const latitudeRadians = origin.latitude * Math.PI / 180
  return {
    x: (coordinate.longitude - origin.longitude) * 111_320 * Math.cos(latitudeRadians),
    y: (coordinate.latitude - origin.latitude) * 110_540,
  }
}

export function prepareRoute(coordinates: MapCoordinate[]): PreparedRoute | undefined {
  if (coordinates.length < 2) return undefined
  let cumulativeStartM = 0
  const segments = coordinates.slice(1).map((end, index) => {
    const start = coordinates[index]
    const lengthM = distanceBetween(start, end)
    const segment = { start, end, lengthM, cumulativeStartM }
    cumulativeStartM += lengthM
    return segment
  }).filter((segment) => segment.lengthM > 0.01)
  if (segments.length === 0) return undefined
  return {
    coordinates,
    segments,
    totalDistanceM: cumulativeStartM,
    closedLoop: distanceBetween(coordinates[0], coordinates[coordinates.length - 1]) <= 20,
  }
}

const projectToSegment = (point: MapCoordinate, segment: PreparedSegment) => {
  const end = toLocalMeters(segment.end, segment.start)
  const target = toLocalMeters(point, segment.start)
  const squaredLength = end.x ** 2 + end.y ** 2
  const ratio = squaredLength > 0
    ? Math.max(0, Math.min(1, (target.x * end.x + target.y * end.y) / squaredLength))
    : 0
  const coordinate = {
    latitude: segment.start.latitude + (segment.end.latitude - segment.start.latitude) * ratio,
    longitude: segment.start.longitude + (segment.end.longitude - segment.start.longitude) * ratio,
  }
  return {
    coordinate,
    distanceM: Math.hypot(target.x - end.x * ratio, target.y - end.y * ratio),
    progressM: segment.cumulativeStartM + segment.lengthM * ratio,
  }
}

export function projectOnRoute(
  point: MapCoordinate,
  route: PreparedRoute,
  previousProgressM?: number,
  offRouteThresholdM = 35,
): RouteProjection {
  const isInitial = previousProgressM === undefined
  const initialMaximum = route.closedLoop ? Math.min(route.totalDistanceM, Math.max(120, route.totalDistanceM * 0.1)) : route.totalDistanceM
  const minimum = isInitial ? 0 : Math.max(0, previousProgressM - 25)
  const maximum = isInitial ? initialMaximum : Math.min(route.totalDistanceM, previousProgressM + 250)
  const candidates = route.segments
    .map((segment, segmentIndex) => ({ ...projectToSegment(point, segment), segment, segmentIndex }))
    .filter((candidate) => candidate.progressM >= minimum && candidate.progressM <= maximum)
  const pool = candidates.length ? candidates : route.segments.map((segment, segmentIndex) => ({ ...projectToSegment(point, segment), segment, segmentIndex }))
  const nearest = pool.reduce((best, candidate) => candidate.distanceM < best.distanceM ? candidate : best)
  const offRoute = nearest.distanceM > offRouteThresholdM
  const progressM = offRoute && previousProgressM !== undefined
    ? previousProgressM
    : Math.max(previousProgressM ?? 0, nearest.progressM)
  return {
    coordinate: nearest.coordinate,
    distanceFromRouteM: nearest.distanceM,
    progressM,
    segmentIndex: nearest.segmentIndex,
    segmentBearing: bearingBetween(nearest.segment.start, nearest.segment.end),
    offRoute,
  }
}

const coordinateAtDistance = (route: PreparedRoute, distanceM: number) => {
  const bounded = Math.max(0, Math.min(route.totalDistanceM, distanceM))
  const segmentIndex = route.segments.findIndex((segment) => segment.cumulativeStartM + segment.lengthM >= bounded)
  const index = segmentIndex < 0 ? route.segments.length - 1 : segmentIndex
  const segment = route.segments[index]
  const ratio = segment.lengthM > 0 ? (bounded - segment.cumulativeStartM) / segment.lengthM : 0
  return {
    coordinate: {
      latitude: segment.start.latitude + (segment.end.latitude - segment.start.latitude) * ratio,
      longitude: segment.start.longitude + (segment.end.longitude - segment.start.longitude) * ratio,
    },
    segmentIndex: index,
    bearing: bearingBetween(segment.start, segment.end),
  }
}

export function buildRouteProgress(route: PreparedRoute, projection: RouteProjection): RouteProgressGeometry {
  const split = coordinateAtDistance(route, projection.progressM)
  const passed = [...route.coordinates.slice(0, split.segmentIndex + 1), split.coordinate]
  const remaining = [split.coordinate, ...route.coordinates.slice(split.segmentIndex + 1)]
  return {
    ...projection,
    passed,
    remaining,
    progressRatio: route.totalDistanceM > 0 ? projection.progressM / route.totalDistanceM : 0,
  }
}

export function chevronsAhead(route: PreparedRoute, progressM: number, count = 4) {
  return Array.from({ length: count }, (_, index) => progressM + 45 + index * 55)
    .filter((distanceM) => distanceM < route.totalDistanceM - 5)
    .map((distanceM) => ({ ...coordinateAtDistance(route, distanceM), distanceM }))
}

