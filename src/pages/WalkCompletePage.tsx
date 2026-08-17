import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { Button } from '../Components/ui'
import { RepresentativeUnavailableDialog, WalkProcessingAlertDialog } from '../Components/system'
import type { WalkMatchStatus } from '../api/walks'
import '../styles/pages/journey-page.css'
import '../styles/pages/walk-complete-page.css'

type WalkCompletePageProps = {
  map?: BaseMapBinding
  dogName?: string
  distance?: string
  time?: string
  representativeEligible?: boolean
  matchStatus?: WalkMatchStatus
  errorMessage?: string
  onSave?: (course: { name: string; representative: boolean }) => void
  onExitWithoutSaving?: () => void
}

export function WalkCompletePage({ map, dogName = '망고', distance = '2.1km', time = '31분', representativeEligible = true, matchStatus, errorMessage, onSave, onExitWithoutSaving }: WalkCompletePageProps) {
  const [courseName, setCourseName] = useState('저녁 남산길')
  const [representative, setRepresentative] = useState(true)
  const [isRepresentativeAlertRequested, setIsRepresentativeAlertRequested] = useState(false)
  const [dismissedRepresentativeStatus, setDismissedRepresentativeStatus] = useState<WalkMatchStatus>()
  const [dismissedError, setDismissedError] = useState<string>()
  const selectedAsRepresentative = representativeEligible && representative
  const showRepresentativeAlert = isRepresentativeAlertRequested
    || (matchStatus === 'INSUFFICIENT_POINTS' && dismissedRepresentativeStatus !== matchStatus)

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
      {showRepresentativeAlert && <RepresentativeUnavailableDialog onClose={() => {
        setIsRepresentativeAlertRequested(false)
        if (matchStatus === 'INSUFFICIENT_POINTS') setDismissedRepresentativeStatus(matchStatus)
      }} />}
      {errorMessage && dismissedError !== errorMessage && <WalkProcessingAlertDialog message={errorMessage} onClose={() => setDismissedError(errorMessage)} />}
    </main>
  )
}
