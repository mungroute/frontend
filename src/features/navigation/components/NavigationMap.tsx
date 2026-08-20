import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap, MapOptions, Marker } from 'maplibre-gl'
import { LocateFixed, RotateCcw } from 'lucide-react'
import { BaseMapViewport } from '../../../Components/map'
import type { BaseMapBinding, MapCoordinate, MapMarker } from '../../../Components/map'
import { buildThermalRoutes } from '../../../Components/courses/thermal-route'
import { WalkRouteProgress } from '../../../Components/walk/WalkRouteProgress'
import type { NavigationPositionFix, WalkNavigationRoute } from '../types'
import type { RouteProgressGeometry } from '../utils/route-progress'
import { chevronsAhead } from '../utils/route-progress'
import type { PreparedRoute } from '../utils/route-progress'
import { resolveMapStyleUrl } from '../map-style'

export type NavigationMapFactory = (options: MapOptions) => MapLibreMap

type NavigationMapProps = {
  route: WalkNavigationRoute | null
  position?: NavigationPositionFix
  heading?: number
  preparedRoute?: PreparedRoute
  progress?: RouteProgressGeometry
  walkedCoordinates?: MapCoordinate[]
  placeMarkers?: MapMarker[]
  meetMarker?: MapMarker
  paused?: boolean
  padding?: { top: number; right: number; bottom: number; left: number }
  fallbackMap?: BaseMapBinding
  mapFactory?: NavigationMapFactory
  styleUrl?: string
  onPlaceSelect?: (featureId: string) => void
  onReadyChange?: (ready: boolean) => void
}

const STYLE_URL = resolveMapStyleUrl(import.meta.env.VITE_MAPLIBRE_STYLE_URL, import.meta.env.VITE_MAPTILER_KEY)
const FOLLOW_ANCHOR_Y = 0.68
const DEFAULT_PADDING = { top: 116, right: 20, bottom: 180, left: 20 }
const SOURCE_IDS = ['navigation-route', 'navigation-passed', 'navigation-remaining', 'navigation-chevron', 'navigation-places'] as const
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const lineFeatureCollection = (lines: MapCoordinate[][]) => ({
  type: 'FeatureCollection' as const,
  features: lines.filter((line) => line.length >= 2).map((line) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: line.map(({ longitude, latitude }) => [longitude, latitude]) },
  })),
})

const pointFeatureCollection = (markers: MapMarker[]) => ({
  type: 'FeatureCollection' as const,
  features: markers.map((marker) => ({
    type: 'Feature' as const,
    id: marker.id,
    properties: { id: marker.id, label: marker.label ?? '' },
    geometry: { type: 'Point' as const, coordinates: [marker.position.longitude, marker.position.latitude] },
  })),
})

const emptyCollection = () => ({ type: 'FeatureCollection' as const, features: [] })

const setSourceData = (map: MapLibreMap, id: string, data: unknown) => {
  const source = map.getSource(id) as GeoJSONSource | undefined
  source?.setData(data as never)
}

