import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeWalkRoute } from './route-normalizer'
import {
  clearWalkRoutes,
  readActiveWalkRoute,
  readPendingWalkRoute,
  writeActiveWalkRoute,
  writePendingWalkRoute,
} from './route-storage'

const route = normalizeWalkRoute({
  routeKey: 'stored-route',
  backendId: 'custom:42',
  origin: 'COURSE_DETAIL',
  name: '저장 코스',
  geometry: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
})

describe('walk route session storage', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('round-trips pending and active snapshots with derived coordinates rebuilt', () => {
    writePendingWalkRoute({ route, routeRequired: true })
    writeActiveWalkRoute({ sessionId: 42, route })

    expect(readPendingWalkRoute()).toEqual({ route, routeRequired: true })
    expect(readActiveWalkRoute()).toEqual({ sessionId: 42, route })
  })

  it('discards malformed JSON and structurally invalid routes safely', () => {
    window.sessionStorage.setItem('mungroute.walk-route.pending.v1', '{broken')
    window.sessionStorage.setItem('mungroute.walk-route.active.v1', JSON.stringify({
      version: 1,
      snapshot: {
        sessionId: 42,
        route: { ...route, geometry: { type: 'LineString', coordinates: [[999, 999]] } },
      },
    }))

    expect(readPendingWalkRoute()).toEqual({ route: null, routeRequired: false })
    expect(readActiveWalkRoute()).toBeUndefined()
    expect(window.sessionStorage.getItem('mungroute.walk-route.pending.v1')).toBeNull()
    expect(window.sessionStorage.getItem('mungroute.walk-route.active.v1')).toBeNull()
  })

  it('clears both snapshots when a walk lifecycle ends', () => {
    writePendingWalkRoute({ route, routeRequired: true })
    writeActiveWalkRoute({ sessionId: 42, route })

    clearWalkRoutes()

    expect(readPendingWalkRoute()).toEqual({ route: null, routeRequired: false })
    expect(readActiveWalkRoute()).toBeUndefined()
  })
})
