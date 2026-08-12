import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import '../styles/pages/journey-page.css'
import '../styles/pages/route-comparison-page.css'

type RouteComparisonPageProps = {
  map?: BaseMapBinding
  onStartAlternative?: () => void
  onStartUsual?: () => void
}

export function RouteComparisonPage({
  map,
  onStartAlternative = () => undefined,
  onStartUsual = () => undefined,
}: RouteComparisonPageProps) {
  const [selectedRoute, setSelectedRoute] = useState<'usual' | 'alternative'>('alternative')
  const alternativeSelected = selectedRoute === 'alternative'

  return (
    <main className="journey-page route-comparison-page">
      <BaseMapViewport
        className="route-comparison-page__map"
        ariaLabel="평소 코스와 추천 대안 비교 지도"
        map={map}
        fallback={{ src: '/assets/s05/map.jpg' }}
      />

      <section className="route-comparison-page__sheet">
        <h1>오늘은 이 구간만 바꿔볼까요?</h1>
        <p className="route-comparison-page__intro">익숙한 길은 두고, 붐비는 220m만 우회해요.</p>
        <div className="route-comparison-page__recommendation">
          <img src="/assets/s05/recommendation-dot.svg" alt="" /> 추천 코스
        </div>

        <div className="route-comparison-page__cards">
          <button type="button" className="route-comparison-page__card" aria-pressed={!alternativeSelected} onClick={() => setSelectedRoute('usual')}>
            <strong>나의 평소 코스</strong>
            <span>29분 · 1.8km</span>
            <small>그늘 68%</small>
            <b aria-hidden="true">›</b>
          </button>
          <button type="button" className="route-comparison-page__card" aria-pressed={alternativeSelected} onClick={() => setSelectedRoute('alternative')}>
            <strong>오늘의 추천 대안</strong>
            <span>29분 · 1.8km</span>
            <small>그늘 68%</small>
            <b aria-hidden="true">›</b>
          </button>
        </div>

        <p className="route-comparison-page__difference">거리 +0.2km · 예상 시간 +4분</p>
        <div className="route-comparison-page__actions">
          <button className="journey-page__primary-action" type="button" onClick={alternativeSelected ? onStartAlternative : onStartUsual}>
            {alternativeSelected ? '대안 코스로 산책 시작' : '평소 코스로 산책 시작'}
          </button>
          <button className="route-comparison-page__usual" type="button" onClick={alternativeSelected ? onStartUsual : onStartAlternative}>
            {alternativeSelected ? '평소 코스로 시작' : '대안 코스로 시작'}
          </button>
        </div>
      </section>
    </main>
  )
}