export function NavigationMap({ route, position, heading, preparedRoute, progress, walkedCoordinates = [], placeMarkers = [], meetMarker, paused = false, padding = DEFAULT_PADDING, fallbackMap, mapFactory, styleUrl = STYLE_URL, onPlaceSelect, onReadyChange }: NavigationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | undefined>(undefined)
  const markerRef = useRef<Marker | undefined>(undefined)
  const loadedRef = useRef(false)
  const cameraAtRef = useRef(0)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [retryKey, setRetryKey] = useState(0)
  const [followMode, setFollowMode] = useState(true)
  const useFallback = !styleUrl || (import.meta.env.MODE === 'test' && !mapFactory) || Boolean(loadError)
  const allPlaceMarkers = useMemo(() => meetMarker ? [meetMarker, ...placeMarkers] : placeMarkers, [meetMarker, placeMarkers])
  const fallbackFitCoordinates = useMemo(() => route?.coordinateParts.flat() ?? [], [route])
  const chevrons = useMemo(() => preparedRoute && progress
    ? chevronsAhead(preparedRoute, progress.progressM).map((item, index) => ({
        type: 'Feature' as const,
        id: `chevron-${index}`,
        properties: { bearing: item.bearing },
        geometry: { type: 'Point' as const, coordinates: [item.coordinate.longitude, item.coordinate.latitude] },
      }))
    : [], [preparedRoute, progress])
  const fallbackScene = useMemo(() => ({
    viewFit: fallbackFitCoordinates.length >= 2 ? {
      coordinates: fallbackFitCoordinates,
      padding: [66, 20, 18, 20] as [number, number, number, number],
      maxZoom: 17,
    } : undefined,
    routes: [
      ...route?.coordinateParts.flatMap((coordinates, index) => buildThermalRoutes({
        id: index === 0 ? 'planned-course' : `planned-course-${index}`,
        coordinates,
        thermalSegments: route.thermalSegments,
        estimatedSurfaceTempC: route.estimatedSurfaceTempC,
        width: 7,
        outlineWidth: 11,
        chevrons: true,
      })) ?? [],
      ...(walkedCoordinates.length >= 2 ? [{ id: 'walked', coordinates: walkedCoordinates, color: '#8c8985', width: 6 }] : []),
    ],
  }), [fallbackFitCoordinates, route, walkedCoordinates])

  useEffect(() => {
    onReadyChange?.(ready)
  }, [onReadyChange, ready])

  useEffect(() => {
    if (useFallback || !containerRef.current || !styleUrl) return
    loadedRef.current = false
    const createMap = mapFactory ?? ((options: MapOptions) => new maplibregl.Map(options))
    let map: MapLibreMap
    try {
      map = createMap({
        container: containerRef.current,
        style: styleUrl,
        center: route?.navigationPolyline?.[0]
          ? [route.navigationPolyline[0].longitude, route.navigationPolyline[0].latitude]
          : [126.978, 37.5665],
        zoom: 17.8,
        pitch: 54,
        bearing: 0,
        attributionControl: false,
      })
    } catch {
      queueMicrotask(() => setLoadError('이 기기에서 3D 지도를 시작할 수 없습니다.'))
      return
    }
    mapRef.current = map
    const disableFollow = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) setFollowMode(false)
    }
    map.on('dragstart', disableFollow)
    map.on('zoomstart', disableFollow)
    map.on('rotatestart', disableFollow)
    map.on('error', () => {
      if (!loadedRef.current) setLoadError('지도 스타일을 불러오지 못했습니다.')
    })
    map.once('load', () => {
      loadedRef.current = true
      SOURCE_IDS.forEach((id) => map.addSource(id, { type: 'geojson', data: emptyCollection() }))
      map.addLayer({ id: 'navigation-route-outline', type: 'line', source: 'navigation-route', paint: { 'line-color': '#fff9f2', 'line-width': 12, 'line-opacity': 0.96 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addLayer({ id: 'navigation-route-base', type: 'line', source: 'navigation-route', paint: { 'line-color': '#f47a3a', 'line-width': 7, 'line-opacity': 0.48 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addLayer({ id: 'navigation-passed-line', type: 'line', source: 'navigation-passed', paint: { 'line-color': '#8c8985', 'line-width': 7 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addLayer({ id: 'navigation-remaining-line', type: 'line', source: 'navigation-remaining', paint: { 'line-color': '#f47a3a', 'line-width': 7 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addLayer({ id: 'navigation-chevron-symbol', type: 'symbol', source: 'navigation-chevron', layout: { 'text-field': '›', 'text-size': 25, 'text-rotate': ['get', 'bearing'], 'text-rotation-alignment': 'map', 'text-allow-overlap': true }, paint: { 'text-color': '#fffaf4', 'text-halo-color': '#f47a3a', 'text-halo-width': 1.5 } })
      map.addLayer({ id: 'navigation-places', type: 'circle', source: 'navigation-places', paint: { 'circle-radius': 8, 'circle-color': '#fffaf4', 'circle-stroke-width': 4, 'circle-stroke-color': '#f47a3a' } })
      map.on('click', 'navigation-places', (event) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') onPlaceSelect?.(id)
      })
      setReady(true)
      if (route?.navigationPolyline?.length) {
        const bounds = route.navigationPolyline.reduce(
          (value, coordinate) => value.extend([coordinate.longitude, coordinate.latitude]),
          new maplibregl.LngLatBounds(),
        )
        map.fitBounds(bounds, { padding, maxZoom: 18, duration: prefersReducedMotion() ? 0 : 650, pitch: 50 })
      }
    })
    return () => {
      markerRef.current?.remove()
      markerRef.current = undefined
      map.remove()
      if (mapRef.current === map) mapRef.current = undefined
      loadedRef.current = false
    }
  }, [mapFactory, onPlaceSelect, padding, retryKey, route?.navigationPolyline, styleUrl, useFallback])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    setSourceData(map, 'navigation-route', lineFeatureCollection(route?.coordinateParts ?? []))
    setSourceData(map, 'navigation-passed', lineFeatureCollection(progress?.passed ? [progress.passed] : []))
    setSourceData(map, 'navigation-remaining', lineFeatureCollection(progress?.remaining ? [progress.remaining] : route?.coordinateParts ?? []))
    setSourceData(map, 'navigation-chevron', { type: 'FeatureCollection', features: chevrons })
    setSourceData(map, 'navigation-places', pointFeatureCollection(allPlaceMarkers))
  }, [allPlaceMarkers, chevrons, progress, ready, route])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !position) return
    if (!markerRef.current) {
      const element = document.createElement('div')
      element.className = 'navigation-map__marker'
      element.innerHTML = '<span></span>'
      markerRef.current = new maplibregl.Marker({ element, rotationAlignment: 'map', pitchAlignment: 'map' })
        .setLngLat([position.coordinate.longitude, position.coordinate.latitude])
        .addTo(map)
    } else {
      markerRef.current.setLngLat([position.coordinate.longitude, position.coordinate.latitude])
    }
    if (heading !== undefined) markerRef.current.setRotation(heading)
    if (!followMode || paused) return
    const now = Date.now()
    if (now - cameraAtRef.current < 350) return
    cameraAtRef.current = now
    const height = containerRef.current?.clientHeight ?? 700
    map.easeTo({
      center: [position.coordinate.longitude, position.coordinate.latitude],
      zoom: 18,
      pitch: 54,
      bearing: heading ?? map.getBearing(),
      padding,
      offset: [0, height * (FOLLOW_ANCHOR_Y - 0.5)],
      duration: prefersReducedMotion() ? 0 : 650,
      essential: true,
    })
  }, [followMode, heading, padding, paused, position, ready])

  const restoreFollow = () => {
    setFollowMode(true)
    cameraAtRef.current = 0
  }

  return (
    <div className={`navigation-map${ready ? ' navigation-map--ready' : ''}`}>
      {useFallback && (
        <BaseMapViewport
          className="navigation-map__fallback"
          ariaLabel="산책 내비게이션 지도"
          map={fallbackMap}
          sceneOverlay={fallbackScene}
          showLocationControl
          onProviderReadyChange={setReady}
          fallback={{ src: '/assets/s07/map.jpg', hideOverlayWhenReady: true, overlay: <WalkRouteProgress planned={route?.navigationPolyline ?? []} walked={walkedCoordinates} /> }}
        />
      )}
      <div ref={containerRef} className="navigation-map__canvas" aria-label="MapLibre 산책 내비게이션 지도" />
      {!followMode && position && <button type="button" className="navigation-map__follow" onClick={restoreFollow}><LocateFixed aria-hidden="true" /> 내 위치</button>}
      {loadError && (
        <div className="navigation-map__error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => { setLoadError(undefined); setRetryKey((value) => value + 1) }}><RotateCcw aria-hidden="true" /> 다시 시도</button>
        </div>
      )}
      {!styleUrl && <div className="navigation-map__error" role="alert"><span>MapLibre 지도 스타일 설정이 필요합니다.</span></div>}
    </div>
  )
}
