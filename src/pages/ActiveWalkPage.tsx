import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BaseMapViewport, MapPlaceSearch, buildPlaceMarkerSceneOverlay } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import type { MapCoordinate, MapMarker, MapPlaceSearchHandle } from '../Components/map'
import { WalkRouteProgress } from '../Components/walk/WalkRouteProgress'
import { buildThermalRoutes } from '../Components/courses/thermal-route'
import type { ThermalRouteSegment } from '../Components/courses/thermal-route'
import { PresenceModeControl } from '../Components/walk/DistanceModeControl'
import { DistanceRangeControl } from '../Components/walk/DistanceRangeControl'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import { MeetWalkPanel } from '../Components/walk/MeetWalkPanel'
import { WalkStats } from '../Components/walk/WalkStats'
import { WalkEndDialog } from '../Components/system'
import type { GpsSignal } from '../features/walk-record/useWalkTracker'
import type { LockedWalkPresenceMode } from '../api/walks'
import type { PlaceApi } from '../api/places'
import type { MeetCandidate, MeetConnection, MeetRequest } from '../api/meet'
import { DraggableSheet } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/active-walk-page.css'
import '../styles/components/walk-session-glass.css'

type ActiveWalkPageProps = {
  map?: BaseMapBinding
  onPause?: () => void
  onStop?: () => void
  onPhoto?: () => void
  distanceMode?: boolean
  onDistanceModeChange?: (checked: boolean) => void
  presenceMode?: LockedWalkPresenceMode | null
  presenceEnabled?: boolean
  onPresenceEnabledChange?: (enabled: boolean) => void
  time?: string
  distance?: string
  distanceRadius?: number
  onDistanceRadiusChange?: (value: number) => void
  plannedRouteCoordinates?: MapCoordinate[]
  plannedRouteThermalSegments?: ThermalRouteSegment[]
  plannedRouteTemperatureC?: number | null
  walkedCoordinates?: MapCoordinate[]
  gpsSignal?: GpsSignal
  meetCandidates?: MeetCandidate[]
  meetRequests?: MeetRequest[]
  meetConnection?: MeetConnection
  onMeetRequest?: (candidateRef: string) => void
  onMeetAccept?: (requestId: string) => void
  onMeetReject?: (requestId: string) => void
  onMeetCancel?: (requestId: string) => void
  onMeetEnd?: (requestId: string) => void
  onMeetBlock?: (requestId: string) => void
  placeApi?: PlaceApi
}

const gpsLabels: Record<GpsSignal, string> = {
  waiting: 'GPS 신호 확인 중',
  good: 'GPS 신호 좋음',
  weak: 'GPS 신호 약함',
  error: 'GPS 위치를 확인할 수 없음',
}

