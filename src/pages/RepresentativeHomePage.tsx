import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DraggableSheet, HomeBottomNavigation, HomeWalkStartAction } from '../Components/ui'
import '../styles/pages/representative-home-page.css'

type RepresentativeHomePageProps = {
  onStartWalk?: () => void
  onOpenCourse?: () => void
  map?: BaseMapBinding
}

const asset = (name: string) => `/assets/s01/${name}`

export function RepresentativeHomePage({ onStartWalk = () => undefined, onOpenCourse = () => undefined, map }: RepresentativeHomePageProps) {
  const [distanceMode, setDistanceMode] = useState(true)

  return (
    <main className="representative-home-page">
      <BaseMapViewport
        className="representative-home-page__map"
        ariaLabel="저녁 남산길 지도"
        map={map}
        showLocationControl
        fallback={{ src: asset('map-representative-route.png') }}
      >
        <img className="representative-home-page__logo" src="/assets/brand/logo-horizontal@2x.png" alt="멍루트" />
        <img className="representative-home-page__profile" src={asset('profile-circle.svg')} alt="" />
      </BaseMapViewport>

      <DraggableSheet className="representative-home-page__sheet" aria-label="대표 산책 코스">
        <button className="representative-home-page__course-card" type="button" onClick={onOpenCourse}>
          <span className="representative-home-page__course-copy">
            <h1>저녁 남산길</h1>
            <span className="representative-home-page__course-meta">29분 · 1.8km</span>
            <span className="representative-home-page__shade-chip">그늘 68%</span>
          </span>
          <span className="representative-home-page__chevron" aria-hidden="true">›</span>
        </button>

        <div className="representative-home-page__mode">
          <div>
            <span className="representative-home-page__mode-label">거리두기 모드</span>
            <span className="representative-home-page__mode-helper">산책을 시작하면 작동해요</span>
          </div>
          <button
            className="representative-home-page__switch"
            type="button"
            role="switch"
            aria-label="거리두기 모드"
            aria-checked={distanceMode}
            onClick={() => setDistanceMode((current) => !current)}
          >
            <img src={asset('toggle-thumb.svg')} alt="" />
          </button>
        </div>

        <HomeWalkStartAction className="representative-home-page__start" onClick={onStartWalk} />
      </DraggableSheet>

      <HomeBottomNavigation />
    </main>
  )
}
