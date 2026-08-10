import { useRef, useState } from 'react'
import { Button, ManagementPageHeader, Switch, TextField } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-profile-pages.css'

export type DogProfileFormValue = {
  name: string
  breed: string
  birthDate: string
  isDefault: boolean
  profileImageSrc: string
}

type DogProfileFormPageProps = {
  initialDog?: DogProfileFormValue
  onBack?: () => void
  onSave?: (dog: DogProfileFormValue) => void
}

const defaultDog: DogProfileFormValue = {
  name: '망고',
  breed: '골든 리트리버',
  birthDate: '2022-05-12',
  isDefault: true,
  profileImageSrc: '/assets/p02/dog-profile.png',
}

function formatBirthDate(value: string) {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${year}. ${month}. ${day}` : '생년월일 선택'
}

export function DogProfileFormPage({ initialDog = defaultDog, onBack, onSave }: DogProfileFormPageProps) {
  const [dog, setDog] = useState(initialDog)
  const birthDateInputRef = useRef<HTMLInputElement>(null)
  const update = <Key extends keyof DogProfileFormValue>(key: Key, value: DogProfileFormValue[Key]) => setDog((current) => ({ ...current, [key]: value }))
  const canSave = dog.name.trim().length > 0 && dog.breed.trim().length > 0 && dog.birthDate.length > 0

  return (
    <main className="journey-page extended-profile-page dog-profile-form-page">
      <ManagementPageHeader title="반려견 정보" onBack={onBack} />
      <img className="dog-profile-form-page__photo" src={dog.profileImageSrc} alt={`${dog.name || '반려견'} 프로필 사진`} />
      <label className="dog-profile-form-page__photo-action">사진 변경<input className="sr-only" type="file" accept="image/*" aria-label="반려견 사진 선택" onChange={(event) => {
        const file = event.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => update('profileImageSrc', String(reader.result))
        reader.readAsDataURL(file)
      }} /></label>
      <div className="dog-profile-form-page__name"><TextField label="이름" value={dog.name} onChange={(event) => update('name', event.target.value)} /></div>
      <div className="dog-profile-form-page__breed"><TextField label="견종" value={dog.breed} onChange={(event) => update('breed', event.target.value)} /></div>
      <div className="dog-profile-form-page__birth">
        <div className="ui-field">
          <span className="ui-field__label">생년월일</span>
          <button className="ui-field__input dog-profile-form-page__date-trigger" type="button" onClick={() => {
            const input = birthDateInputRef.current
            if (!input) return
            try {
              input.showPicker()
            } catch {
              input.click()
            }
          }}>{formatBirthDate(dog.birthDate)}</button>
          <input ref={birthDateInputRef} className="sr-only" type="date" value={dog.birthDate} aria-label="생년월일 선택" onChange={(event) => update('birthDate', event.target.value)} />
        </div>
      </div>
      <div className="dog-profile-form-page__default"><Switch checked={dog.isDefault} onChange={(checked) => update('isDefault', checked)} label="기본 산책 친구" description="홈에서 먼저 선택해요" ariaLabel="기본 산책 친구" /></div>
      <Button className="dog-profile-form-page__save" disabled={!canSave} onClick={() => onSave?.({ ...dog, name: dog.name.trim(), breed: dog.breed.trim() })}>저장하기</Button>
    </main>
  )
}
