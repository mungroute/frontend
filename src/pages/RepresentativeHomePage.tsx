import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BaseMapViewport, buildPlaceMarkerSceneOverlay } from '../Components/map'
import { MapPlaceSearch } from '../Components/map'
import type { BaseMapBinding, MapMarker, MapPlaceSearchHandle } from '../Components/map'
import { courseRouteCoordinates } from '../Components/courses/course-map'
import { buildDiagnosticCourseRoutes } from '../Components/courses/diagnostic-course-route'
import { DraggableSheet, HomeBottomNavigation, HomeWalkStartAction } from '../Components/ui'
import { WalkStartChoiceDialog } from '../Components/system'
import type { CourseDetail, CourseDiagnostics } from '../api/courses'
import type { PlaceApi } from '../api/places'
import '../styles/pages/representative-home-page.css'

type RepresentativeHomePageProps = {
  onStartFreeWalk?: () => void
  onStartRepresentativeWalk?: () => void
  onCompareCourse?: () => void
  onRecommendCourse?: () => void
  onOpenCourse?: () => void
  course?: CourseDetail
  diagnostics?: CourseDiagnostics
  map?: BaseMapBinding
  placeApi?: PlaceApi
}

const asset = (name: string) => `/assets/s01/${name}`

export function RepresentativeHomePage({ onStartFreeWalk = () => undefined, onStartRepresentativeWalk = () => undefined, onCompareCourse = () => undefined, onRecommendCourse = () => undefined, onOpenCourse = () => undefined, course, diagnostics, map, placeApi }: RepresentativeHomePageProps) {
  const [placeMarkers, setPlaceMarkers] = useState<MapMarker[]>([])
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [isPlaceDetailOpen, setIsPlaceDetailOpen] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isWalkChoiceOpen, setIsWalkChoiceOpen] = useState(false)
  const placeSearchRef = useRef<MapPlaceSearchHandle>(null)
  const placeSceneOverlay = useMemo(() => buildPlaceMarkerSceneOverlay(placeMarkers), [placeMarkers])
  const routeCoordinates = useMemo(() => courseRouteCoordinates(course?.route), [course?.route])
  const mapSceneOverlay = useMemo(() => {
    const hasRoute = routeCoordinates.length > 1
    if (!hasRoute && !placeMarkers.length) return undefined

    const drawGroupId = course
      ? `representative-home-${course.courseSource}-${course.courseId}`
      : 'representative-home-course'
    const routeMarkers: MapMarker[] = hasRoute ? [
      { id: 'representative-course-start', position: routeCoordinates[0], kind: 'start', label: '출발' },
      {
        id: 'representative-course-finish',
        position: routeCoordinates[routeCoordinates.length - 1],
        kind: 'finish',
        label: '도착',
        revealAfterDraw: drawGroupId,
      },
    ] : []
    const latitudes = routeCoordinates.map((coordinate) => coordinate.latitude)
    const longitudes = routeCoordinates.map((coordinate) => coordinate.longitude)
    const routeCenter = hasRoute ? {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    } : undefined

    return {
      center: placeMarkers.length ? placeSceneOverlay.center : routeCenter,
      zoom: placeMarkers.length ? placeSceneOverlay.zoom : undefined,
      focusAnchorY: placeMarkers.length ? placeSceneOverlay.focusAnchorY : undefined,
      viewFit: hasRoute && !placeMarkers.length ? {
        coordinates: routeCoordinates,
        padding: [40, 24, 350, 24] as [number, number, number, number],
        maxZoom: 17,
      } : undefined,
      markers: [...routeMarkers, ...(placeSceneOverlay.markers ?? [])],
      routes: hasRoute ? buildDiagnosticCourseRoutes({
        idPrefix: 'representative-home',
        drawGroupId,
        coordinates: routeCoordinates,
        diagnostics,
      }) : [],
    }
  }, [course, diagnostics, placeMarkers.length, placeSceneOverlay, routeCoordinates])
  const reduceMotion = useReducedMotion()

  return (
    <main className="representative-home-page">
      <BaseMapViewport
        className="representative-home-page__map"
        ariaLabel={course ? `${course.courseName} 경로 지도` : '현재 위치 지도'}
        map={map}
        sceneOverlay={mapSceneOverlay}
        showLocationControl
        onProviderReadyChange={setIsMapReady}
        onMapClick={({ featureId }) => { if (featureId) placeSearchRef.current?.selectFeature(featureId) }}
        fallback={{ src: course ? asset('map-representative-route.png') : '/assets/s02/map-current-location.png' }}
      />

      <MapPlaceSearch
        ref={placeSearchRef}
        mapBottomInset="76px"
        previewBottom="calc(100% - var(--map-sheet-top, calc(100% - 332px)) + 10px)"
        renderStaticMarkers={!isMapReady}
        api={placeApi}
        origin={map?.scene.center}
        onMarkersChange={setPlaceMarkers}
        onSearchOpenChange={setIsPlaceSearchOpen}
        onDetailOpenChange={setIsPlaceDetailOpen}
      />

      <motion.div
        className="representative-home-page__sheet-motion"
        animate={{ y: isPlaceDetailOpen ? '100%' : isPlaceSearchOpen ? 124 : 0 }}
        transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 330, damping: 36, mass: 0.9 }}
        aria-hidden={isPlaceDetailOpen}
        data-place-detail={isPlaceDetailOpen ? 'open' : 'closed'}
        data-place-search={isPlaceSearchOpen ? 'open' : 'closed'}
      >
        <DraggableSheet className="representative-home-page__sheet" aria-label="대표 산책 코스">
          {course ? (
            <button className="representative-home-page__course-card" type="button" onClick={onOpenCourse}>
              <span className="representative-home-page__course-copy">
                <h1>{course.courseName}</h1>
                <span className="representative-home-page__course-meta">
                  {course.metrics ? `${course.metrics.durationMin}분 · ${(course.metrics.lengthM / 1000).toFixed(2)}km` : '코스 상세 정보를 확인해 보세요'}
                </span>
                {course.metrics?.shadeApplicable && <span className="representative-home-page__shade-chip">그늘 {Math.round((course.metrics.shadeRatio ?? 0) * 100)}%</span>}
                {course.metrics && !course.metrics.shadeApplicable && <span className="representative-home-page__shade-chip">야간 그늘 미산출</span>}
              </span>
              <span className="representative-home-page__chevron" aria-hidden="true">›</span>
            </button>
          ) : (
            <div className="representative-home-page__course-card representative-home-page__course-card--empty">
              <span className="representative-home-page__course-copy">
                <h1>현재 대표 코스가 없습니다.</h1>
              </span>
            </div>
          )}

          <div className="representative-home-page__actions">
            <HomeWalkStartAction className="representative-home-page__start" onClick={() => setIsWalkChoiceOpen(true)} />
            <button type="button" onClick={onCompareCourse}>{course ? '오늘의 추천 대안 보기' : '지도에서 코스 그리기'}</button>
            <button type="button" onClick={onRecommendCourse}>새 코스 추천받기</button>
          </div>
        </DraggableSheet>
      </motion.div>

      <HomeBottomNavigation />
      {isWalkChoiceOpen && (
        <WalkStartChoiceDialog
          representativeCourse={course ? {
            name: course.courseName,
            detail: course.metrics ? `${course.metrics.durationMin}분 · ${(course.metrics.lengthM / 1000).toFixed(2)}km` : undefined,
          } : undefined}
          onClose={() => setIsWalkChoiceOpen(false)}
          onStartFreeWalk={() => { setIsWalkChoiceOpen(false); onStartFreeWalk() }}
          onStartRepresentativeWalk={() => { setIsWalkChoiceOpen(false); onStartRepresentativeWalk() }}
        />
      )}
    </main>
  )
}
