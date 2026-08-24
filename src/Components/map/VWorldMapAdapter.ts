import Feature from 'ol/Feature.js'
import Map from 'ol/Map.js'
import Overlay from 'ol/Overlay.js'
import View from 'ol/View.js'
import Point from 'ol/geom/Point.js'
import LineString from 'ol/geom/LineString.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import { boundingExtent } from 'ol/extent.js'
import XYZ from 'ol/source/XYZ.js'
import VectorSource from 'ol/source/Vector.js'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js'
import { unByKey } from 'ol/Observable.js'
import type { EventsKey } from 'ol/events.js'
import type { Geometry } from 'ol/geom.js'
import type { BaseMapAdapter, BaseMapScene, MapClickEvent, MapMarker, MapMarkerCategory } from './types'
import { createProfileLocationMarkerElement } from './profileLocationMarker'
import 'ol/ol.css'

type VWorldMapAdapterOptions = {
  apiKey: string
  layer?: 'Base' | 'gray' | 'midnight' | 'Satellite'
}

export function buildVWorldTileUrl(apiKey: string, layer = 'Base') {
  return `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(apiKey)}/${layer}/{z}/{y}/{x}.png`
}

function markerStyle(marker: MapMarker) {
  const current = marker.kind === 'current-location'
  const junction = marker.kind === 'detour-junction'
  const place = Boolean(marker.category || marker.categoryCode)
  const selected = place && marker.selected

  return new Style({
    image: new CircleStyle({
      radius: junction ? (marker.selected ? 6 : 5) : current ? 8 : selected ? 20 : place ? 17 : 7,
      fill: new Fill({ color: junction ? '#20bfa9' : selected || !place ? '#f47a3a' : '#fde7d8' }),
      stroke: new Stroke({ color: junction ? '#ffffff' : selected ? '#ffffff' : place ? '#f47a3a' : '#ffffff', width: junction ? 2 : 3 }),
    }),
    text: place ? new Text({
      text: marker.categoryCode,
      font: `700 ${selected ? 14 : 12}px "Noto Sans KR", sans-serif`,
      fill: new Fill({ color: selected ? '#ffffff' : '#f47a3a' }),
    }) : undefined,
  })
}

const markerIconMarkup: Record<MapMarkerCategory, string> = {
  restaurant: '<svg viewBox="0 0 24 24"><path d="M3 2v7a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V2M7 2v20M21 15V2a5 5 0 0 0-5 5v8h5Zm0 0v7"/></svg>',
  hospital: '<svg viewBox="0 0 24 24"><path d="M11 2v5M8.5 4.5h5M6 3v6a5 5 0 0 0 10 0V3M11 14v2a4 4 0 0 0 8 0v-1"/><circle cx="19" cy="12" r="2"/></svg>',
  pharmacy: '<svg viewBox="0 0 24 24"><path d="m10.5 20.5-7-7a4.24 4.24 0 0 1 6-6l7 7a4.24 4.24 0 0 1-6 6Z"/><path d="m8.5 9.5 6 6"/><path d="M18 3v6M15 6h6"/></svg>',
  cafe: '<svg viewBox="0 0 24 24"><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 10h1a3 3 0 0 1 0 6h-2M6 2v2M10 2v2M14 2v2M4 22h16"/></svg>',
  convenience: '<svg viewBox="0 0 24 24"><path d="M6 8V6a6 6 0 0 1 12 0v2M4 8h16l-1 13H5L4 8Z"/><path d="M9 11v1M15 11v1"/></svg>',
  grooming: '<svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.7 8.4 12.3 6.1M8.7 15.6 21 9.5"/></svg>',
  'dog-park': '<svg viewBox="0 0 24 24"><circle cx="7" cy="5" r="2"/><circle cx="17" cy="5" r="2"/><circle cx="4" cy="11" r="2"/><circle cx="20" cy="11" r="2"/><path d="M8 20c-3 0-4-2-3-4 1-3 4-5 7-5s6 2 7 5c1 2 0 4-3 4-2 0-2-1-4-1s-2 1-4 1Z"/></svg>',
}

