import type { BaseMapScene, MapMarker } from './types'

type PlaceSceneOverlay = Pick<BaseMapScene, 'markers'> & Partial<Pick<BaseMapScene, 'center' | 'zoom'>>

const clamp = (minimum: number, value: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

export function buildPlaceMarkerSceneOverlay(markers: MapMarker[]): PlaceSceneOverlay {
  if (markers.length === 0) return { markers }

  const selected = markers.find((marker) => marker.selected)
  if (selected) {
    return {
      markers,
      center: {
        latitude: selected.position.latitude - 0.0032,
        longitude: selected.position.longitude,
      },
      zoom: 15.8,
    }
  }
  if (markers.length === 1) {
    return { markers, center: markers[0].position, zoom: 16.2 }
  }

  const latitudes = markers.map((marker) => marker.position.latitude)
  const longitudes = markers.map((marker) => marker.position.longitude)
  const south = Math.min(...latitudes)
  const north = Math.max(...latitudes)
  const west = Math.min(...longitudes)
  const east = Math.max(...longitudes)
  const latitudeSpan = Math.max(0.0012, north - south)
  const longitudeSpan = Math.max(0.0012, east - west)
  const longitudeZoom = Math.log2((360 * 1.45) / (longitudeSpan * 1.35))
  const latitudeZoom = Math.log2((170 * 2.25) / (latitudeSpan * 1.45))

  return {
    markers,
    center: { latitude: (south + north) / 2, longitude: (west + east) / 2 },
    zoom: clamp(12.6, Math.min(longitudeZoom, latitudeZoom), 15.4),
  }
}
