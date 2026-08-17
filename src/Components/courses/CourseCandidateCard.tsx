import type { CourseCandidate } from './course-data'

type CourseCandidateCardProps = {
  candidate: CourseCandidate
  selected: boolean
  targetMinutes: number
  onSelect: (candidate: CourseCandidate) => void
}

export function CourseCandidateCard({ candidate, selected, targetMinutes, onSelect }: CourseCandidateCardProps) {
  const difference = candidate.durationMinutes - targetMinutes

  return (
    <button
      className="route-candidates-page__card"
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(candidate)}
    >
      <span className="route-candidates-page__badges">
        {candidate.isRepresentative && <em>대표</em>}
        <em>{candidate.source === 'saved' ? '내 코스' : '새 추천'}</em>
      </span>
      <strong>{candidate.name}</strong>
      <span>{candidate.durationMinutes}분 · {candidate.distanceKm.toFixed(1)}km</span>
      <span className="route-candidates-page__metrics">
        <small>그늘 {candidate.shadeRatio}%</small>
        <small>추정 노면 {candidate.estimatedSurfaceTempC}℃</small>
      </span>
      {!candidate.withinTargetTime && difference > 0 && (
        <span className="route-candidates-page__time-note">선택한 {targetMinutes}분보다 약 {difference}분 길어요</span>
      )}
    </button>
  )
}

export function CourseCandidateSection({ title, candidates, selectedId, targetMinutes, onSelect }: {
  title: string
  candidates: CourseCandidate[]
  selectedId: string
  targetMinutes: number
  onSelect: (candidate: CourseCandidate) => void
}) {
  if (candidates.length === 0) return null

  return (
    <section className="route-candidates-page__section" aria-labelledby={`candidate-section-${candidates[0].source}`}>
      <h2 id={`candidate-section-${candidates[0].source}`}>{title}</h2>
      <div className="route-candidates-page__cards">
        {candidates.map((candidate) => (
          <CourseCandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={candidate.id === selectedId}
            targetMinutes={targetMinutes}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}
