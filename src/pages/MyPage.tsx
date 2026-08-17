import { DogProfileCard } from '../Components/profile/DogProfileCard'
import { DetailRow, HomeBottomNavigation } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type MyPageProps = {
  profileImageSrc?: string
  userNickname?: string
  onOpenProfile?: () => void
  onOpenStats?: () => void
  onOpenDogs?: () => void
  onOpenGroups?: () => void
  onOpenNotifications?: () => void
  onOpenServiceInfo?: () => void
  onLogout?: () => void
}

export function MyPage({ profileImageSrc, userNickname, onOpenProfile, onOpenStats, onOpenDogs, onOpenGroups, onOpenNotifications, onOpenServiceInfo, onLogout }: MyPageProps) {
  return (
    <main className="journey-page profile-group-page my-page">
      <header className="my-page__header">
        <div>
          {userNickname && <p className="my-page__welcome"><strong>{userNickname}님</strong>, 반가워요.</p>}
          <h1>마이</h1>
        </div>
        {onLogout && <button className="my-page__logout" type="button" onClick={onLogout}>로그아웃</button>}
      </header>
      <div className="my-page__profile">
        <DogProfileCard dog={{ id: 'mango', name: '망고', detail: '골든 리트리버 · 4살', profileImageSrc }} actionLabel="프로필 관리" onAction={onOpenProfile} large />
      </div>
      <div className="my-page__stats"><DetailRow title="산책 통계" description="이번 달 12회 · 18.7km" onClick={onOpenStats} /></div>
      <div className="my-page__dogs"><DetailRow title="반려견 관리" description="2마리 등록" onClick={onOpenDogs} /></div>
      <div className="my-page__groups"><DetailRow title="그룹 관리" description="참여 중인 그룹 2개" onClick={onOpenGroups} /></div>
      <div className="my-page__notifications"><DetailRow title="알림 설정" description="거리두기 · 그룹 활동" onClick={onOpenNotifications} /></div>
      <div className="my-page__service"><DetailRow title="서비스 정보" description="버전 및 오픈소스" onClick={onOpenServiceInfo} /></div>
      <HomeBottomNavigation active="profile" />
    </main>
  )
}
