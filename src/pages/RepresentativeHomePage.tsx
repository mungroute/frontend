import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BaseMapViewport, buildPlaceMarkerSceneOverlay } from '../Components/map'
import { MapPlaceSearch } from '../Components/map'
import type { BaseMapBinding, MapMarker, MapPlaceSearchHandle } from '../Components/map'
import { DraggableSheet, HomeBottomNavigation, HomeWalkStartAction } from '../Components/ui'
import type { CourseDetail } from '../api/courses'
import type { PlaceApi } from '../api/places'
import '../styles/pages/representative-home-page.css'

type RepresentativeHomePageProps = {
  onStartWalk?: () => void
  onCompareCourse?: () => void
  onRecommendCourse?: () => void
  onOpenCourse?: () => void
  course?: CourseDetail
  map?: BaseMapBinding
  placeApi?: PlaceApi
}

const asset = (name: string) => `/assets/s01/${name}`

export function RepresentativeHomePage({ onStartWalk = () => undefined, onCompareCourse = () => undefined, onRecommendCourse = () => undefined, onOpenCourse = () => undefined, course, map, placeApi }: RepresentativeHomePageProps) {
  const [placeMarkers, setPlaceMarkers] = useState<MapMarker[]>([])
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [isPlaceDetailOpen, setIsPlaceDetailOpen] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const placeSearchRef = useRef<MapPlaceSearchHandle>(null)
  const placeSceneOverlay = useMemo(() => buildPlaceMarkerSceneOverlay(placeMarkers), [placeMarkers])
  const reduceMotion = useReducedMotion()

  return (
    <main className="representative-home-page">
      <BaseMapViewport
        className="representative-home-page__map"
        ariaLabel="저녁 남산길 지도"
        map={map}
        sceneOverlay={placeMarkers.length ? placeSceneOverlay : undefined}
        showLocationControl
        onProviderReadyChange={setIsMapReady}
        onMapClick={({ featureId }) => { if (featureId) placeSearchRef.current?.selectFeature(featureId) }}
        fallback={{ src: asset('map-representative-route.png') }}
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
          <button className="representative-home-page__course-card" type="button" onClick={onOpenCourse}>
            <span className="representative-home-page__course-copy">
              <h1>{course?.courseName ?? '대표 코스를 선택해 주세요'}</h1>
              <span className="representative-home-page__course-meta">
                {course?.metrics ? `${course.metrics.durationMin}분 · ${(course.metrics.lengthM / 1000).toFixed(2)}km` : '내 코스에서 대표 코스를 지정할 수 있어요'}
              </span>
              {course?.metrics?.shadeApplicable && <span className="representative-home-page__shade-chip">그늘 {Math.round((course.metrics.shadeRatio ?? 0) * 100)}%</span>}
              {course?.metrics && !course.metrics.shadeApplicable && <span className="representative-home-page__shade-chip">야간 그늘 미산출</span>}
            </span>
            <span className="representative-home-page__chevron" aria-hidden="true">›</span>
          </button>

          <div className="representative-home-page__actions">
            <HomeWalkStartAction className="representative-home-page__start" onClick={onStartWalk} />
            <button type="button" onClick={onCompareCourse}>오늘의 추천 대안 보기</button>
            <button type="button" onClick={onRecommendCourse}>새 코스 추천받기</button>
          </div>
        </DraggableSheet>
      </motion.div>

      <HomeBottomNavigation />
    </main>
  )
}
