import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MapPlaceSearch, useMapLocation } from '../Components/map'
import type { BaseMapBinding, MapCoordinate, MapMarker, MapPlaceSearchHandle } from '../Components/map'
import type { ThermalRouteSegment } from '../Components/courses/thermal-route'
import { PresenceModeControl } from '../Components/walk/DistanceModeControl'
import { DistanceRangeControl } from '../Components/walk/DistanceRangeControl'
import { WalkSessionControls } from '../Components/walk/WalkSessionControls'
import { MeetProfileDialog, MeetWalkPanel } from '../Components/walk/MeetWalkPanel'
import type { MeetProfileSelection } from '../Components/walk/MeetWalkPanel'
import { WalkStats } from '../Components/walk/WalkStats'
import { WalkEndDialog } from '../Components/system'
import { DraggableSheet } from '../Components/ui'
import { distanceBetween } from '../features/walk-record/useWalkTracker'
import type { GpsSignal } from '../features/walk-record/useWalkTracker'
import type { NavigationPositionFix, WalkNavigationRoute } from '../features/navigation/types'
import { normalizeWalkRoute } from '../features/navigation/route-normalizer'
import { useNavigationProgress } from '../features/navigation/hooks/useNavigationProgress'
import { useNavigationHeading } from '../features/navigation/hooks/useNavigationHeading'
import { nextManeuver } from '../features/navigation/utils/maneuver'
import { NavigationMap } from '../features/navigation/components/NavigationMap'
import type { NavigationMapViewMode } from '../features/navigation/components/NavigationMap'
import { NavigationHUD } from '../features/navigation/components/NavigationHUD'
import { DistanceAlertOverlay } from '../features/navigation/components/DistanceAlertOverlay'
import { useNavigationVoice } from '../features/navigation/voice/useNavigationVoice'
import { speakNavigation } from '../features/navigation/voice/navigation-voice'
import { DistanceNotificationPermissionDialog } from '../features/distance-alert/notifications/DistanceNotificationPermissionDialog'
import { getExternalNotificationPermission, requestExternalNotificationPermission } from '../features/distance-alert/notifications/notification-permission'
import { showDistanceSystemNotification } from '../features/distance-alert/notifications/distance-notification'
import { useDistanceNotifications } from '../features/distance-alert/notifications/useDistanceNotifications'
import { distanceAlertEventKey } from '../features/distance-alert/distance-alert-format'
import type { LockedWalkPresenceMode, NearbyPresence, SafeDetourResult } from '../api/walks'
import type { PlaceApi } from '../api/places'
import type { MeetCandidate, MeetConnection, MeetRequest } from '../api/meet'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../styles/pages/journey-page.css'
import '../styles/pages/active-walk-page.css'
import '../styles/features/navigation.css'
import '../styles/components/walk-session-glass.css'

export type WalkSessionViewState = 'active' | 'distance-alert' | 'paused'

export type ActiveWalkPageProps = {
  map?: BaseMapBinding
  route?: WalkNavigationRoute | null
  currentPosition?: NavigationPositionFix
  sessionState?: WalkSessionViewState
  alert?: NearbyPresence
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
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
  meetSearchPending?: boolean
  meetRequests?: MeetRequest[]
  meetConnection?: MeetConnection
  onMeetRequest?: (candidateRef: string) => void
  onMeetAccept?: (requestId: string) => void
  onMeetReject?: (requestId: string) => void
  onMeetCancel?: (requestId: string) => void
  onMeetEnd?: (requestId: string) => void
  onMeetBlock?: (requestId: string) => void
  placeApi?: PlaceApi
  navigationVoiceEnabled?: boolean
  onNavigationVoiceEnabledChange?: (enabled: boolean) => void
  watchSystemNotificationEnabled?: boolean
  onWatchSystemNotificationEnabledChange?: (enabled: boolean) => void
  forceNotificationPermissionGuide?: boolean
  onSafeDetourRequest?: (remainingRoute: MapCoordinate[], alert: NearbyPresence) => Promise<SafeDetourResult>
  onSafeDetourApply?: (result: SafeDetourResult) => void
}

const gpsLabels: Record<GpsSignal, string> = {
  waiting: 'GPS 신호 확인 중',
  good: 'GPS 신호 좋음',
  weak: 'GPS 신호 약함',
  error: 'GPS 위치를 확인할 수 없음',
}

const legacyRouteFromCoordinates = (
  coordinates: MapCoordinate[],
  thermalSegments: ThermalRouteSegment[],
  estimatedSurfaceTempC?: number | null,
) => {
  if (coordinates.length < 2) return null
  try {
    return normalizeWalkRoute({
      routeKey: 'legacy-active-route',
      origin: 'COURSE_DETAIL',
      name: '선택한 산책 코스',
      geometry: {
        type: 'LineString',
        coordinates: coordinates.map(({ longitude, latitude }) => [longitude, latitude]),
      },
      thermalSegments,
      estimatedSurfaceTempC,
    })
  } catch {
    return null
  }
}

