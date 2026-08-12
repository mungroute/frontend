import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { Button } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/walk-complete-page.css'

type WalkCompletePageProps = {
  map?: BaseMapBinding
  dogName?: string
  onSave?: (course: { name: string; representative: boolean }) => void
}

export function WalkCompletePage({ map, dogName = '망고', onSave }: WalkCompletePageProps) {
  const [courseName, setCourseName] = useState('저녁 남산길')
  const [representative, setRepresentative] = useState(true)

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
        <div><dt>거리</dt><dd>2.1km</dd></div>
        <div><dt>시간</dt><dd>31분</dd></div>
        <div><dt>소모 칼로리</dt><dd>126kcal</dd></div>
      </dl>

      <label className="walk-complete-page__name">
        <span>코스 이름</span>
        <input value={courseName} onChange={(event) => setCourseName(event.target.value)} />
      </label>

      <button
        className="walk-complete-page__representative"
        type="button"
        aria-pressed={representative}
        onClick={() => setRepresentative((selected) => !selected)}
      >
        <span className="walk-complete-page__check" aria-hidden="true">
          <img src="/assets/s09/check-circle.svg" alt="" />
          {representative && <span>✓</span>}
        </span>
        대표 코스로 설정
      </button>

      <Button className="walk-complete-page__save" onClick={() => onSave?.({ name: courseName, representative })}>
        코스 저장하기
      </Button>
    </main>
  )
}
