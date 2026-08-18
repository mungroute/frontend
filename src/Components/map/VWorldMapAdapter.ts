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
  const current = marker.kind === 'current-location'

  return new Style({
    image: new CircleStyle({
      radius: current ? 8 : 7,
      fill: new Fill({ color: '#f47a3a' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
  })
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
  chevronFlows: ChevronFlow[],
  drawnRouteGroups: Set<string>,
  pendingDrawFeatures: Array<{ feature: Feature<Geometry>; styles: Style[]; threshold: number }>,
  pendingDrawMarkers: Array<{ element: HTMLElement; threshold: number }>,
  reduceMotion: boolean,
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
        }),
      })] : []),
      new Style({
        zIndex: route.selected ? 3 : 1,
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
      pendingDrawFeatures.push({ feature, styles: routeStyles, threshold: route.drawOrder ?? 1 })
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
      const chevronFlows: ChevronFlow[] = []
      const drawnRouteGroups = new Set<string>()
      const pendingDrawFeatures: Array<{ feature: Feature<Geometry>; styles: Style[]; threshold: number }> = []
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
          minZoom: 7,
          maxZoom: 19,
        }),
        controls: defaultControls({ zoom: false, rotate: false }),
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
          const linearProgress = Math.min(1, (timestamp - drawStartedAt) / 900)
          const easedProgress = 1 - Math.pow(1 - linearProgress, 3)
          pendingDrawFeatures.forEach(({ feature, styles, threshold }) => {
            if (easedProgress >= threshold && feature.getStyle() !== styles) feature.setStyle(styles)
          })
          pendingDrawMarkers.forEach(({ element, threshold }) => {
            if (easedProgress >= threshold) element.classList.remove('map-route-endpoint--pending')
          })
          if (linearProgress >= 1) {
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
      let clickHandler: ((event: MapClickEvent) => void) | undefined
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
            viewChanged,
          )
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
          unByKey(mapClickKey)
          unByKey(pointerMoveKey)
          map.setTarget(undefined)
          map.dispose()
        },
      }
    },
  }
}
