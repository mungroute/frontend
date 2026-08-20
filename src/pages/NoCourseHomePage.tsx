import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BaseMapViewport, MapPlaceSearch, buildPlaceMarkerSceneOverlay } from '../Components/map'
import type { BaseMapBinding, MapMarker, MapPlaceSearchHandle } from '../Components/map'
import type { PlaceApi } from '../api/places'
import { HomeBottomNavigation, HomeWalkStartAction } from '../Components/ui'
import '../styles/pages/no-course-home-page.css'

type NoCourseHomePageProps = {
  onStartWalk?: () => void
  onDrawCourse?: () => void
  onRecommendCourse?: () => void
  map?: BaseMapBinding
  placeApi?: PlaceApi
}

export function NoCourseHomePage({ onStartWalk = () => undefined, onDrawCourse = () => undefined, onRecommendCourse = () => undefined, map, placeApi }: NoCourseHomePageProps) {
  const [placeMarkers, setPlaceMarkers] = useState<MapMarker[]>([])
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [isPlaceDetailOpen, setIsPlaceDetailOpen] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const placeSearchRef = useRef<MapPlaceSearchHandle>(null)
  const placeSceneOverlay = useMemo(() => buildPlaceMarkerSceneOverlay(placeMarkers), [placeMarkers])
  const reduceMotion = useReducedMotion()

  return (
    <main className="no-course-home-page">
      <BaseMapViewport
        className="no-course-home-page__map"
        ariaLabel="현재 위치 지도"
        map={map}
        sceneOverlay={placeMarkers.length ? placeSceneOverlay : undefined}
        showLocationControl
        onProviderReadyChange={setIsMapReady}
        onMapClick={({ featureId }) => { if (featureId) placeSearchRef.current?.selectFeature(featureId) }}
        fallback={{
          src: '/assets/s02/map-current-location.png',
          overlay: <img className="no-course-home-page__current-location" src="/assets/s02/marker-current-location.svg" alt="현재 위치" />,
          hideOverlayWhenReady: true,
        }}
      />

      <MapPlaceSearch
        ref={placeSearchRef}
        mapBottomInset="76px"
        previewBottom="320px"
        renderStaticMarkers={!isMapReady}
        api={placeApi}
        origin={map?.scene.center}
        onMarkersChange={setPlaceMarkers}
        onSearchOpenChange={setIsPlaceSearchOpen}
        onDetailOpenChange={setIsPlaceDetailOpen}
      />

      <motion.div
        className="no-course-home-page__actions-motion"
        animate={{ y: isPlaceDetailOpen ? '100%' : isPlaceSearchOpen ? 112 : 0 }}
        transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 330, damping: 36, mass: 0.9 }}
        aria-hidden={isPlaceDetailOpen}
        data-place-detail={isPlaceDetailOpen ? 'open' : 'closed'}
        data-place-search={isPlaceSearchOpen ? 'open' : 'closed'}
      >
        <HomeWalkStartAction className="no-course-home-page__start" onClick={onStartWalk} />
        <div className="no-course-home-page__course-actions" aria-label="코스 선택">
          <button type="button" onClick={onDrawCourse}><strong>지도에서 코스 그리기</strong><span>내가 원하는 길을 직접 만들어요</span></button>
          <button type="button" onClick={onRecommendCourse}><strong>시간 맞춤 코스 추천받기</strong><span>원하는 시간에 맞는 새 코스</span></button>
        </div>
      </motion.div>
      <HomeBottomNavigation />
    </main>
  )
}
