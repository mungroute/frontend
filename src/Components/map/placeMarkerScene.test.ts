import { describe, expect, it } from 'vitest'
import { buildPlaceMarkerSceneOverlay } from './placeMarkerScene'
import type { MapMarker } from './types'

const marker = (id: string, latitude: number, longitude: number, selected = false): MapMarker => ({
  id,
  position: { latitude, longitude },
  category: 'cafe',
  selected,
})

describe('buildPlaceMarkerSceneOverlay', () => {
  it('fits multiple results into a clustered overview', () => {
    const result = buildPlaceMarkerSceneOverlay([
      marker('west', 37.55, 126.97),
      marker('east', 37.58, 127.03),
    ])

    expect(result.center).toEqual({ latitude: 37.565, longitude: 127 })
    expect(result.zoom).toBeGreaterThanOrEqual(12.6)
    expect(result.zoom).toBeLessThan(15.4)
  })

  it('places the selected marker above center so the bottom card does not cover it', () => {
    const selected = marker('selected', 37.563, 127.001, true)
    const result = buildPlaceMarkerSceneOverlay([selected, marker('other', 37.57, 127.01)])

    expect(result.center?.longitude).toBe(selected.position.longitude)
    expect(result.center?.latitude).toBeLessThan(selected.position.latitude)
    expect(result.zoom).toBe(15.8)
  })
})
