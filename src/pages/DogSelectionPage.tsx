import { useState } from 'react'
import { Footprints, ShieldCheck, Users } from 'lucide-react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DraggableSheet } from '../Components/ui'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../Components/profile/DogProfileCard'
import type { DogProfileSummary } from '../Components/profile/DogProfileCard'
import type { WalkPresenceMode } from '../api/walks'
import { PresenceModeConfirmDialog } from '../Components/system'
import { requestNavigationOrientationPermission } from '../features/navigation/hooks/useNavigationHeading'
import '../styles/pages/journey-page.css'
import '../styles/pages/dog-selection-page.css'

export type DogProfile = DogProfileSummary

type DogSelectionPageProps = {
  map?: BaseMapBinding
  dogs?: DogProfile[]
  onBack?: () => void
  onConfirm?: (selection: { dogIds: string[]; mode: WalkPresenceMode }) => void
  onRegisterDog?: () => void
  starting?: boolean
  errorMessage?: string
}

const defaultDogs: DogProfile[] = [
  { id: 'mango', name: '망고', detail: '골든리트리버 · 3살' },
  { id: 'cookie', name: '쿠키', detail: '말티즈 · 5살' },
]

export function DogSelectionPage({ dogs = defaultDogs, map, onBack = () => window.history.back(), onConfirm = () => undefined, onRegisterDog = () => undefined, starting = false, errorMessage }: DogSelectionPageProps) {
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>(() => dogs[0] ? [dogs[0].id] : [])
  const [mode, setMode] = useState<WalkPresenceMode>('distance')
  const [confirmingMode, setConfirmingMode] = useState(false)

  const toggleDog = (dogId: string) => {
    setSelectedDogIds((current) => {
      if (!current.includes(dogId)) return [...current, dogId]
      return current.length === 1 ? current : current.filter((id) => id !== dogId)
    })
  }

  const confirmSelection = () => {
    void requestNavigationOrientationPermission()
    if (mode === 'off') {
      onConfirm({ dogIds: selectedDogIds, mode })
      return
    }
    setConfirmingMode(true)
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
                <span className="dog-selection-page__radio" aria-hidden="true">{selected && <b>✓</b>}</span>
              </button>
            )
          })}
        </div>

        <button className="dog-selection-page__register" type="button" aria-label="반려견 등록하기" onClick={onRegisterDog}>＋ 반려견 등록하기</button>
        <section className="dog-selection-page__mode-section" aria-labelledby="walk-mode-title">
          <div className="dog-selection-page__mode-heading">
            <span>WALK MODE</span>
            <h2 id="walk-mode-title">오늘은 어떻게 걸을까요?</h2>
          </div>
          <div className="dog-selection-page__mode-options" role="radiogroup" aria-label="산책 모드 선택">
            <button type="button" role="radio" aria-checked={mode === 'off'} onClick={() => setMode('off')}>
              <span className="dog-selection-page__mode-index">01</span>
              <span className="dog-selection-page__mode-icon"><Footprints size={19} /></span>
              <span><strong>일반 산책</strong><small>주변 사용자 기능 없이 걸어요.</small></span>
              <i aria-hidden="true" />
            </button>
            <button type="button" role="radio" aria-checked={mode === 'distance'} onClick={() => setMode('distance')}>
              <span className="dog-selection-page__mode-index">02</span>
              <span className="dog-selection-page__mode-icon"><ShieldCheck size={19} /></span>
              <span><strong>거리두기 산책</strong><small>가까워지는 방향만 익명으로 알려줘요.</small></span>
              <i aria-hidden="true" />
            </button>
            <button type="button" role="radio" aria-checked={mode === 'meet'} onClick={() => setMode('meet')}>
              <span className="dog-selection-page__mode-index">03</span>
              <span className="dog-selection-page__mode-icon"><Users size={19} /></span>
              <span><strong>산책 친구 만나기</strong><small>서로 동의한 친구와 만날 수 있어요.</small></span>
              <i aria-hidden="true" />
            </button>
          </div>
          {mode !== 'off' && <p className="dog-selection-page__mode-lock">이번 산책에서는 선택한 모드만 켜고 끌 수 있어요.</p>}
        </section>
        {errorMessage && <p className="dog-selection-page__error" role="alert">{errorMessage}</p>}
      </DraggableSheet>
      <button className="journey-page__primary-action dog-selection-page__confirm" type="button" disabled={selectedDogIds.length === 0 || starting} onClick={confirmSelection}>{starting ? '산책 시작 중…' : '이 설정으로 산책 시작'}</button>
      {confirmingMode && mode !== 'off' && <PresenceModeConfirmDialog
        mode={mode}
        nextEnabled
        onClose={() => setConfirmingMode(false)}
        onConfirm={() => {
          setConfirmingMode(false)
          onConfirm({ dogIds: selectedDogIds, mode })
        }}
      />}
    </main>
  )
}
