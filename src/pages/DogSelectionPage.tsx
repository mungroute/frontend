import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DraggableSheet, Switch } from '../Components/ui'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../Components/profile/DogProfileCard'
import type { DogProfileSummary } from '../Components/profile/DogProfileCard'
import '../styles/pages/journey-page.css'
import '../styles/pages/dog-selection-page.css'

export type DogProfile = DogProfileSummary

type DogSelectionPageProps = {
  map?: BaseMapBinding
  dogs?: DogProfile[]
  onBack?: () => void
  onConfirm?: (selection: { dogIds: string[]; distanceMode: boolean }) => void
  onRegisterDog?: () => void
}

const defaultDogs: DogProfile[] = [
  { id: 'mango', name: '망고', detail: '골든리트리버 · 3살' },
  { id: 'cookie', name: '쿠키', detail: '말티즈 · 5살' },
]

export function DogSelectionPage({ dogs = defaultDogs, map, onBack = () => window.history.back(), onConfirm = () => undefined, onRegisterDog = () => undefined }: DogSelectionPageProps) {
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>(() => dogs[0] ? [dogs[0].id] : [])
  const [distanceMode, setDistanceMode] = useState(true)

  const toggleDog = (dogId: string) => {
    setSelectedDogIds((current) => {
      if (!current.includes(dogId)) return [...current, dogId]
      return current.length === 1 ? current : current.filter((id) => id !== dogId)
    })
  }

  return (
    <main className="journey-page dog-selection-page">
      <BaseMapViewport className="dog-selection-page__map" ariaLabel="산책 출발 위치 지도" map={map} fallback={{ src: '/assets/s07/map.jpg' }} />
      <button className="dog-selection-page__back" type="button" onClick={onBack} aria-label="반려견 선택에서 뒤로 가기">
        <span aria-hidden="true">‹</span> 반려견 선택
      </button>
      <DraggableSheet className="dog-selection-page__sheet">
        <h1>함께 산책할 반려견 선택</h1>
        <p className="dog-selection-page__intro">오늘의 산책 기록에 함께 저장돼요.</p>

        <div className="dog-selection-page__dogs">
          {dogs.map((dog) => {
            const selected = selectedDogIds.includes(dog.id)
            return (
              <button key={dog.id} type="button" aria-label={`${dog.name} 선택`} aria-pressed={selected} onClick={() => toggleDog(dog.id)}>
                <span className="dog-selection-page__avatar">
                  <img src={dog.profileImageSrc || DEFAULT_DOG_PROFILE_IMAGE} alt={`${dog.name} 프로필`} />
                </span>
                <span><strong>{dog.name}</strong><small>{dog.detail}</small></span>
                <span className="dog-selection-page__radio"><img src={selected ? '/assets/m04/radio-selected.svg' : '/assets/m04/radio-default.svg'} alt="" />{selected && <b aria-hidden="true">✓</b>}</span>
              </button>
            )
          })}
        </div>

        <button className="dog-selection-page__register" type="button" aria-label="반려견 등록하기" onClick={onRegisterDog}>＋ 반려견 등록하기</button>
        <div className="dog-selection-page__distance-card">
          <Switch checked={distanceMode} onChange={setDistanceMode} label="거리두기 모드" ariaLabel="거리두기 모드" description="내 위치를 흐리게 공유하고 있어요" />
          <span>약 100m 범위로 표시</span>
        </div>
        <button className="journey-page__primary-action dog-selection-page__confirm" type="button" disabled={selectedDogIds.length === 0} onClick={() => onConfirm({ dogIds: selectedDogIds, distanceMode })}>선택 완료</button>
      </DraggableSheet>
    </main>
  )
}