const resolveMarkerCategory = (marker: MapMarker): MapMarkerCategory | undefined => {
  if (marker.category) return marker.category
  switch (marker.categoryCode) {
    case '식': return 'restaurant'
    case '병': return 'hospital'
    case '약': return 'pharmacy'
    case '카': return 'cafe'
    case '편': return 'convenience'
    default: return undefined
  }
}

function createPlaceMarkerElement(marker: MapMarker, index: number) {
  const category = resolveMarkerCategory(marker) ?? 'restaurant'
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'map-provider-place-marker'
  element.dataset.interactionId = marker.interactionId ?? marker.id
  element.dataset.latitude = String(marker.position.latitude)
  element.dataset.longitude = String(marker.position.longitude)
  element.dataset.category = category
  element.dataset.selected = marker.selected ? 'true' : 'false'
  element.setAttribute('aria-label', marker.label ? `${marker.label} 장소 선택` : '장소 선택')
  element.style.setProperty('--marker-delay', `${Math.min(index * 55, 550)}ms`)

  if (marker.selected) {
    const halo = document.createElement('span')
    halo.className = 'map-provider-place-marker__halo'
    halo.setAttribute('aria-hidden', 'true')
    element.append(halo)
  }
  const icon = document.createElement('span')
  icon.className = 'map-provider-place-marker__icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML = markerIconMarkup[category]
  element.append(icon)
  if (marker.selected && marker.label) {
    const label = document.createElement('strong')
    label.className = 'map-provider-place-marker__label'
    label.textContent = marker.label
    element.append(label)
  }
  return element
}

function createPlaceClusterElement(markers: MapMarker[], latitude: number, longitude: number, index: number) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'map-provider-place-cluster'
  element.dataset.cluster = 'true'
  element.dataset.latitude = String(latitude)
  element.dataset.longitude = String(longitude)
  element.setAttribute('aria-label', `이 지역 장소 ${markers.length}개 확대해서 보기`)
  element.style.setProperty('--marker-delay', `${Math.min(index * 55, 440)}ms`)
  const count = document.createElement('strong')
  count.textContent = String(markers.length)
  const dots = document.createElement('span')
  dots.className = 'map-provider-place-cluster__dots'
  dots.setAttribute('aria-hidden', 'true')
  element.append(count, dots)
  return element
}

type PlaceMarkerGroup = {
  markers: MapMarker[]
  latitude: number
  longitude: number
  pixel: [number, number]
}

function clusterPlaceMarkers(map: Map, markers: MapMarker[]): PlaceMarkerGroup[] {
  const zoom = map.getView().getZoom() ?? 17
  if (zoom >= 17 || markers.length < 4) {
    return markers.map((marker) => ({
      markers: [marker],
      latitude: marker.position.latitude,
      longitude: marker.position.longitude,
      pixel: map.getPixelFromCoordinate(fromLonLat([marker.position.longitude, marker.position.latitude])) as [number, number],
    }))
  }
  const clusterRadius = zoom < 14 ? 72 : zoom < 16 ? 56 : 44
  const groups: PlaceMarkerGroup[] = []
  markers.forEach((marker) => {
    if (marker.selected) {
      groups.push({
        markers: [marker],
        latitude: marker.position.latitude,
        longitude: marker.position.longitude,
        pixel: map.getPixelFromCoordinate(fromLonLat([marker.position.longitude, marker.position.latitude])) as [number, number],
      })
      return
    }
    const pixel = map.getPixelFromCoordinate(fromLonLat([marker.position.longitude, marker.position.latitude])) as [number, number]
    const group = groups.find((candidate) => candidate.markers.every((item) => !item.selected)
      && Math.hypot(candidate.pixel[0] - pixel[0], candidate.pixel[1] - pixel[1]) <= clusterRadius)
    if (!group) {
      groups.push({ markers: [marker], latitude: marker.position.latitude, longitude: marker.position.longitude, pixel })
      return
    }
    group.markers.push(marker)
    const count = group.markers.length
    group.latitude = (group.latitude * (count - 1) + marker.position.latitude) / count
    group.longitude = (group.longitude * (count - 1) + marker.position.longitude) / count
    group.pixel = map.getPixelFromCoordinate(fromLonLat([group.longitude, group.latitude])) as [number, number]
  })
  return groups
}

