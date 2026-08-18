import { useState } from 'react'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../Components/profile/DogProfileCard'
import { Button, ManagementPageHeader, Switch, TextField } from '../Components/ui'
import { DOG_TEMPERAMENT_TAGS, MAX_DOG_TEMPERAMENT_TAGS } from '../features/dogs/temperament-tags'
import { DOG_PERSONALITY_ITEMS } from '../features/dogs/personality-options'
import type { DogGender, DogPersonalityValue } from '../features/dogs/personality-options'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-profile-pages.css'

export type DogProfileFormValue = DogPersonalityValue & {
  name: string
  breed: string
  birthDate: string
  gender: DogGender
  neutered: boolean | null
  introduction: string
  isDefault: boolean
  profileImageSrc: string
  temperamentTags: string[]
}

type DogProfileFormPageProps = {
  initialDog?: DogProfileFormValue
  onBack?: () => void
  onSave?: (dog: DogProfileFormValue) => void | Promise<void>
  onDelete?: () => void | Promise<void>
  title?: string
  subtitle?: string
  saveLabel?: string
  onSkip?: () => void
  onboarding?: boolean
}

const defaultPersonality: DogPersonalityValue = {
  leashGreeting: 'NEUTRAL', strangerResponse: 'NEUTRAL', touchTolerance: 'CONDITIONAL',
  barkingLevel: 'NORMAL', bitingLevel: 'NONE',
}

const defaultDog: DogProfileFormValue = {
  name: '망고', breed: '골든 리트리버', birthDate: '2022-05-12', gender: 'MALE', neutered: true,
  introduction: '', isDefault: true, profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE, temperamentTags: [],
  ...defaultPersonality,
}

type BirthParts = { year: string; month: string; day: string }
const parseBirthDate = (value: string): BirthParts => {
  const [year = '', month = '', day = ''] = value.split('-')
  return { year, month, day }
}
const currentYear = new Date().getFullYear()
const birthYears = Array.from({ length: 31 }, (_, index) => String(currentYear - index))
const birthMonths = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const daysFor = (year: string, month: string) => year && month ? new Date(Number(year), Number(month), 0).getDate() : 31
const PROFILE_IMAGE_SIZE = 1024

const prepareProfileImage = (file: File) => new Promise<string>((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(objectUrl)
    const canvas = document.createElement('canvas')
    canvas.width = PROFILE_IMAGE_SIZE
    canvas.height = PROFILE_IMAGE_SIZE
    const context = canvas.getContext('2d')
    if (!context) {
      reject(new Error('사진을 처리할 수 없어요.'))
      return
    }

    // 프로필 프레임을 빈틈없이 채우도록 중앙을 기준으로 정사각형 cover crop한다.
    const scale = Math.max(PROFILE_IMAGE_SIZE / image.naturalWidth, PROFILE_IMAGE_SIZE / image.naturalHeight)
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    context.drawImage(image, (PROFILE_IMAGE_SIZE - width) / 2, (PROFILE_IMAGE_SIZE - height) / 2, width, height)
    resolve(canvas.toDataURL('image/jpeg', 0.82))
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    reject(new Error('사진 파일을 읽지 못했어요.'))
  }
  image.src = objectUrl
})

