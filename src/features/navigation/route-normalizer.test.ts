import { describe, expect, it } from 'vitest'
import { normalizeWalkRoute } from './route-normalizer'

describe('normalizeWalkRoute', () => {
  it('preserves MultiLineString parts and joins only continuous parts', () => {
    const route = normalizeWalkRoute({
      routeKey: 'continuous',
      origin: 'COMPARISON_ALTERNATIVE',
      name: '추천 대안',
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[126.99, 37.56], [126.991, 37.561]],
          [[126.991, 37.561], [126.992, 37.562]],
        ],
      },
    })

    expect(route.coordinateParts).toHaveLength(2)
    expect(route.navigationPolyline).toHaveLength(3)
  })

  it('does not create a fake segment between disconnected parts', () => {
    const route = normalizeWalkRoute({
      routeKey: 'disconnected',
      origin: 'COURSE_DETAIL',
      name: '분리된 코스',
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[126.99, 37.56], [126.991, 37.561]],
          [[127.1, 37.7], [127.101, 37.701]],
        ],
      },
    })

    expect(route.coordinateParts).toHaveLength(2)
    expect(route.navigationPolyline).toBeUndefined()
  })
})

