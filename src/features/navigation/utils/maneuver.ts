import type { PreparedRoute } from './route-progress'
import { bearingBetween, shortestHeadingDelta } from './bearing'

export type ManeuverKind = 'STRAIGHT' | 'SLIGHT_LEFT' | 'LEFT' | 'SHARP_LEFT' | 'SLIGHT_RIGHT' | 'RIGHT' | 'SHARP_RIGHT'

export type NavigationManeuver = {
  kind: ManeuverKind
  distanceM: number
}

export function classifyManeuver(delta: number): ManeuverKind {
  const absolute = Math.abs(delta)
  if (absolute < 20) return 'STRAIGHT'
  const direction = delta < 0 ? 'LEFT' : 'RIGHT'
  if (absolute < 45) return `SLIGHT_${direction}` as ManeuverKind
  if (absolute < 120) return direction
  return `SHARP_${direction}` as ManeuverKind
}

export function nextManeuver(route: PreparedRoute, progressM: number): NavigationManeuver | undefined {
  for (let index = 0; index < route.segments.length - 1; index += 1) {
    const segment = route.segments[index]
    const turnAtM = segment.cumulativeStartM + segment.lengthM
    const distanceM = turnAtM - progressM
    if (distanceM < 8) continue
    const next = route.segments[index + 1]
    if (segment.lengthM < 5 || next.lengthM < 5) continue
    const incoming = bearingBetween(segment.start, segment.end)
    const outgoing = bearingBetween(next.start, next.end)
    const kind = classifyManeuver(shortestHeadingDelta(incoming, outgoing))
    if (kind !== 'STRAIGHT' || distanceM <= 120) return { kind, distanceM }
  }
  return undefined
}