function createEndpointElement(marker: MapMarker) {
  const finish = marker.kind === 'finish'
  const element = document.createElement('div')
  element.className = `map-route-endpoint map-route-endpoint--${finish ? 'finish' : 'start'}`
  const icon = document.createElement('span')
  icon.className = 'map-route-endpoint__icon'
  icon.textContent = finish ? '⚑' : ''
  icon.setAttribute('aria-hidden', 'true')
  const label = document.createElement('strong')
  label.textContent = marker.label || (finish ? '도착' : '출발')
  element.append(icon, label)
  return element
}

function createRouteCalloutElement(marker: MapMarker) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'map-route-callout'
  element.dataset.interactionId = marker.interactionId ?? marker.id
  element.dataset.latitude = String(marker.position.latitude)
  element.dataset.longitude = String(marker.position.longitude)
  element.dataset.selected = marker.selected ? 'true' : 'false'
  element.setAttribute('aria-label', `${marker.label ?? '추천 이유'} 변경 구간 선택`)
  const dot = document.createElement('span')
  dot.setAttribute('aria-hidden', 'true')
  const label = document.createElement('strong')
  label.textContent = marker.label ?? ''
  element.append(dot, label)
  return element
}

type ChevronGlyph = {
  point: Point
  text: Text
  fill: Fill
  style: Style
}

type ChevronFlow = {
  feature: Feature<Geometry>
  geometry: LineString
  baseStyles: Style[]
  glyphs: ChevronGlyph[]
  waitForDraw: boolean
}

type PendingDrawFeature = {
  feature: Feature<Geometry>
  styles: Style[]
  threshold: number
  durationMs: number
}

const pointAndBearingAtDistance = (coordinates: number[][], cumulative: number[], target: number) => {
  const segmentIndex = cumulative.findIndex((distance, index) => index > 0 && distance >= target)
  const resolvedIndex = segmentIndex < 1 ? coordinates.length - 1 : segmentIndex
  const start = coordinates[Math.max(0, resolvedIndex - 1)]
  const end = coordinates[resolvedIndex]
  const segmentStart = cumulative[Math.max(0, resolvedIndex - 1)]
  const segmentLength = Math.max(0.0001, cumulative[resolvedIndex] - segmentStart)
  const progress = Math.min(1, Math.max(0, (target - segmentStart) / segmentLength))
  return {
    coordinate: [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ],
    rotation: -Math.atan2(end[1] - start[1], end[0] - start[0]),
  }
}

const createChevronGlyph = (): ChevronGlyph => {
  const point = new Point([0, 0])
  const fill = new Fill({ color: 'rgba(255, 249, 238, .84)' })
  const text = new Text({
    text: '›',
    font: '800 11px Arial, sans-serif',
    fill,
    stroke: new Stroke({ color: 'rgba(88, 55, 37, .14)', width: 1 }),
    rotateWithView: true,
  })
  return { point, text, fill, style: new Style({ geometry: point, text, zIndex: 5 }) }
}

