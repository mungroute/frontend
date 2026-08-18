import { describe, expect, it } from 'vitest'
import { interpolateHexColor, splitLineIntoGradientPieces } from './route-gradient'

describe('route gradient', () => {
  it('interpolates the adjacent route colors', () => {
    expect(interpolateHexColor('#fff0a8', '#f47a3a', 0)).toBe('#fff0a8')
    expect(interpolateHexColor('#fff0a8', '#f47a3a', 1)).toBe('#f47a3a')
  })

  it('keeps original vertices while splitting the geometry', () => {
    const coordinates = [
      { latitude: 37, longitude: 126 },
      { latitude: 37, longitude: 126.001 },
      { latitude: 37.001, longitude: 126.001 },
    ]
    const pieces = splitLineIntoGradientPieces(coordinates, '#fff0a8', '#f47a3a', 4)

    expect(pieces).toHaveLength(4)
    expect(pieces[0].coordinates[0]).toEqual(coordinates[0])
    expect(pieces.at(-1)?.coordinates.at(-1)).toEqual(coordinates.at(-1))
    expect(pieces.flatMap((piece) => piece.coordinates)).toContainEqual(coordinates[1])
  })
})
