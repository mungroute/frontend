import type { MapCoordinate } from '../../../Components/map'

const toRadians = (degrees: number) => degrees * Math.PI / 180
const toDegrees = (radians: number) => radians * 180 / Math.PI

export const normalizeHeading = (heading: number) => (heading % 360 + 360) % 360

export function bearingBetween(from: MapCoordinate, to: MapCoordinate) {
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude)
  const x = Math.cos(fromLatitude) * Math.sin(toLatitude)
    - Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta)
  return normalizeHeading(toDegrees(Math.atan2(y, x)))
}

export const shortestHeadingDelta = (from: number, to: number) => (
  (normalizeHeading(to) - normalizeHeading(from) + 540) % 360 - 180
)