const updateChevronFlow = (flow: ChevronFlow, resolution: number, timestamp: number, animated: boolean) => {
  const coordinates = flow.geometry.getCoordinates()
  if (coordinates.length < 2 || !Number.isFinite(resolution) || resolution <= 0) {
    flow.feature.setStyle(flow.baseStyles)
    return
  }
  const cumulative = coordinates.map((coordinate, index) => index === 0
    ? 0
    : Math.hypot(coordinate[0] - coordinates[index - 1][0], coordinate[1] - coordinates[index - 1][1]))
    .reduce<number[]>((distances, segmentLength, index) => {
      distances.push(index === 0 ? 0 : distances[index - 1] + segmentLength)
      return distances
    }, [])
  const totalDistance = cumulative.at(-1) ?? 0
  const totalPixels = totalDistance / resolution
  const endpointMarginPixels = Math.min(30, totalPixels * 0.18)
  const usablePixels = totalPixels - endpointMarginPixels * 2
  if (usablePixels < 18) {
    flow.feature.setStyle(flow.baseStyles)
    return
  }
  const chevronCount = Math.max(1, Math.min(8, Math.floor(usablePixels / 76)))
  while (flow.glyphs.length < chevronCount) flow.glyphs.push(createChevronGlyph())
  const spacingPixels = usablePixels / chevronCount
  const offsetPixels = animated ? (timestamp * 0.018) % spacingPixels : spacingPixels * 0.35
  const fadePixels = Math.min(20, usablePixels / 3)
  const visibleGlyphs = flow.glyphs.slice(0, chevronCount)

  visibleGlyphs.forEach((glyph, index) => {
    const localPixels = (index * spacingPixels + offsetPixels) % usablePixels
    const targetDistance = (endpointMarginPixels + localPixels) * resolution
    const placement = pointAndBearingAtDistance(coordinates, cumulative, targetDistance)
    const edgeDistance = Math.min(localPixels, usablePixels - localPixels)
    const opacity = Math.min(1, edgeDistance / Math.max(1, fadePixels)) * 0.84
    glyph.point.setCoordinates(placement.coordinate)
    glyph.text.setRotation(placement.rotation)
    glyph.fill.setColor(`rgba(255, 249, 238, ${opacity.toFixed(3)})`)
  })
  flow.feature.setStyle([...flow.baseStyles, ...visibleGlyphs.map((glyph) => glyph.style)])
}

const anchoredCenter = (
  coordinate: number[],
  size: number[],
  anchorY: number,
  resolution: number,
  rotation: number,
) => {
  const position = [size[0] / 2, size[1] * anchorY]
  const cosAngle = Math.cos(-rotation)
  let sinAngle = Math.sin(-rotation)
  let rotatedX = coordinate[0] * cosAngle - coordinate[1] * sinAngle
  let rotatedY = coordinate[1] * cosAngle + coordinate[0] * sinAngle
  rotatedX += (size[0] / 2 - position[0]) * resolution
  rotatedY += (position[1] - size[1] / 2) * resolution
  sinAngle = -sinAngle
  return [
    rotatedX * cosAngle - rotatedY * sinAngle,
    rotatedY * cosAngle + rotatedX * sinAngle,
  ]
}

function applySceneView(map: Map, scene: BaseMapScene, duration = 0) {
  const fitCoordinates = scene.viewFit?.coordinates.filter((coordinate) => (
    Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude)
  )) ?? []
  const view = map.getView()
  const requestedRotation = Number.isFinite(scene.bearing) ? (scene.bearing ?? 0) * Math.PI / 180 : 0
  const currentRotation = view.getRotation()
  const rotation = currentRotation + Math.atan2(
    Math.sin(requestedRotation - currentRotation),
    Math.cos(requestedRotation - currentRotation),
  )

  if (fitCoordinates.length > 0) {
    map.updateSize()
    view.setRotation(rotation)
    const projected = fitCoordinates.map((coordinate) => fromLonLat([
      coordinate.longitude,
      coordinate.latitude,
    ]))
    if (projected.length === 1) {
      view.animate({
        center: projected[0],
        zoom: Math.min(scene.viewFit?.maxZoom ?? 17, scene.zoom),
        duration,
      })
      return
    }
    view.fit(boundingExtent(projected), {
      size: map.getSize(),
      padding: scene.viewFit?.padding ?? [24, 24, 24, 24],
      maxZoom: scene.viewFit?.maxZoom ?? 17,
      duration,
    })
    return
  }

  map.updateSize()
  const coordinate = fromLonLat([scene.center.longitude, scene.center.latitude])
  const size = map.getSize() ?? [1, 1]
  const resolution = view.getResolutionForZoom(scene.zoom)
  const bottomInset = Math.min(size[1] * 0.8, Math.max(0, scene.focusBottomInset ?? 0))
  const anchorY = scene.focusAnchorY === undefined
    ? ((size[1] - bottomInset) / 2 + (scene.focusOffsetY ?? 0)) / Math.max(1, size[1])
    : Math.min(0.9, Math.max(0.1, scene.focusAnchorY))
  const center = anchoredCenter(coordinate, size, anchorY, resolution, rotation)
  if (duration > 0) {
    view.animate({
      center,
      zoom: scene.zoom,
      rotation,
      duration,
    })
    return
  }
  view.setCenter(center)
  view.setZoom(scene.zoom)
  view.setRotation(rotation)
}

