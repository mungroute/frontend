import { useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { Button } from '../Components/ui'
import { RepresentativeUnavailableDialog, WalkProcessingAlertDialog } from '../Components/system'
import type { GeoJsonLineString, WalkMatchStatus } from '../api/walks'
import '../styles/pages/journey-page.css'
import '../styles/pages/walk-complete-page.css'

type WalkCompletePageProps = {
  map?: BaseMapBinding
  dogName?: string
  distance?: string
  time?: string
  representativeEligible?: boolean
  representativeUnavailableReason?: 'insufficient-gps' | 'incomplete-route' | 'unmatched-route'
  matchStatus?: WalkMatchStatus
  trackGeoJson?: GeoJsonLineString | null
  errorMessage?: string
  onSave?: (course: { name: string; representative: boolean }) => void
  onExitWithoutSaving?: () => void
}

export function WalkCompletePage({ map, dogName = '망고', distance = '2.1km', time = '31분', representativeEligible = true, representativeUnavailableReason = 'insufficient-gps', matchStatus, trackGeoJson, errorMessage, onSave, onExitWithoutSaving }: WalkCompletePageProps) {
  const [courseName, setCourseName] = useState('저녁 남산길')
  const [representative, setRepresentative] = useState(true)
  const [isRepresentativeAlertRequested, setIsRepresentativeAlertRequested] = useState(false)
  const [dismissedError, setDismissedError] = useState<string>()
  const selectedAsRepresentative = representativeEligible && representative
  const routeOverlay = useMemo(() => {
    const coordinates = trackGeoJson?.coordinates ?? []
    const routeCoordinates = coordinates.map(([longitude, latitude]) => ({ latitude, longitude }))
    const start = routeCoordinates[0]
    const finish = routeCoordinates.at(-1)
    return {
      viewFit: routeCoordinates.length > 1 ? {
        coordinates: routeCoordinates,
        padding: [24, 24, 24, 24] as [number, number, number, number],
        maxZoom: 17,
      } : undefined,
      markers: start && finish ? [
        { id: 'walk-complete-start', position: start, kind: 'start' as const, label: '출발' },
        { id: 'walk-complete-finish', position: finish, kind: 'finish' as const, label: '도착' },
      ] : [],
      routes: routeCoordinates.length > 1 ? [{
        id: 'walk-complete-route',
        coordinates: routeCoordinates,
        color: '#f47a3a',
        width: 6,
        outlineColor: '#fffdf8',
        outlineWidth: 9,
        lineCap: 'round' as const,
      }] : [],
    }
  }, [trackGeoJson])

  return (
    <main className="journey-page walk-complete-page">
      <header className="walk-complete-page__header">
        <h1>산책을 마쳤어요!</h1>
        <p>{dogName}와 함께한 오늘의 길을 저장해요.</p>
      </header>

      <img className="walk-complete-page__celebration" src="/assets/mascot/animated/06-walk-complete.gif" alt="산책 완료를 축하하는 강아지" />

      <BaseMapViewport
        className="walk-complete-page__map"
        ariaLabel="완료한 산책 경로 지도"
        map={map}
        sceneOverlay={routeOverlay}
        replaceBaseMarkers
        fallback={{ src: '/assets/s09/map.jpg' }}
      />

      <dl className="walk-complete-page__stats" aria-label="완료한 산책 기록">
        <div><dt>시간</dt><dd>{time}</dd></div>
        <div><dt>거리</dt><dd>{distance}</dd></div>
      </dl>

      <label className="walk-complete-page__name">
        <span>코스 이름</span>
        <input value={courseName} onChange={(event) => setCourseName(event.target.value)} />
      </label>

      <button
        className="walk-complete-page__representative"
        type="button"
        aria-pressed={selectedAsRepresentative}
        onClick={() => {
          if (!representativeEligible) {
            setIsRepresentativeAlertRequested(true)
            return
          }
          setRepresentative((selected) => !selected)
        }}
      >
        <span className="walk-complete-page__check" aria-hidden="true">
          <img src="/assets/s09/check-circle.svg" alt="" />
          {selectedAsRepresentative && <span>✓</span>}
        </span>
        대표 코스로 설정
      </button>

      {matchStatus === 'FAILED' && <p role="status">경로 매칭은 실패했지만 산책 기록은 그대로 저장할 수 있어요.</p>}
      <Button className="walk-complete-page__save" onClick={() => onSave?.({ name: courseName, representative: selectedAsRepresentative })}>
        코스 저장하기
      </Button>
      <Button className="walk-complete-page__exit" variant="ghost" onClick={onExitWithoutSaving}>저장하지 않고 나가기</Button>
      {isRepresentativeAlertRequested && <RepresentativeUnavailableDialog reason={representativeUnavailableReason} onClose={() => {
        setIsRepresentativeAlertRequested(false)
      }} />}
      {errorMessage && dismissedError !== errorMessage && <WalkProcessingAlertDialog message={errorMessage} onClose={() => setDismissedError(errorMessage)} />}
    </main>
  )
}
