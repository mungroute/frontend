import { describe, expect, it } from 'vitest'
import { smoothHeading } from './heading-smoothing'
import { bearingBetween } from './bearing'
import { classifyManeuver, nextManeuver } from './maneuver'
import { buildRouteProgress, chevronsAhead, prepareRoute, projectOnRoute } from './route-progress'

describe('navigation calculations', () => {
  it('smooths across north without rotating the long way around', () => {
    expect(smoothHeading(359, 1, 0.5, 0)).toBeCloseTo(0)
    expect(smoothHeading(1, 359, 0.5, 0)).toBeCloseTo(0)
  })

  it('calculates cardinal bearings from coordinate pairs', () => {
    expect(bearingBetween(
      { latitude: 37.56, longitude: 126.99 },
      { latitude: 37.561, longitude: 126.99 },
    )).toBeCloseTo(0)
    expect(bearingBetween(
      { latitude: 37.56, longitude: 126.99 },
      { latitude: 37.56, longitude: 126.991 },
    )).toBeCloseTo(90)
  })

  it('classifies basic turns', () => {
    expect(classifyManeuver(-70)).toBe('LEFT')
    expect(classifyManeuver(30)).toBe('SLIGHT_RIGHT')
    expect(classifyManeuver(150)).toBe('SHARP_RIGHT')
  })

  it('skips dense straight vertices and keeps the next meaningful right turn', () => {
    const prepared = prepareRoute([
      { latitude: 37.56, longitude: 126.98 },
      { latitude: 37.5602, longitude: 126.98 },
      { latitude: 37.5604, longitude: 126.98 },
      { latitude: 37.5606, longitude: 126.98 },
      { latitude: 37.5606, longitude: 126.98025 },
      { latitude: 37.5606, longitude: 126.9805 },
    ])!

    expect(nextManeuver(prepared, 0)).toEqual(expect.objectContaining({ kind: 'RIGHT' }))
  })

  it('does not announce every straight polyline vertex as a maneuver', () => {
    const prepared = prepareRoute([
      { latitude: 37.56, longitude: 126.98 },
      { latitude: 37.5602, longitude: 126.98 },
      { latitude: 37.5604, longitude: 126.98 },
      { latitude: 37.5606, longitude: 126.98 },
    ])!

    expect(nextManeuver(prepared, 0)).toBeUndefined()
  })

  it('prefers the beginning of a closed loop for initial progress', () => {
    const start = { latitude: 37.56, longitude: 126.99 }
    const prepared = prepareRoute([
      start,
      { latitude: 37.561, longitude: 126.99 },
      { latitude: 37.561, longitude: 126.991 },
      { latitude: 37.56, longitude: 126.991 },
      start,
    ])!
    const projection = projectOnRoute({ latitude: 37.56001, longitude: 126.99001 }, prepared)
    expect(projection.progressM / prepared.totalDistanceM).toBeLessThan(0.1)
  })

  it('keeps progress monotonic and exposes passed/remaining geometry', () => {
    const prepared = prepareRoute([
      { latitude: 37.56, longitude: 126.99 },
      { latitude: 37.561, longitude: 126.99 },
      { latitude: 37.562, longitude: 126.99 },
    ])!
    const first = projectOnRoute({ latitude: 37.5615, longitude: 126.99 }, prepared)
    const second = projectOnRoute({ latitude: 37.5613, longitude: 126.99 }, prepared, first.progressM)
    const geometry = buildRouteProgress(prepared, second)
    expect(second.progressM).toBeGreaterThanOrEqual(first.progressM)
    expect(geometry.passed.length).toBeGreaterThan(1)
    expect(geometry.remaining.length).toBeGreaterThan(1)
  })

  it('keeps prior progress when the accepted fix is off route', () => {
    const prepared = prepareRoute([
      { latitude: 37.56, longitude: 126.99 },
      { latitude: 37.562, longitude: 126.99 },
    ])!
    const projection = projectOnRoute(
      { latitude: 37.57, longitude: 127.01 },
      prepared,
      50,
    )

    expect(projection.offRoute).toBe(true)
    expect(projection.progressM).toBe(50)
  })

  it('limits chevrons to four positions ahead of current progress', () => {
    const prepared = prepareRoute([
      { latitude: 37.56, longitude: 126.99 },
      { latitude: 37.57, longitude: 126.99 },
    ])!
    const chevrons = chevronsAhead(prepared, 100)

    expect(chevrons).toHaveLength(4)
    expect(chevrons.every((item) => item.distanceM > 100 && item.distanceM < prepared.totalDistanceM)).toBe(true)
  })

  it('can densely cover the remaining route for repeated direction guidance', () => {
    const prepared = prepareRoute([
      { latitude: 37.56, longitude: 126.99 },
      { latitude: 37.57, longitude: 126.99 },
    ])!
    const chevrons = chevronsAhead(prepared, 0, 48, 35)

    expect(chevrons.length).toBeGreaterThan(20)
    expect(chevrons[0].distanceM).toBe(30)
    expect(chevrons[1].distanceM - chevrons[0].distanceM).toBe(35)
  })
})
