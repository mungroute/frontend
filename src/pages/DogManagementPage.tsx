import { DogProfileCard } from '../Components/profile/DogProfileCard'
import type { DogProfileSummary } from '../Components/profile/DogProfileCard'
import { Button, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

const defaultDogs: DogProfileSummary[] = [
  { id: 'mango', name: '망고', detail: '골든 리트리버 · 4살' },
  { id: 'cookie', name: '쿠키', detail: '푸들 · 2살' },
]

type DogManagementPageProps = {
  dogs?: DogProfileSummary[]
  onBack?: () => void
  onEditDog?: (id: string) => void
  onRegisterDog?: () => void
}

export function DogManagementPage({ dogs = defaultDogs, onBack, onEditDog, onRegisterDog }: DogManagementPageProps) {
  return (
    <main className="journey-page profile-group-page dog-management-page">
      <ManagementPageHeader title="반려견 관리" subtitle="산책 기록에 함께 저장할 친구들" onBack={onBack} />
      <div className="dog-management-page__list">
        {dogs.map((dog) => <DogProfileCard key={dog.id} dog={dog} actionLabel="편집" onAction={() => onEditDog?.(dog.id)} />)}
      </div>
      <Button className="dog-management-page__register" variant="secondary" aria-label="반려견 등록하기" onClick={onRegisterDog}>＋ 반려견 등록하기</Button>
    </main>
  )
}