function applyScene(
  map: Map,
  source: VectorSource<Feature<Geometry>>,
  markerOverlays: Overlay[],
  animatedStrokes: Stroke[],
  pulsingStrokes: Array<{ stroke: Stroke; baseWidth: number }>,
  chevronFlows: ChevronFlow[],
  drawnRouteGroups: Set<string>,
  pendingDrawFeatures: PendingDrawFeature[],
  pendingDrawMarkers: Array<{ element: HTMLElement; threshold: number }>,
  reduceMotion: boolean,
  scene: BaseMapScene,
  updateView = true,
) {
  if (updateView) {
    applySceneView(map, scene)
  }
  source.clear()
  animatedStrokes.length = 0
  pulsingStrokes.length = 0
  chevronFlows.length = 0
  markerOverlays.forEach((overlay) => map.removeOverlay(overlay))
  markerOverlays.length = 0

  pendingDrawFeatures.length = 0
  pendingDrawMarkers.length = 0
  const freshDrawGroups = new Set(
    scene.routes
      ?.filter((route) => route.drawOnLoad && route.drawGroupId && !drawnRouteGroups.has(route.drawGroupId))
      .map((route) => route.drawGroupId as string) ?? [],
  )
  freshDrawGroups.forEach((group) => drawnRouteGroups.add(group))

  scene.routes?.forEach((route) => {
    const geometry = new LineString(route.coordinates.map((coordinate) => fromLonLat([coordinate.longitude, coordinate.latitude])))
    const feature = new Feature({
      geometry,
    })
    feature.setId(route.id)
    const routeWidth = route.width ?? 5
    const lineCap = route.lineCap ?? 'round'
    const routeStyles = [
      ...(route.outlineColor ? [new Style({
        zIndex: route.selected ? 2 : 0,
        stroke: new Stroke({
          color: route.outlineColor,
          width: route.outlineWidth ?? routeWidth + 4,
          lineCap,
          lineJoin: 'round',
          lineDash: route.lineDash,
        }),
      })] : []),
      new Style({
        zIndex: route.selected ? 3 : 1,
        stroke: new Stroke({
          color: route.color ?? '#f47a3a',
          width: routeWidth,
          lineCap,
          lineJoin: 'round',
          lineDash: route.lineDash,
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
      routeStyles.unshift(new Style({ zIndex: 2, stroke: pulseStroke }))
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
      routeStyles.push(new Style({ zIndex: 4, stroke: animatedStroke }))
      animatedStrokes.push(animatedStroke)
    }
    const hoverStyles = routeStyles.map((style) => {
      const stroke = style.getStroke()
      return stroke ? new Style({
        zIndex: style.getZIndex(),
        stroke: new Stroke({
          color: stroke.getColor(),
          width: (stroke.getWidth() ?? routeWidth) + 1.5,
          lineCap,
          lineJoin: 'round',
          lineDash: stroke.getLineDash() ?? undefined,
        }),
      }) : style
    })
    feature.set('interactionId', route.interactionId)
    feature.set('interactive', route.interactive === true)
    feature.set('defaultStyles', routeStyles)
    feature.set('hoverStyles', hoverStyles)
    const shouldDraw = !reduceMotion && route.drawGroupId && freshDrawGroups.has(route.drawGroupId)
    if (shouldDraw) {
      feature.setStyle([])
      pendingDrawFeatures.push({
        feature,
        styles: routeStyles,
        threshold: route.drawOrder ?? 1,
        durationMs: route.drawDurationMs ?? 900,
      })
    } else {
      feature.setStyle(routeStyles)
    }
    source.addFeature(feature)
    if (route.chevrons) {
      const flow: ChevronFlow = {
        feature,
        geometry,
        baseStyles: routeStyles,
        glyphs: [],
        waitForDraw: Boolean(shouldDraw),
      }
      chevronFlows.push(flow)
      if (reduceMotion) updateChevronFlow(flow, map.getView().getResolution() ?? 1, 0, false)
    }

  })

  const startMarker = scene.markers?.find((marker) => marker.kind === 'start')
  const finishMarker = scene.markers?.find((marker) => marker.kind === 'finish')
  const endpointsOverlap = Boolean(startMarker && finishMarker
    && Math.abs(startMarker.position.latitude - finishMarker.position.latitude) < 0.00001
    && Math.abs(startMarker.position.longitude - finishMarker.position.longitude) < 0.00001)

  const placeMarkers = scene.markers?.filter((marker) => Boolean(resolveMarkerCategory(marker))) ?? []
  clusterPlaceMarkers(map, placeMarkers).forEach((group, index) => {
    const element = group.markers.length > 1
      ? createPlaceClusterElement(group.markers, group.latitude, group.longitude, index)
      : createPlaceMarkerElement(group.markers[0], index)
    const overlay = new Overlay({
      element,
      position: fromLonLat([group.longitude, group.latitude]),
      positioning: 'bottom-center',
      offset: [0, -4],
      stopEvent: true,
    })
    markerOverlays.push(overlay)
    map.addOverlay(overlay)
  })

  scene.markers?.forEach((marker) => {
    if (resolveMarkerCategory(marker)) return
    if (marker.kind === 'current-location' || marker.kind === 'profile-location') {
      const interactive = marker.kind === 'profile-location'
      const overlay = new Overlay({
        element: createProfileLocationMarkerElement(marker, { interactive }),
        position: fromLonLat([marker.position.longitude, marker.position.latitude]),
        positioning: 'bottom-center',
        stopEvent: interactive,
      })
      markerOverlays.push(overlay)
      map.addOverlay(overlay)
      return
    }
    if (marker.kind === 'start' || marker.kind === 'finish') {
      const element = createEndpointElement(marker)
      const shouldDelay = !reduceMotion && marker.revealAfterDraw && freshDrawGroups.has(marker.revealAfterDraw)
      if (shouldDelay) {
        element.classList.add('map-route-endpoint--pending')
        pendingDrawMarkers.push({ element, threshold: 1 })
      }
      const overlay = new Overlay({
        element,
        position: fromLonLat([marker.position.longitude, marker.position.latitude]),
        positioning: endpointsOverlap
          ? marker.kind === 'start' ? 'bottom-right' : 'bottom-left'
          : 'bottom-center',
        offset: endpointsOverlap
          ? marker.kind === 'start' ? [-4, -5] : [4, -5]
          : [0, -5],
        stopEvent: false,
      })
      markerOverlays.push(overlay)
      map.addOverlay(overlay)
      return
    }
    if (marker.kind === 'route-callout') {
      const element = createRouteCalloutElement(marker)
      const overlay = new Overlay({
        element,
        position: fromLonLat([marker.position.longitude, marker.position.latitude]),
        positioning: 'bottom-center',
        offset: [0, -12],
        stopEvent: true,
      })
      markerOverlays.push(overlay)
      map.addOverlay(overlay)
      return
    }
    const feature = new Feature({
      geometry: new Point(fromLonLat([marker.position.longitude, marker.position.latitude])),
    })
    feature.setId(marker.id)
    feature.set('interactive', marker.interactive === true)
    feature.set('interactionId', marker.interactionId ?? marker.id)
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
      const chevronFlows: ChevronFlow[] = []
      const drawnRouteGroups = new Set<string>()
      const pendingDrawFeatures: PendingDrawFeature[] = []
      const pendingDrawMarkers: Array<{ element: HTMLElement; threshold: number }> = []
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      const map = new Map({
        target: container,
        layers: [
          new TileLayer({ source: tileSource }),
          new VectorLayer({ source: vectorSource }),
        ],
        view: new View({
          center: fromLonLat([initialScene.center.longitude, initialScene.center.latitude]),
          zoom: initialScene.zoom,
          rotation: Number.isFinite(initialScene.bearing) ? (initialScene.bearing ?? 0) * Math.PI / 180 : 0,
          minZoom: 7,
          maxZoom: 19,
        }),
        controls: defaultControls({ zoom: false, rotate: false }),
        interactions: defaultInteractions({ mouseWheelZoom: initialScene.mouseWheelZoom !== false }),
      })

      applyScene(
        map,
        vectorSource,
        markerOverlays,
        animatedStrokes,
        pulsingStrokes,
        chevronFlows,
        drawnRouteGroups,
        pendingDrawFeatures,
        pendingDrawMarkers,
        reduceMotion,
        initialScene,
      )

      let animationFrameId: number | undefined
      let drawStartedAt = pendingDrawFeatures.length ? performance.now() : undefined
      const animateRoutes = (timestamp: number) => {
        const dashOffset = -((timestamp / 42) % 17)
        animatedStrokes.forEach((stroke) => stroke.setLineDashOffset(dashOffset))
        const pulseProgress = (Math.sin(timestamp / 360) + 1) / 2
        pulsingStrokes.forEach(({ stroke, baseWidth }) => {
          stroke.setWidth(baseWidth + pulseProgress * 4)
          stroke.setColor(`rgba(255, 255, 255, ${0.12 + pulseProgress * 0.28})`)
        })
        if (drawStartedAt !== undefined) {
          const elapsed = timestamp - drawStartedAt
          pendingDrawFeatures.forEach(({ feature, styles, threshold, durationMs }) => {
            const linearProgress = Math.min(1, elapsed / durationMs)
            const easedProgress = 1 - Math.pow(1 - linearProgress, 3)
            if (easedProgress >= threshold && feature.getStyle() !== styles) feature.setStyle(styles)
          })
          const longestDuration = Math.max(
            pendingDrawMarkers.length ? 900 : 1,
            ...pendingDrawFeatures.map((item) => item.durationMs),
          )
          const markerProgress = Math.min(1, elapsed / longestDuration)
          const easedMarkerProgress = 1 - Math.pow(1 - markerProgress, 3)
          pendingDrawMarkers.forEach(({ element, threshold }) => {
            if (easedMarkerProgress >= threshold) element.classList.remove('map-route-endpoint--pending')
          })
          if (elapsed >= longestDuration) {
            pendingDrawFeatures.length = 0
            pendingDrawMarkers.length = 0
            drawStartedAt = undefined
          }
        }
        chevronFlows.forEach((flow) => {
          if (flow.waitForDraw) {
            if (drawStartedAt !== undefined) return
            flow.waitForDraw = false
          }
          updateChevronFlow(flow, map.getView().getResolution() ?? 1, timestamp, true)
        })
        if (animatedStrokes.length || pulsingStrokes.length) vectorSource.changed()
        animationFrameId = window.requestAnimationFrame(animateRoutes)
      }
      if (!reduceMotion) animationFrameId = window.requestAnimationFrame(animateRoutes)

      let currentScene = initialScene
      const resizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
          map.updateSize()
          if (currentScene.viewFit) applySceneView(map, currentScene)
        })
        : undefined
      resizeObserver?.observe(container)
      let clickHandler: ((event: MapClickEvent) => void) | undefined
      const handlePlaceMarkerClick = (event: MouseEvent) => {
        const target = event.target instanceof Element
          ? event.target.closest<HTMLElement>('.map-provider-place-marker, .map-provider-place-cluster, .map-dog-location-marker--interactive, .map-route-callout')
          : null
        if (!target) return
        event.preventDefault()
        event.stopPropagation()
        const latitude = Number(target.dataset.latitude)
        const longitude = Number(target.dataset.longitude)
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
        if (target.dataset.cluster === 'true') {
          map.getView().animate({
            center: fromLonLat([longitude, latitude]),
            zoom: Math.min(19, (map.getView().getZoom() ?? 14) + 2),
            duration: reduceMotion ? 0 : 320,
          })
          return
        }
        if (!clickHandler) return
        const viewportRect = map.getViewport().getBoundingClientRect()
        const markerRect = target.getBoundingClientRect()
        clickHandler({
          coordinate: { latitude, longitude },
          xPercent: Math.min(100, Math.max(0, ((markerRect.left + markerRect.width / 2 - viewportRect.left) / Math.max(1, viewportRect.width)) * 100)),
          yPercent: Math.min(100, Math.max(0, ((markerRect.top + markerRect.height / 2 - viewportRect.top) / Math.max(1, viewportRect.height)) * 100)),
          featureId: target.dataset.interactionId,
        })
      }
      map.getViewport().addEventListener('click', handlePlaceMarkerClick)
      const mapClickKey = map.on('singleclick', (event) => {
        if (!clickHandler) return
        const selectedFeature = map.getFeaturesAtPixel(event.pixel, { hitTolerance: 9 })
          .find((feature) => feature.get('interactive') === true)
        const [longitude, latitude] = toLonLat(event.coordinate)
        const [width, height] = map.getSize() ?? [1, 1]
        clickHandler({
          coordinate: { latitude, longitude },
          xPercent: Math.min(100, Math.max(0, (event.pixel[0] / Math.max(width, 1)) * 100)),
          yPercent: Math.min(100, Math.max(0, (event.pixel[1] / Math.max(height, 1)) * 100)),
          featureId: selectedFeature?.get('interactionId'),
        })
      })
      let hoveredInteractionId: string | undefined
      const pointerMoveKey = map.on('pointermove', (event) => {
        const hoveredFeature = event.dragging ? undefined : map.getFeaturesAtPixel(event.pixel, { hitTolerance: 9 })
          .find((feature) => feature.get('interactive') === true)
        const nextInteractionId = hoveredFeature?.get('interactionId') as string | undefined
        if (nextInteractionId === hoveredInteractionId) return
        vectorSource.getFeatures().forEach((feature) => {
          const defaultStyles = feature.get('defaultStyles') as Style[] | undefined
          const hoverStyles = feature.get('hoverStyles') as Style[] | undefined
          if (!defaultStyles || feature.get('interactive') !== true) return
          feature.setStyle(nextInteractionId && feature.get('interactionId') === nextInteractionId
            ? hoverStyles ?? defaultStyles
            : defaultStyles)
        })
        hoveredInteractionId = nextInteractionId
        map.getViewport().style.cursor = nextInteractionId ? 'pointer' : ''
      })
      let clusterZoomBucket = Math.floor(map.getView().getZoom() ?? initialScene.zoom)
      const moveEndKey = map.on('moveend', () => {
        const nextBucket = Math.floor(map.getView().getZoom() ?? currentScene.zoom)
        if (nextBucket === clusterZoomBucket) return
        clusterZoomBucket = nextBucket
        applyScene(
          map,
          vectorSource,
          markerOverlays,
          animatedStrokes,
          pulsingStrokes,
          chevronFlows,
          drawnRouteGroups,
          pendingDrawFeatures,
          pendingDrawMarkers,
          reduceMotion,
          currentScene,
          false,
        )
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
          if (nextScene === currentScene) return
          const viewChanged = nextScene.center.latitude !== currentScene.center.latitude
            || nextScene.center.longitude !== currentScene.center.longitude
            || nextScene.zoom !== currentScene.zoom
            || nextScene.bearing !== currentScene.bearing
            || nextScene.focusAnchorY !== currentScene.focusAnchorY
            || nextScene.focusBottomInset !== currentScene.focusBottomInset
            || nextScene.focusOffsetY !== currentScene.focusOffsetY
            || nextScene.viewFit !== currentScene.viewFit
          const animateView = viewChanged && !reduceMotion
          applyScene(
            map,
            vectorSource,
            markerOverlays,
            animatedStrokes,
            pulsingStrokes,
            chevronFlows,
            drawnRouteGroups,
            pendingDrawFeatures,
            pendingDrawMarkers,
            reduceMotion,
            nextScene,
            viewChanged && !animateView,
          )
          if (animateView) {
            applySceneView(map, nextScene, 320)
          }
          drawStartedAt = pendingDrawFeatures.length ? performance.now() : undefined
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
          resizeObserver?.disconnect()
          unByKey(mapClickKey)
          unByKey(pointerMoveKey)
          unByKey(moveEndKey)
          map.getViewport().removeEventListener('click', handlePlaceMarkerClick)
          map.setTarget(undefined)
          map.dispose()
        },
      }
    },
  }
}
