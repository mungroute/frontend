import Feature from 'ol/Feature.js'
import Map from 'ol/Map.js'
import Overlay from 'ol/Overlay.js'
import View from 'ol/View.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import XYZ from 'ol/source/XYZ.js'
import VectorSource from 'ol/source/Vector.js'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js'
import { unByKey } from 'ol/Observable.js'
import type { EventsKey } from 'ol/events.js'
import type { Geometry } from 'ol/geom.js'
import type { BaseMapAdapter, BaseMapScene, MapClickEvent, MapMarker } from './types'
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
  const start = marker.kind === 'start'

  if (start || finish) {
    return new Style({
      image: new CircleStyle({
        radius: 11,
        fill: new Fill({ color: finish ? '#25242a' : '#ffffff' }),
        stroke: new Stroke({ color: finish ? '#ffffff' : '#f47a3a', width: 3 }),
      }),
      text: new Text({
        text: finish ? 'E' : 'S',
        font: '900 9px Arial, sans-serif',
        fill: new Fill({ color: finish ? '#ffffff' : '#e9682d' }),
      }),
    })
  }

  return new Style({
    image: new CircleStyle({
      radius: current ? 8 : 7,
      fill: new Fill({ color: current ? '#f47a3a' : finish ? '#2f855a' : '#f47a3a' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
  })
}

function createSelectedSegmentElement(marker: MapMarker) {
  const element = document.createElement('div')
  element.className = 'map-selected-segment-label'
  const text = document.createElement('strong')
  text.textContent = `${marker.label ?? ''}번 구간`
  const pointer = document.createElement('span')
  pointer.setAttribute('aria-hidden', 'true')
  element.append(text, pointer)
  return element
}

function createDogLocationElement(marker: MapMarker) {
  const element = document.createElement('div')
  element.className = 'map-dog-location-marker'

  const card = document.createElement('div')
  card.className = 'map-dog-location-marker__card'
  const image = document.createElement('img')
  image.className = 'map-dog-location-marker__avatar'
  image.src = marker.profileImageSrc || '/assets/shared/dog-profile-default.svg'
  image.alt = ''
  const label = document.createElement('strong')
  label.textContent = marker.label || '내 위치'
  card.append(image, label)

  const pointer = document.createElement('span')
  pointer.className = 'map-dog-location-marker__pointer'
  const dot = document.createElement('span')
  dot.className = 'map-dog-location-marker__dot'
  element.append(card, pointer, dot)
  return element
}

function applyScene(
  map: Map,
  source: VectorSource<Feature<Geometry>>,
  markerOverlays: Overlay[],
  animatedStrokes: Stroke[],
  pulsingStrokes: Array<{ stroke: Stroke; baseWidth: number }>,
  scene: BaseMapScene,
  updateView = true,
) {
  if (updateView) {
    map.getView().setCenter(fromLonLat([scene.center.longitude, scene.center.latitude]))
    map.getView().setZoom(scene.zoom)
  }
  source.clear()
  animatedStrokes.length = 0
  pulsingStrokes.length = 0
  markerOverlays.forEach((overlay) => map.removeOverlay(overlay))
  markerOverlays.length = 0

  scene.routes?.forEach((route) => {
    const feature = new Feature({
      geometry: new LineString(route.coordinates.map((coordinate) => fromLonLat([coordinate.longitude, coordinate.latitude]))),
    })
    feature.setId(route.id)
    const routeWidth = route.width ?? 5
    const lineCap = route.lineCap ?? 'round'
    const routeStyles = [
      ...(route.outlineColor ? [new Style({
        stroke: new Stroke({
          color: route.outlineColor,
          width: route.outlineWidth ?? routeWidth + 4,
          lineCap,
          lineJoin: 'round',
        }),
      })] : []),
      new Style({
        stroke: new Stroke({
          color: route.color ?? '#f47a3a',
          width: routeWidth,
          lineCap,
          lineJoin: 'round',
        }),
      }),
    ]
    if (route.pulse) {
      const baseWidth = (route.outlineWidth ?? routeWidth + 4) + 3
      const pulseStroke = new Stroke({
        color: 'rgba(255, 255, 255, .22)',
        width: baseWidth,
        lineCap,
        lineJoin: 'round',
      })
      routeStyles.unshift(new Style({ stroke: pulseStroke }))
      pulsingStrokes.push({ stroke: pulseStroke, baseWidth })
    }
    if (route.animated) {
      const animatedStroke = new Stroke({
        color: 'rgba(255, 255, 255, .68)',
        width: 3,
        lineDash: [1, 16],
        lineDashOffset: 0,
        lineCap,
        lineJoin: 'round',
      })
      routeStyles.push(new Style({ stroke: animatedStroke }))
      animatedStrokes.push(animatedStroke)
    }
    feature.setStyle(routeStyles)
    source.addFeature(feature)

  })

  scene.markers?.forEach((marker) => {
    if (marker.kind === 'current-location') {
      const overlay = new Overlay({
        element: createDogLocationElement(marker),
        position: fromLonLat([marker.position.longitude, marker.position.latitude]),
        positioning: 'bottom-center',
        stopEvent: false,
      })
      markerOverlays.push(overlay)
      map.addOverlay(overlay)
      return
    }
    if (marker.kind === 'selected-segment') {
      const overlay = new Overlay({
        element: createSelectedSegmentElement(marker),
        position: fromLonLat([marker.position.longitude, marker.position.latitude]),
        positioning: 'bottom-center',
        offset: [0, -9],
        stopEvent: false,
      })
      markerOverlays.push(overlay)
      map.addOverlay(overlay)
      return
    }
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
      const markerOverlays: Overlay[] = []
      const animatedStrokes: Stroke[] = []
      const pulsingStrokes: Array<{ stroke: Stroke; baseWidth: number }> = []
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

      applyScene(map, vectorSource, markerOverlays, animatedStrokes, pulsingStrokes, initialScene)

      let animationFrameId: number | undefined
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      const animateRoutes = (timestamp: number) => {
        const dashOffset = -((timestamp / 42) % 17)
        animatedStrokes.forEach((stroke) => stroke.setLineDashOffset(dashOffset))
        const pulseProgress = (Math.sin(timestamp / 360) + 1) / 2
        pulsingStrokes.forEach(({ stroke, baseWidth }) => {
          stroke.setWidth(baseWidth + pulseProgress * 4)
          stroke.setColor(`rgba(255, 255, 255, ${0.12 + pulseProgress * 0.28})`)
        })
        if (animatedStrokes.length || pulsingStrokes.length) vectorSource.changed()
        animationFrameId = window.requestAnimationFrame(animateRoutes)
      }
      if (!reduceMotion) animationFrameId = window.requestAnimationFrame(animateRoutes)

      let currentScene = initialScene
      let clickHandler: ((event: MapClickEvent) => void) | undefined
      const mapClickKey = map.on('singleclick', (event) => {
        if (!clickHandler) return
        const [longitude, latitude] = toLonLat(event.coordinate)
        const [width, height] = map.getSize() ?? [1, 1]
        clickHandler({
          coordinate: { latitude, longitude },
          xPercent: Math.min(100, Math.max(0, (event.pixel[0] / Math.max(width, 1)) * 100)),
          yPercent: Math.min(100, Math.max(0, (event.pixel[1] / Math.max(height, 1)) * 100)),
        })
      })

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
          const viewChanged = nextScene.center.latitude !== currentScene.center.latitude
            || nextScene.center.longitude !== currentScene.center.longitude
            || nextScene.zoom !== currentScene.zoom
          applyScene(map, vectorSource, markerOverlays, animatedStrokes, pulsingStrokes, nextScene, viewChanged)
          currentScene = nextScene
        },
        setClickHandler(nextHandler) {
          clickHandler = nextHandler
        },
        destroy() {
          settled = true
          if (tileReadyKey) unByKey(tileReadyKey)
          if (tileErrorKey) unByKey(tileErrorKey)
          if (timeoutId) clearTimeout(timeoutId)
          if (animationFrameId !== undefined) window.cancelAnimationFrame(animationFrameId)
          unByKey(mapClickKey)
          map.setTarget(undefined)
          map.dispose()
        },
      }
    },
  }
}
