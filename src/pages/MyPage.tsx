import { DogProfileCard } from '../Components/profile/DogProfileCard'
import type { DogProfileSummary } from '../Components/profile/DogProfileCard'
import { DetailRow, HomeBottomNavigation } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type MyPageProps = {
  profileImageSrc?: string
  userNickname?: string
  onOpenProfile?: () => void
  onOpenAccount?: () => void
  onOpenStats?: () => void
  onOpenDogs?: () => void
  onOpenGroups?: () => void
  onOpenNotifications?: () => void
  onOpenServiceInfo?: () => void
  onLogout?: () => void
  dog?: DogProfileSummary | null
  dogCount?: number
  notificationDescription?: string
  walkStatisticsDescription?: string
}

const previewDog: DogProfileSummary = { id: 'mango', name: '망고', detail: '골든 리트리버 · 4살' }

export function MyPage({ profileImageSrc, userNickname, onOpenProfile, onOpenAccount, onOpenStats, onOpenDogs, onOpenGroups, onOpenNotifications, onOpenServiceInfo, onLogout, dog, dogCount = 2, notificationDescription = '거리두기 · 만나기 · 그룹 활동', walkStatisticsDescription = '산책 기록을 확인해 보세요' }: MyPageProps) {
  const shownDog = dog === undefined ? { ...previewDog, profileImageSrc } : dog
  return (
    <main className="journey-page profile-group-page my-page">
      <header className="my-page__header">
        <div>
          {userNickname && <p className="my-page__welcome"><strong>{userNickname}님</strong>, 반가워요.</p>}
          <h1>마이</h1>
        </div>
        <div className="my-page__header-actions">
          {onOpenAccount && <button className="my-page__logout" type="button" onClick={onOpenAccount}>계정 관리</button>}
          {onLogout && <button className="my-page__logout" type="button" onClick={onLogout}>로그아웃</button>}
        </div>
      </header>
      <div className="my-page__profile">
        {shownDog
          ? <DogProfileCard dog={shownDog} actionLabel="프로필 관리" onAction={onOpenProfile} large />
          : <DetailRow title="반려견을 등록해 주세요" description="산책 기록에 함께할 친구를 추가해요" onClick={onOpenDogs} />}
      </div>
      <div className="my-page__stats"><DetailRow title="산책 통계" description={walkStatisticsDescription} onClick={onOpenStats} /></div>
      <div className="my-page__dogs"><DetailRow title="반려견 관리" description={`${dogCount}마리 등록`} onClick={onOpenDogs} /></div>
      <div className="my-page__groups"><DetailRow title="그룹 관리" description="참여 중인 그룹 2개" onClick={onOpenGroups} /></div>
      <div className="my-page__notifications"><DetailRow title="알림 설정" description={notificationDescription} onClick={onOpenNotifications} /></div>
      <div className="my-page__service"><DetailRow title="서비스 정보" description="버전 및 오픈소스" onClick={onOpenServiceInfo} /></div>
      <HomeBottomNavigation active="profile" />
    </main>
  )
}
