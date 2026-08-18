import type { MapCoordinate } from '../map'

export type GradientRoutePiece = {
  coordinates: MapCoordinate[]
  color: string
  progress: number
}

const parseHex = (hex: string) => {
  const value = hex.replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map((character) => `${character}${character}`).join('')
    : value.slice(0, 6)
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16))
}

export const interpolateHexColor = (start: string, end: string, progress: number) => {
  const clamped = Math.min(1, Math.max(0, progress))
  const startRgb = parseHex(start)
  const endRgb = parseHex(end)
  const value = startRgb.map((channel, index) => Math.round(channel + (endRgb[index] - channel) * clamped))
  return `#${value.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const distance = (start: MapCoordinate, end: MapCoordinate) => (
  Math.hypot(end.longitude - start.longitude, end.latitude - start.latitude)
)

const coordinateAt = (
  coordinates: MapCoordinate[],
  cumulative: number[],
  target: number,
) => {
  const segmentIndex = cumulative.findIndex((value, index) => index > 0 && value >= target)
  if (segmentIndex < 1) return coordinates.at(-1) ?? coordinates[0]
  const segmentStart = cumulative[segmentIndex - 1]
  const segmentLength = cumulative[segmentIndex] - segmentStart
  const progress = segmentLength > 0 ? (target - segmentStart) / segmentLength : 0
  const start = coordinates[segmentIndex - 1]
  const end = coordinates[segmentIndex]
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * progress,
    longitude: start.longitude + (end.longitude - start.longitude) * progress,
  }
}

export const splitLineIntoGradientPieces = (
  coordinates: MapCoordinate[],
  startColor: string,
  endColor: string,
  pieceCount = 6,
): GradientRoutePiece[] => {
  if (coordinates.length < 2) return []
  const cumulative = coordinates.map((_, index) => index === 0
    ? 0
    : distance(coordinates[index - 1], coordinates[index]))
    .reduce<number[]>((values, length, index) => {
      values.push(index === 0 ? 0 : values[index - 1] + length)
      return values
    }, [])
  const total = cumulative.at(-1) ?? 0
  if (total <= 0) return []
  const count = Math.max(1, Math.min(12, Math.round(pieceCount)))

  return Array.from({ length: count }, (_, index) => {
    const fromDistance = total * index / count
    const toDistance = total * (index + 1) / count
    const interior = coordinates.filter((_, coordinateIndex) => (
      cumulative[coordinateIndex] > fromDistance && cumulative[coordinateIndex] < toDistance
    ))
    return {
      coordinates: [
        coordinateAt(coordinates, cumulative, fromDistance),
        ...interior,
        coordinateAt(coordinates, cumulative, toDistance),
      ],
      color: interpolateHexColor(startColor, endColor, (index + 0.5) / count),
      progress: (index + 1) / count,
    }
  })
}
