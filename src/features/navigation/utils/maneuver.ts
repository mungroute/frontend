import type { PreparedRoute } from './route-progress'
import { bearingBetween, shortestHeadingDelta } from './bearing'

export type ManeuverKind = 'STRAIGHT' | 'SLIGHT_LEFT' | 'LEFT' | 'SHARP_LEFT' | 'SLIGHT_RIGHT' | 'RIGHT' | 'SHARP_RIGHT'

export type NavigationManeuver = {
  id: string
  kind: ManeuverKind
  distanceM: number
}

type ManeuverCandidate = NavigationManeuver & {
  delta: number
  turnAtM: number
}

const TURN_SAMPLE_INSET_M = 5
const TURN_SAMPLE_DISTANCE_M = 22
const TURN_CLUSTER_DISTANCE_M = 28

export function classifyManeuver(delta: number): ManeuverKind {
  const absolute = Math.abs(delta)
  if (absolute < 20) return 'STRAIGHT'
  const direction = delta < 0 ? 'LEFT' : 'RIGHT'
  if (absolute < 45) return `SLIGHT_${direction}` as ManeuverKind
  if (absolute < 120) return direction
  return `SHARP_${direction}` as ManeuverKind
}

const coordinateAtDistance = (route: PreparedRoute, distanceM: number) => {
  const bounded = Math.max(0, Math.min(route.totalDistanceM, distanceM))
  const segment = route.segments.find((candidate) => (
    candidate.cumulativeStartM + candidate.lengthM >= bounded
  )) ?? route.segments[route.segments.length - 1]
  const ratio = segment.lengthM > 0
    ? Math.max(0, Math.min(1, (bounded - segment.cumulativeStartM) / segment.lengthM))
    : 0
  return {
    latitude: segment.start.latitude + (segment.end.latitude - segment.start.latitude) * ratio,
    longitude: segment.start.longitude + (segment.end.longitude - segment.start.longitude) * ratio,
  }
}

const turnCandidate = (route: PreparedRoute, index: number, progressM: number): ManeuverCandidate | undefined => {
  const segment = route.segments[index]
  const turnAtM = segment.cumulativeStartM + segment.lengthM
  const distanceM = turnAtM - progressM
  if (distanceM < 8) return undefined

  const incomingStartM = Math.max(0, turnAtM - TURN_SAMPLE_DISTANCE_M)
  const incomingEndM = Math.max(0, turnAtM - TURN_SAMPLE_INSET_M)
  const outgoingStartM = Math.min(route.totalDistanceM, turnAtM + TURN_SAMPLE_INSET_M)
  const outgoingEndM = Math.min(route.totalDistanceM, turnAtM + TURN_SAMPLE_DISTANCE_M)
  if (incomingEndM - incomingStartM < 5 || outgoingEndM - outgoingStartM < 5) return undefined

  const incoming = bearingBetween(
    coordinateAtDistance(route, incomingStartM),
    coordinateAtDistance(route, incomingEndM),
  )
  const outgoing = bearingBetween(
    coordinateAtDistance(route, outgoingStartM),
    coordinateAtDistance(route, outgoingEndM),
  )
  const delta = shortestHeadingDelta(incoming, outgoing)
  const kind = classifyManeuver(delta)
  if (kind === 'STRAIGHT') return undefined
  return { id: `turn-${index}-${Math.round(turnAtM)}`, kind, distanceM, delta, turnAtM }
}

export function nextManeuver(route: PreparedRoute, progressM: number): NavigationManeuver | undefined {
  const candidates: ManeuverCandidate[] = []
  for (let index = 0; index < route.segments.length - 1; index += 1) {
    const candidate = turnCandidate(route, index, progressM)
    if (candidate) candidates.push(candidate)
  }
  if (!candidates.length) return undefined

  // A curved corner is often encoded as several nearby polyline vertices. Treat
  // same-direction vertices as one maneuver and keep the strongest turn so a
  // tiny bend or a straight vertex cannot hide the actual left/right turn.
  const first = candidates[0]
  const direction = Math.sign(first.delta)
  const cluster = candidates.filter((candidate) => (
    candidate.turnAtM - first.turnAtM <= TURN_CLUSTER_DISTANCE_M
    && Math.sign(candidate.delta) === direction
  ))
  const strongest = cluster.reduce((best, candidate) => (
    Math.abs(candidate.delta) > Math.abs(best.delta) ? candidate : best
  ))
  return {
    id: strongest.id,
    kind: strongest.kind,
    distanceM: strongest.distanceM,
  }
}

