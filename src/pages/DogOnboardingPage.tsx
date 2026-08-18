import { DEFAULT_DOG_PROFILE_IMAGE } from '../Components/profile/DogProfileCard'
import { DogProfileFormPage } from './DogProfileFormPage'
import type { DogProfileFormValue } from './DogProfileFormPage'

type DogOnboardingPageProps = {
  onSave: (dog: DogProfileFormValue) => void | Promise<void>
  onSkip: () => void
}

const emptyDog: DogProfileFormValue = {
  name: '',
  breed: '',
  birthDate: '',
  gender: 'UNKNOWN',
  neutered: null,
  introduction: '',
  isDefault: true,
  profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE,
  temperamentTags: [],
  leashGreeting: 'UNKNOWN',
  strangerResponse: 'UNKNOWN',
  touchTolerance: 'UNKNOWN',
  barkingLevel: 'UNKNOWN',
  bitingLevel: 'UNKNOWN',
}

export function DogOnboardingPage({ onSave, onSkip }: DogOnboardingPageProps) {
  return <DogProfileFormPage
    title="반려견 등록"
    subtitle="가입 완료 · 마지막 한 단계예요"
    initialDog={emptyDog}
    saveLabel="반려견 등록하고 시작하기"
    onSave={onSave}
    onSkip={onSkip}
    onboarding
  />
}
