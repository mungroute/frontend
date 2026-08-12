import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import '../styles/pages/journey-page.css'
import '../styles/pages/route-candidates-page.css'

type RouteId = 'namsan-loop-a' | 'jangchung-park-b'

type RouteCandidatesPageProps = {
  duration?: number
  map?: BaseMapBinding
  onBack?: () => void
  onConfirm?: (routeId: RouteId) => void
}

const candidates: Array<{ id: RouteId; name: string; duration: number; distance: string; shade: number }> = [
  { id: 'namsan-loop-a', name: '남산 둘레길 A', duration: 29, distance: '1.8km', shade: 68 },
  { id: 'jangchung-park-b', name: '장충단 공원길 B', duration: 29, distance: '1.8km', shade: 68 },
]

export function RouteCandidatesPage({
  duration = 30,
  map,
  onBack = () => window.history.back(),
  onConfirm = () => undefined,
}: RouteCandidatesPageProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('namsan-loop-a')

  return (
    <main className="journey-page route-candidates-page">
      <BaseMapViewport
        className="route-candidates-page__map"
        ariaLabel="후보 코스 지도"
        map={map}
        fallback={{ src: '/assets/s03/map-preview.jpg' }}
      />

      <button className="route-candidates-page__back" type="button" onClick={onBack} aria-label="코스 후보에서 뒤로 가기">
        <span aria-hidden="true">‹</span> 코스 후보
      </button>

      <section className="route-candidates-page__sheet">
        <h1>{duration}분 안에 걸을 수 있는 코스예요</h1>
        <div className="route-candidates-page__cards">
          {candidates.map((candidate) => {
            const selected = candidate.id === selectedRouteId
            return (
              <button
                className="route-candidates-page__card"
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedRouteId(candidate.id)}
                key={candidate.id}
              >
                <strong>{candidate.name}</strong>
                <span>{candidate.duration}분 · {candidate.distance}</span>
                <small>그늘 {candidate.shade}%</small>
                <b aria-hidden="true">›</b>
              </button>
            )
          })}
        </div>
        <p>두 코스 모두 목표 시간에 맞아요</p>
        <button
          className="journey-page__primary-action route-candidates-page__confirm"
          type="button"
          onClick={() => onConfirm(selectedRouteId)}
        >
          이 코스로 선택
        </button>
      </section>
    </main>
  )
}