export function DogProfileFormPage({ initialDog = defaultDog, onBack, onSave, onDelete, title = '반려견 정보', subtitle, saveLabel = '저장하기', onSkip, onboarding = false }: DogProfileFormPageProps) {
  const [dog, setDog] = useState(initialDog)
  const [birth, setBirth] = useState(() => parseBirthDate(initialDog.birthDate))
  const [saving, setSaving] = useState(false)
  const [photoChanged, setPhotoChanged] = useState(false)
  const [photoError, setPhotoError] = useState<string>()
  const [saveError, setSaveError] = useState<string>()
  const update = <Key extends keyof DogProfileFormValue>(key: Key, value: DogProfileFormValue[Key]) => setDog((current) => ({ ...current, [key]: value }))
  const personalityComplete = DOG_PERSONALITY_ITEMS.every((item) => dog[item.key] !== 'UNKNOWN')
  const isDefaultProfileImage = !dog.profileImageSrc
    || dog.profileImageSrc === DEFAULT_DOG_PROFILE_IMAGE
    || dog.profileImageSrc === '/assets/p02/dog-profile.png'
  const canSave = dog.name.trim().length > 0 && dog.breed.trim().length > 0 && dog.birthDate.length > 0
    && dog.gender !== 'UNKNOWN' && dog.neutered !== null && personalityComplete

  const updateBirth = (key: keyof BirthParts, value: string) => {
    const next = { ...birth, [key]: value }
    const maxDay = daysFor(next.year, next.month)
    if (Number(next.day) > maxDay) next.day = String(maxDay).padStart(2, '0')
    setBirth(next)
    update('birthDate', next.year && next.month && next.day ? `${next.year}-${next.month}-${next.day}` : '')
  }
  const toggleTemperament = (tag: string) => {
    const selected = dog.temperamentTags.includes(tag)
    if (!selected && dog.temperamentTags.length >= MAX_DOG_TEMPERAMENT_TAGS) return
    update('temperamentTags', selected ? dog.temperamentTags.filter((current) => current !== tag) : [...dog.temperamentTags, tag])
  }

  return (
    <main className="journey-page extended-profile-page dog-profile-form-page">
      <ManagementPageHeader title={title} subtitle={subtitle} onBack={onBack} />
      <div className="dog-profile-form-page__scroll">
        {onboarding && <div className="dog-profile-form-page__step"><span>2 / 2</span><strong>우리 아이를 소개해 주세요</strong><small>산책 전 언제든 마이페이지에서 바꿀 수 있어요.</small></div>}
        <div className="dog-profile-form-page__photo-frame">
          <img className="dog-profile-form-page__photo" src={dog.profileImageSrc || DEFAULT_DOG_PROFILE_IMAGE} alt={`${dog.name || '반려견'} 프로필 사진`} />
        </div>
        <div className={`dog-profile-form-page__photo-actions${isDefaultProfileImage ? ' is-default' : ''}`}>
          {!isDefaultProfileImage && <button type="button" onClick={() => {
            update('profileImageSrc', DEFAULT_DOG_PROFILE_IMAGE)
            setPhotoChanged(true)
            setPhotoError(undefined)
          }}>기본 프로필로 변경</button>}
          <label className="dog-profile-form-page__photo-action">사진 변경<input className="sr-only" type="file" accept="image/*" aria-label="반려견 사진 선택" onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setPhotoError(undefined)
            void prepareProfileImage(file)
              .then((image) => {
                update('profileImageSrc', image)
                setPhotoChanged(true)
              })
              .catch((reason: Error) => setPhotoError(reason.message))
          }} /></label>
        </div>
        <p className="dog-profile-form-page__photo-help">
          {photoChanged ? '새 사진이 선택됐어요. 저장하기를 눌러야 반영돼요.' : '사진은 저장하기를 눌러야 프로필에 반영돼요.'}
        </p>
        {photoError && <p className="dog-profile-form-page__form-error" role="alert">{photoError}</p>}

        <div className="dog-profile-form-page__name"><TextField label="이름" value={dog.name} onChange={(event) => update('name', event.target.value)} /></div>
        <div className="dog-profile-form-page__breed"><TextField label="견종" value={dog.breed} onChange={(event) => update('breed', event.target.value)} /></div>

        <fieldset className="dog-profile-form-page__basic-choice">
          <legend>성별</legend>
          <div className="dog-profile-form-page__binary-options">
            {([['MALE', '남아'], ['FEMALE', '여아']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={dog.gender === value} onClick={() => update('gender', value)}>{label}</button>)}
          </div>
        </fieldset>

        <fieldset className="dog-profile-form-page__basic-choice">
          <legend>중성화 여부</legend>
          <div className="dog-profile-form-page__binary-options">
            <button type="button" aria-pressed={dog.neutered === true} onClick={() => update('neutered', true)}>했어요</button>
            <button type="button" aria-pressed={dog.neutered === false} onClick={() => update('neutered', false)}>아직 안 했어요</button>
          </div>
        </fieldset>

        <fieldset className="dog-profile-form-page__birth">
          <legend>생년월일</legend>
          <div className="dog-profile-form-page__birth-selects">
            <label><span>연도</span><select aria-label="출생 연도" value={birth.year} onChange={(event) => updateBirth('year', event.target.value)}><option value="">연도</option>{birthYears.map((year) => <option key={year}>{year}</option>)}</select></label>
            <label><span>월</span><select aria-label="출생 월" value={birth.month} onChange={(event) => updateBirth('month', event.target.value)}><option value="">월</option>{birthMonths.map((month) => <option key={month}>{month}</option>)}</select></label>
            <label><span>일</span><select aria-label="출생 일" value={birth.day} onChange={(event) => updateBirth('day', event.target.value)}><option value="">일</option>{Array.from({ length: daysFor(birth.year, birth.month) }, (_, index) => String(index + 1).padStart(2, '0')).map((day) => <option key={day}>{day}</option>)}</select></label>
          </div>
        </fieldset>

        <fieldset className="dog-profile-form-page__temperament">
          <legend>특징 태그 <small>최대 {MAX_DOG_TEMPERAMENT_TAGS}개</small></legend>
          <p>{dog.temperamentTags.length >= MAX_DOG_TEMPERAMENT_TAGS ? `${MAX_DOG_TEMPERAMENT_TAGS}개를 모두 선택했어요. 선택을 해제하면 다른 태그를 고를 수 있어요.` : '다른 보호자가 만남 전에 알아두면 좋은 특징을 골라주세요.'}</p>
          <div className="dog-profile-form-page__tag-options">
            {DOG_TEMPERAMENT_TAGS.map((tag) => {
              const selected = dog.temperamentTags.includes(tag)
              const disabled = !selected && dog.temperamentTags.length >= MAX_DOG_TEMPERAMENT_TAGS
              return <button key={tag} type="button" aria-pressed={selected} disabled={disabled} onClick={() => toggleTemperament(tag)}><span aria-hidden="true">✓</span><b>#{tag}</b></button>
            })}
          </div>
        </fieldset>

        <section className="dog-profile-form-page__personality" aria-labelledby="dog-personality-title">
          <div className="dog-profile-form-page__section-heading"><strong id="dog-personality-title">성격</strong><span>각 항목을 하나씩 선택해 주세요</span></div>
          {DOG_PERSONALITY_ITEMS.map((item) => <div key={item.key} className="dog-profile-form-page__personality-item" role="group" aria-labelledby={`dog-personality-${item.key}`}>
            <div className="dog-profile-form-page__personality-label"><strong id={`dog-personality-${item.key}`}>{item.label}</strong><small>{item.description}</small></div>
            <div className="dog-profile-form-page__personality-options">
              {item.options.map((option) => <button key={option.value} type="button" aria-pressed={dog[item.key] === option.value} onClick={() => update(item.key, option.value)}>{option.label}</button>)}
            </div>
          </div>)}
        </section>

        <label className="dog-profile-form-page__introduction">
          <span>강아지 한 줄 소개 <small>선택</small></span>
          <textarea aria-label="강아지 한 줄 소개" maxLength={50} value={dog.introduction} placeholder="예: 천천히 다가오면 금방 친해져요." onChange={(event) => update('introduction', event.target.value)} />
          <small>{dog.introduction.length} / 50</small>
        </label>

        <div className="dog-profile-form-page__default"><Switch checked={dog.isDefault} onChange={(checked) => update('isDefault', checked)} label="기본 산책 친구" description="홈에서 먼저 선택해요" ariaLabel="기본 산책 친구" /></div>
        {onDelete && <Button className="dog-profile-form-page__delete" variant="ghost" onClick={() => {
          if (window.confirm('이 반려견 프로필을 삭제할까요? 산책 기록에 저장된 이름은 유지돼요.')) void onDelete()
        }}>반려견 삭제</Button>}
        <Button className="dog-profile-form-page__save" loading={saving} disabled={!canSave} onClick={() => {
          setSaveError(undefined)
          const result = onSave?.({ ...dog, name: dog.name.trim(), breed: dog.breed.trim(), introduction: dog.introduction.trim() })
          if (result instanceof Promise) {
            setSaving(true)
            void result
              .catch((reason: Error) => setSaveError(reason.message || '저장하지 못했어요. 다시 시도해 주세요.'))
              .finally(() => setSaving(false))
          }
        }}>{saveLabel}</Button>
        {saveError && <p className="dog-profile-form-page__form-error" role="alert">{saveError}</p>}
        {onSkip && <button className="dog-profile-form-page__skip" type="button" onClick={onSkip}>나중에 등록할게요</button>}
      </div>
    </main>
  )
}
