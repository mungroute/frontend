import Feature from 'ol/Feature.js'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { fromLonLat } from 'ol/proj.js'
import XYZ from 'ol/source/XYZ.js'
import VectorSource from 'ol/source/Vector.js'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js'
import { unByKey } from 'ol/Observable.js'
import type { EventsKey } from 'ol/events.js'
import type { Geometry } from 'ol/geom.js'
import type { BaseMapAdapter, BaseMapScene, MapMarker } from './types'
import 'ol/ol.css'

type VWorldMapAdapterOptions = {
  apiKey: string
  layer?: 'Base' | 'gray' | 'midnight' | 'Satellite'
}

export function buildVWorldTileUrl(apiKey: string, layer = 'Base') {
  return `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(apiKey)}/${layer}/{z}/{y}/{x}.png`
}

function markerStyle(marker: MapMarker) {
  const finish = marker.kind === 'finish'
  const current = marker.kind === 'current-location'
  return new Style({
    image: new CircleStyle({
      radius: current ? 8 : 7,
      fill: new Fill({ color: finish ? '#2f855a' : '#f47a3a' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
  })
}

function applyScene(map: Map, source: VectorSource<Feature<Geometry>>, scene: BaseMapScene) {
  map.getView().setCenter(fromLonLat([scene.center.longitude, scene.center.latitude]))
  map.getView().setZoom(scene.zoom)
  source.clear()

  scene.routes?.forEach((route) => {
    const feature = new Feature({
      geometry: new LineString(route.coordinates.map((coordinate) => fromLonLat([coordinate.longitude, coordinate.latitude]))),
    })
    feature.setId(route.id)
    feature.setStyle(new Style({
      stroke: new Stroke({ color: route.color ?? '#f47a3a', width: route.width ?? 5 }),
    }))
    source.addFeature(feature)
  })

  scene.markers?.forEach((marker) => {
    const feature = new Feature({
      geometry: new Point(fromLonLat([marker.position.longitude, marker.position.latitude])),
    })
    feature.setId(marker.id)
    feature.setStyle(markerStyle(marker))
    source.addFeature(feature)
  })
}

export function createVWorldMapAdapter({ apiKey, layer = 'Base' }: VWorldMapAdapterOptions): BaseMapAdapter {
  if (!apiKey.trim()) throw new Error('VWorld API key is required')

  return {
    mount(container, initialScene) {
      const tileSource = new XYZ({
        url: buildVWorldTileUrl(apiKey, layer),
        crossOrigin: 'anonymous',
        attributions: '© VWorld',
      })
      const vectorSource = new VectorSource<Feature<Geometry>>()
      const map = new Map({
        target: container,
        layers: [
          new TileLayer({ source: tileSource }),
          new VectorLayer({ source: vectorSource }),
        ],
        view: new View({
          center: fromLonLat([initialScene.center.longitude, initialScene.center.latitude]),
          zoom: initialScene.zoom,
          minZoom: 7,
          maxZoom: 19,
        }),
        controls: defaultControls({ zoom: false, rotate: false }),
      })

      applyScene(map, vectorSource, initialScene)

      let settled = false
      let tileReadyKey: EventsKey | undefined
      let tileErrorKey: EventsKey | undefined
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      const ready = new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          if (tileReadyKey) unByKey(tileReadyKey)
          if (tileErrorKey) unByKey(tileErrorKey)
          if (timeoutId) clearTimeout(timeoutId)
        }
        tileReadyKey = tileSource.on('tileloadend', () => {
          if (settled) return
          settled = true
          cleanup()
          resolve()
        })
        tileErrorKey = tileSource.on('tileloaderror', () => {
          if (settled) return
          settled = true
          cleanup()
          reject(new Error('VWorld map tiles could not be loaded'))
        })
        timeoutId = setTimeout(() => {
          if (settled) return
          settled = true
          cleanup()
          reject(new Error('VWorld map tile loading timed out'))
        }, 8_000)
      })

      return {
        ready,
        update(nextScene) {
          applyScene(map, vectorSource, nextScene)
        },
        destroy() {
          settled = true
          if (tileReadyKey) unByKey(tileReadyKey)
          if (tileErrorKey) unByKey(tileErrorKey)
          if (timeoutId) clearTimeout(timeoutId)
          map.setTarget(undefined)
          map.dispose()
        },
      }
    },
  }
}