export function ActiveWalkPage({
  map,
  route,
  currentPosition,
  sessionState = 'active',
  alert,
  onPause,
  onResume,
  onStop,
  distanceMode,
  onDistanceModeChange,
  presenceMode,
  presenceEnabled,
  onPresenceEnabledChange,
  time = '00:17:00',
  distance = '1.2km',
  distanceRadius = 100,
  onDistanceRadiusChange,
  plannedRouteCoordinates = [],
  plannedRouteThermalSegments = [],
  plannedRouteTemperatureC,
  walkedCoordinates = [],
  gpsSignal = 'waiting',
  meetCandidates = [],
  meetSearchPending = false,
  meetRequests = [],
  meetConnection,
  onMeetRequest,
  onMeetAccept,
  onMeetReject,
  onMeetCancel,
  onMeetEnd,
  onMeetBlock,
  placeApi,
  navigationVoiceEnabled = true,
  onNavigationVoiceEnabledChange,
  watchSystemNotificationEnabled = true,
  onWatchSystemNotificationEnabledChange,
  forceNotificationPermissionGuide = false,
  onSafeDetourRequest,
  onSafeDetourApply,
}: ActiveWalkPageProps) {
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const [placeMarkers, setPlaceMarkers] = useState<MapMarker[]>([])
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [isPlaceDetailOpen, setIsPlaceDetailOpen] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapViewMode, setMapViewMode] = useState<NavigationMapViewMode>('navigation')
  const [sheetHeight, setSheetHeight] = useState(338)
  const [selectedMeetProfile, setSelectedMeetProfile] = useState<MeetProfileSelection>()
  const [notificationPermissionDismissed, setNotificationPermissionDismissed] = useState(false)
  const { currentLocationMarker } = useMapLocation()
  const placeSearchRef = useRef<MapPlaceSearchHandle>(null)
  const sheetMotionRef = useRef<HTMLDivElement>(null)
  const currentPositionRef = useRef(currentPosition)
  const detourRequestSequenceRef = useRef(0)
  const detourAvailableAtRef = useRef(0)
  const reduceMotion = useReducedMotion()
  const resolvedMode = presenceMode === undefined ? 'distance' : presenceMode
  const resolvedEnabled = presenceEnabled ?? distanceMode ?? true
  const changePresence = onPresenceEnabledChange ?? onDistanceModeChange
  const resolvedRoute = useMemo(
    () => route === undefined
      ? legacyRouteFromCoordinates(plannedRouteCoordinates, plannedRouteThermalSegments, plannedRouteTemperatureC)
      : route,
    [plannedRouteCoordinates, plannedRouteTemperatureC, plannedRouteThermalSegments, route],
  )
  const paused = sessionState === 'paused'
  const { prepared, progress } = useNavigationProgress(resolvedRoute, currentPosition, paused)
  const heading = useNavigationHeading(currentPosition, walkedCoordinates, progress?.segmentBearing)
  const maneuver = useMemo(
    () => prepared && progress ? nextManeuver(prepared, progress.progressM) : undefined,
    [prepared, progress],
  )
  useNavigationVoice({
    routeKey: resolvedRoute?.routeKey,
    maneuver,
    offRoute: progress?.offRoute,
    enabled: navigationVoiceEnabled,
    paused,
  })
  useDistanceNotifications(
    alert,
    resolvedMode === 'distance' && resolvedEnabled && watchSystemNotificationEnabled,
  )
  const navigationPadding = useMemo(() => ({
    top: resolvedRoute ? 116 : 64,
    right: 20,
    bottom: sheetHeight + 22,
    left: 20,
  }), [resolvedRoute, sheetHeight])
  const selectPlace = useCallback((featureId: string) => {
    placeSearchRef.current?.selectFeature(featureId)
  }, [])
  const changeMapViewMode = useCallback((mode: NavigationMapViewMode) => {
    setMapViewMode(mode)
    if (mode === 'navigation') {
      setIsPlaceSearchOpen(false)
      setIsPlaceDetailOpen(false)
      setPlaceMarkers([])
    }
  }, [])
  const sheetSizeClass = resolvedMode === 'meet' && resolvedEnabled
    ? ' active-walk-page__sheet-motion--with-meet'
    : resolvedMode === 'distance' && resolvedEnabled
      ? ' active-walk-page__sheet-motion--with-range'
      : ''
  const showNotificationPermission = !notificationPermissionDismissed
    && sessionState !== 'paused'
    && resolvedMode === 'distance'
    && resolvedEnabled
    && watchSystemNotificationEnabled
    && (forceNotificationPermissionGuide || getExternalNotificationPermission() === 'default')

  useEffect(() => {
    currentPositionRef.current = currentPosition
  }, [currentPosition])

  const requestSafeDetour = useCallback(async () => {
    if (!onSafeDetourRequest || !alert) throw new Error('현재 접근 알림을 확인하지 못했어요.')
    const remainingRoute = progress?.remaining ?? resolvedRoute?.navigationPolyline
    if (!remainingRoute || remainingRoute.length < 2) throw new Error('우회할 남은 경로가 없어요.')
    const remainingCooldownMs = detourAvailableAtRef.current - Date.now()
    if (remainingCooldownMs > 0) {
      throw new Error(`${Math.ceil(remainingCooldownMs / 1_000)}초 뒤에 다시 확인해 주세요.`)
    }
    const requestSequence = ++detourRequestSequenceRef.current
    const requestedPosition = currentPositionRef.current?.coordinate
    const result = await onSafeDetourRequest(remainingRoute, alert)
    if (requestSequence !== detourRequestSequenceRef.current) {
      throw new Error('더 최근의 경로 요청을 확인하고 있어요.')
    }
    const latestPosition = currentPositionRef.current?.coordinate
    if (requestedPosition && latestPosition && distanceBetween(requestedPosition, latestPosition) > 15) {
      throw new Error('이동한 위치를 기준으로 다시 확인해 주세요.')
    }
    detourAvailableAtRef.current = Date.now() + result.retryAfterSeconds * 1_000
    return result
  }, [alert, onSafeDetourRequest, progress?.remaining, resolvedRoute?.navigationPolyline])

  useEffect(() => {
    const target = sheetMotionRef.current
    if (!target) return
    const report = () => {
      const height = target.getBoundingClientRect().height
      if (height > 0) setSheetHeight(height)
    }
    report()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(report) : undefined
    observer?.observe(target)
    return () => observer?.disconnect()
  }, [resolvedEnabled, resolvedMode])
  const meetMarker: MapMarker | undefined = resolvedMode === 'meet' && resolvedEnabled && meetConnection
    ? {
        id: 'meet-friend',
        position: { latitude: meetConnection.lat, longitude: meetConnection.lon },
        kind: 'profile-location',
        label: meetConnection.profile.dogName,
        profileImageSrc: meetConnection.profile.profileImageUrl ?? undefined,
      }
    : undefined

  return (
    <main className={`journey-page active-walk-page active-walk-page--${sessionState}`} style={{ '--navigation-sheet-height': `${sheetHeight}px` } as React.CSSProperties}>
      {sessionState === 'active' && <h1 className="active-walk-page__screen-title">산책 중</h1>}
      <NavigationMap
        key={resolvedRoute?.routeKey ?? 'free-walk'}
        route={resolvedRoute}
        position={currentPosition}
        heading={heading}
        preparedRoute={prepared}
        progress={progress}
        walkedCoordinates={walkedCoordinates}
        placeMarkers={placeMarkers}
        meetMarker={meetMarker}
        currentLocationMarker={currentLocationMarker}
        paused={paused}
        padding={navigationPadding}
        fallbackMap={map}
        onPlaceSelect={selectPlace}
        onMeetSelect={() => meetConnection && setSelectedMeetProfile({ preview: meetConnection.profile, profile: meetConnection.profile })}
        onReadyChange={setIsMapReady}
        onViewModeChange={changeMapViewMode}
      />

      {resolvedRoute && mapViewMode === 'navigation' && <NavigationHUD maneuver={maneuver} routeName={resolvedRoute.name} offRoute={progress?.offRoute} />}
      <div className={`active-walk-page__gps active-walk-page__gps--${gpsSignal}`} role="status"><span>●</span> {gpsLabels[gpsSignal]}</div>
      {sessionState === 'distance-alert' && (
        <DistanceAlertOverlay
          key={alert ? distanceAlertEventKey(alert) : 'default-distance-alert'}
          alert={alert}
          onRequestDetour={onSafeDetourRequest ? requestSafeDetour : undefined}
          onApplyDetour={onSafeDetourApply}
        />
      )}
      {paused && (
        <section className="navigation-paused" aria-live="polite">
          <img src="/assets/mascot/animated/05-pause-wait.gif" alt="" />
          <h1>산책을 잠시 멈췄어요</h1>
          <p>GPS 기록과 경로 진행도 잠시 쉬어요.</p>
        </section>
      )}

      {!paused && mapViewMode === 'overview' && (
        <MapPlaceSearch
          ref={placeSearchRef}
          isWalking
          previewBottom={`${sheetHeight + 24}px`}
          renderStaticMarkers={!isMapReady}
          api={placeApi}
          origin={currentPosition?.coordinate ?? map?.scene.center}
          onMarkersChange={setPlaceMarkers}
          onSearchOpenChange={setIsPlaceSearchOpen}
          onDetailOpenChange={setIsPlaceDetailOpen}
        />
      )}

      <motion.div
        ref={sheetMotionRef}
        className={`active-walk-page__sheet-motion${sheetSizeClass}`}
        animate={{ y: isPlaceDetailOpen ? '100%' : isPlaceSearchOpen ? 112 : 0 }}
        transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 330, damping: 36, mass: 0.9 }}
        aria-hidden={isPlaceDetailOpen}
        data-place-detail={isPlaceDetailOpen ? 'open' : 'closed'}
        data-place-search={isPlaceSearchOpen ? 'open' : 'closed'}
      >
        <DraggableSheet
          className="active-walk-page__sheet walk-session-glass"
          aria-label="산책 정보 패널"
          upwardDragTop={250}
          upwardDragBoundarySelector=".walk-session-controls"
          upwardDragBoundarySpacing={16}
        >
          <div className="active-walk-page__summary">
            <WalkStats time={time} distance={distance} />
            <PresenceModeControl mode={resolvedMode} enabled={resolvedEnabled} onChange={changePresence} />
          </div>
          {resolvedMode && resolvedEnabled && (
            <DistanceRangeControl
              value={distanceRadius}
              mode={resolvedMode}
              onChange={onDistanceRadiusChange}
            />
          )}
          {resolvedMode === 'meet' && resolvedEnabled && <MeetWalkPanel searching={meetSearchPending} candidates={meetCandidates} requests={meetRequests} connection={meetConnection} onRequest={(value) => onMeetRequest?.(value)} onAccept={(value) => onMeetAccept?.(value)} onReject={(value) => onMeetReject?.(value)} onCancel={(value) => onMeetCancel?.(value)} onEnd={(value) => onMeetEnd?.(value)} onBlock={(value) => onMeetBlock?.(value)} onProfileSelect={setSelectedMeetProfile} />}
          <div className="active-walk-page__status-row"><strong>{paused ? '산책 일시정지' : '산책 중'}</strong></div>
          {paused
            ? <WalkSessionControls mode="paused" onResume={onResume} onStop={() => setIsEndDialogOpen(true)} voiceEnabled={navigationVoiceEnabled} onVoiceEnabledChange={onNavigationVoiceEnabledChange} />
            : <WalkSessionControls onPause={onPause} onStop={() => setIsEndDialogOpen(true)} voiceEnabled={navigationVoiceEnabled} onVoiceEnabledChange={onNavigationVoiceEnabledChange} />}
        </DraggableSheet>
      </motion.div>

      {isEndDialogOpen && <WalkEndDialog onClose={() => setIsEndDialogOpen(false)} onConfirm={() => { setIsEndDialogOpen(false); onStop?.() }} />}
      {resolvedMode === 'meet' && resolvedEnabled && selectedMeetProfile && <MeetProfileDialog selection={selectedMeetProfile} onClose={() => setSelectedMeetProfile(undefined)} />}
      {showNotificationPermission && (
        <DistanceNotificationPermissionDialog
          onAllow={async () => {
            const permission = await requestExternalNotificationPermission()
            onWatchSystemNotificationEnabledChange?.(permission === 'granted')
            setNotificationPermissionDismissed(true)
          }}
          onLater={() => {
            onWatchSystemNotificationEnabledChange?.(false)
            setNotificationPermissionDismissed(true)
          }}
        />
      )}
      {import.meta.env.DEV && (
        <aside className="active-walk-page__dev-tools" aria-label="개발 테스트 도구">
          <button type="button" onClick={() => speakNavigation('80미터 앞에서 오른쪽으로 이동하세요.')}>음성 안내 테스트</button>
          <button type="button" onClick={async () => {
            const permission = await requestExternalNotificationPermission()
            if (permission === 'granted') {
              await showDistanceSystemNotification({ distanceBand: 'BAND_30_50', directionOctant: 2, directionSpread: 45, directionReference: 'HEADING', trend: 'APPROACHING' })
            }
          }}>거리두기 워치 알림 테스트</button>
          <button type="button" onClick={() => onNavigationVoiceEnabledChange?.(!navigationVoiceEnabled)}>{navigationVoiceEnabled ? '음성 안내 끄기' : '음성 안내 켜기'}</button>
        </aside>
      )}
    </main>
  )
}