export function ActiveWalkPage({ map, onPause, onStop, onPhoto, distanceMode, onDistanceModeChange, presenceMode, presenceEnabled, onPresenceEnabledChange, time = '00:17:00', distance = '1.2km', distanceRadius = 100, onDistanceRadiusChange, plannedRouteCoordinates = [], plannedRouteThermalSegments = [], plannedRouteTemperatureC, walkedCoordinates = [], gpsSignal = 'waiting', meetCandidates = [], meetRequests = [], meetConnection, onMeetRequest, onMeetAccept, onMeetReject, onMeetCancel, onMeetEnd, onMeetBlock, placeApi }: ActiveWalkPageProps) {
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const [placeMarkers, setPlaceMarkers] = useState<MapMarker[]>([])
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [isPlaceDetailOpen, setIsPlaceDetailOpen] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const placeSearchRef = useRef<MapPlaceSearchHandle>(null)
  const reduceMotion = useReducedMotion()
  const resolvedMode = presenceMode === undefined ? 'distance' : presenceMode
  const resolvedEnabled = presenceEnabled ?? distanceMode ?? true
  const changePresence = onPresenceEnabledChange ?? onDistanceModeChange
  const plannedRouteView = useMemo(() => {
    if (plannedRouteCoordinates.length < 2) return undefined

    const latitudes = plannedRouteCoordinates.map(({ latitude }) => latitude)
    const longitudes = plannedRouteCoordinates.map(({ longitude }) => longitude)
    return {
      center: {
        latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
        longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
      },
      viewFit: {
        coordinates: plannedRouteCoordinates,
        padding: [66, 20, 18, 20] as [number, number, number, number],
        maxZoom: 17,
      },
    }
  }, [plannedRouteCoordinates])
  const routeOverlay = useMemo(() => {
    const placeView = buildPlaceMarkerSceneOverlay(placeMarkers)
    return {
      ...(placeMarkers.length
        ? { center: placeView.center, zoom: placeView.zoom }
        : plannedRouteView ?? {}),
      markers: [
        ...(meetConnection ? [{ id: 'meet-friend', position: { latitude: meetConnection.lat, longitude: meetConnection.lon }, kind: 'default' as const, label: meetConnection.profile.dogName, profileImageSrc: meetConnection.profile.profileImageUrl ?? undefined }] : []),
        ...placeMarkers,
      ],
      routes: [
        ...buildThermalRoutes({
          id: 'planned-course',
          coordinates: plannedRouteCoordinates,
          thermalSegments: plannedRouteThermalSegments,
          estimatedSurfaceTempC: plannedRouteTemperatureC,
          width: 7,
          outlineWidth: 11,
          chevrons: true,
        }),
        ...(walkedCoordinates.length >= 2 ? [{ id: 'walked-course', coordinates: walkedCoordinates, color: '#f47a3a', width: 6 }] : []),
      ],
    }
  }, [meetConnection, placeMarkers, plannedRouteCoordinates, plannedRouteTemperatureC, plannedRouteThermalSegments, plannedRouteView, walkedCoordinates])
  const placePreviewBottom = resolvedMode === 'meet' && resolvedEnabled
    ? '398px'
    : resolvedMode === 'distance' && resolvedEnabled
      ? '362px'
      : '264px'
  const sheetSizeClass = resolvedMode === 'meet' && resolvedEnabled
    ? ' active-walk-page__sheet-motion--with-meet'
    : resolvedMode === 'distance' && resolvedEnabled
      ? ' active-walk-page__sheet-motion--with-range'
      : ''

  return (
    <main className="journey-page active-walk-page">
      <BaseMapViewport
        className="active-walk-page__map"
        ariaLabel="진행 중인 산책 경로 지도"
        map={map}
        sceneOverlay={routeOverlay}
        showLocationControl
        onProviderReadyChange={setIsMapReady}
        onMapClick={({ featureId }) => { if (featureId) placeSearchRef.current?.selectFeature(featureId) }}
        fallback={{ src: '/assets/s07/map.jpg', hideOverlayWhenReady: true, overlay: <><WalkRouteProgress planned={plannedRouteCoordinates} walked={walkedCoordinates} /><img className="active-walk-page__destination" src="/assets/s07/marker-destination.svg" alt="" /></> }}
      />
      <div className={`active-walk-page__gps active-walk-page__gps--${gpsSignal}`} role="status"><span>●</span> {gpsLabels[gpsSignal]}</div>
      <MapPlaceSearch
        ref={placeSearchRef}
        isWalking
        previewBottom={placePreviewBottom}
        renderStaticMarkers={!isMapReady}
        api={placeApi}
        origin={map?.scene.center}
        onMarkersChange={setPlaceMarkers}
        onSearchOpenChange={setIsPlaceSearchOpen}
        onDetailOpenChange={setIsPlaceDetailOpen}
      />
      <motion.div
        className={`active-walk-page__sheet-motion${sheetSizeClass}`}
        animate={{ y: isPlaceDetailOpen ? '100%' : isPlaceSearchOpen ? 112 : 0 }}
        transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 330, damping: 36, mass: 0.9 }}
        aria-hidden={isPlaceDetailOpen}
        data-place-detail={isPlaceDetailOpen ? 'open' : 'closed'}
        data-place-search={isPlaceSearchOpen ? 'open' : 'closed'}
      >
        <DraggableSheet className="active-walk-page__sheet walk-session-glass">
          <div className="active-walk-page__summary">
            <WalkStats time={time} distance={distance} />
            <PresenceModeControl mode={resolvedMode} enabled={resolvedEnabled} onChange={changePresence} />
          </div>
          {resolvedMode === 'distance' && resolvedEnabled && <DistanceRangeControl value={distanceRadius} onChange={onDistanceRadiusChange} />}
          {resolvedMode === 'meet' && resolvedEnabled && <MeetWalkPanel candidates={meetCandidates} requests={meetRequests} connection={meetConnection} onRequest={(value) => onMeetRequest?.(value)} onAccept={(value) => onMeetAccept?.(value)} onReject={(value) => onMeetReject?.(value)} onCancel={(value) => onMeetCancel?.(value)} onEnd={(value) => onMeetEnd?.(value)} onBlock={(value) => onMeetBlock?.(value)} />}
          <div className="active-walk-page__status-row">
            <h1>산책 중</h1>
          </div>
          <WalkSessionControls onPause={onPause} onStop={() => setIsEndDialogOpen(true)} onPhoto={onPhoto} />
        </DraggableSheet>
      </motion.div>
      {isEndDialogOpen && <WalkEndDialog onClose={() => setIsEndDialogOpen(false)} onConfirm={() => { setIsEndDialogOpen(false); onStop?.() }} />}
    </main>
  )
}
