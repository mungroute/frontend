import { useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DraggableSheet } from '../Components/ui'
import { CourseCandidateSection } from '../Components/courses/CourseCandidateCard'
import { getCourseCandidates } from '../Components/courses/course-data'
import type { CourseCandidate } from '../Components/courses/course-data'
import { buildThermalRoutes } from '../Components/courses/thermal-route'
import '../styles/pages/journey-page.css'
import '../styles/pages/route-candidates-page.css'

type RouteCandidatesPageProps = {
  duration?: number
  map?: BaseMapBinding
  onBack?: () => void
  candidates?: CourseCandidate[]
  onConfirm?: (candidate: CourseCandidate) => void
}

export function RouteCandidatesPage({
  duration = 30,
  map,
  candidates = getCourseCandidates(duration, { includeSaved: false }),
  onBack = () => window.history.back(),
  onConfirm = () => undefined,
}: RouteCandidatesPageProps) {
  const generatedCandidates = candidates.filter((candidate) => candidate.source === 'generated')
  const defaultCandidate = generatedCandidates[0]
  const [selectedRouteId, setSelectedRouteId] = useState(defaultCandidate?.id ?? '')
  const resolvedSelectedRouteId = generatedCandidates.some((candidate) => candidate.id === selectedRouteId)
    ? selectedRouteId
    : defaultCandidate?.id ?? ''
  const selectedCandidate = generatedCandidates.find((candidate) => candidate.id === resolvedSelectedRouteId) ?? defaultCandidate
  const sceneOverlay = useMemo(() => {
    if (!selectedCandidate?.routeCoordinates.length) return { mouseWheelZoom: false }
    const latitudes = selectedCandidate.routeCoordinates.map((coordinate) => coordinate.latitude)
    const longitudes = selectedCandidate.routeCoordinates.map((coordinate) => coordinate.longitude)
    return {
      mouseWheelZoom: false,
      center: {
        latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
        longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
      },
      viewFit: {
        coordinates: selectedCandidate.routeCoordinates,
        padding: [66, 20, 18, 20] as [number, number, number, number],
        maxZoom: 17,
      },
      routes: buildThermalRoutes({
        id: `recommendation-${selectedCandidate.id}`,
        coordinates: selectedCandidate.routeCoordinates,
        thermalSegments: selectedCandidate.thermalSegments,
        estimatedSurfaceTempC: selectedCandidate.estimatedSurfaceTempC,
        width: 7,
        outlineColor: '#fff7f0',
        outlineWidth: 11,
        animated: true,
        selected: true,
      }),
    }
  }, [selectedCandidate])
  return (
    <main className="journey-page route-candidates-page">
      <BaseMapViewport
        className="route-candidates-page__map"
        ariaLabel={selectedCandidate ? `${selectedCandidate.name} 경로 지도` : '후보 코스 지도'}
        map={map}
        sceneOverlay={sceneOverlay}
        fallback={{ src: '/assets/s03/map-preview.jpg' }}
      />

      <button className="route-candidates-page__back" type="button" onClick={onBack} aria-label="코스 후보에서 뒤로 가기">
        <span aria-hidden="true">‹</span> 코스 후보
      </button>

      <DraggableSheet className="route-candidates-page__sheet" allowUpwardDrag={false}>
        <h1>{duration}분 안에 걸을 수 있는 코스예요</h1>
        <div className="route-candidates-page__content">
          <CourseCandidateSection title="새 추천 코스" candidates={generatedCandidates} selectedId={resolvedSelectedRouteId} targetMinutes={duration} onSelect={(candidate) => setSelectedRouteId(candidate.id)} />
        </div>
        <button
          className="journey-page__primary-action route-candidates-page__confirm"
          type="button"
          disabled={!selectedCandidate}
          onClick={() => selectedCandidate && onConfirm(selectedCandidate)}
        >
          추천 코스로 산책 시작
        </button>
      </DraggableSheet>
    </main>
  )
}
