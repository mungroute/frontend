import { GroupCard } from '../Components/groups/GroupCards'
import type { GroupSummary } from '../Components/groups/GroupCards'
import { Button, HomeBottomNavigation, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

const groups: GroupSummary[] = [
  { id: 'namsan-dogs', name: '남산 댕댕이 산책단', summary: '6명 · 공유 코스 12개', activity: '최근 활동 2시간 전', membersImageSrc: '/assets/g01/members-namsan.svg' },
  { id: 'hangang-weekend', name: '주말 한강 걷기', summary: '4명 · 공유 코스 7개', activity: '최근 활동 어제', membersImageSrc: '/assets/g01/members-hangang.svg' },
]

type GroupListPageProps = {
  onBack?: () => void
  onCreateGroup?: () => void
  onJoinGroup?: () => void
  onOpenGroup?: (id: string) => void
}

export function GroupListPage({ onBack, onCreateGroup, onJoinGroup, onOpenGroup }: GroupListPageProps) {
  return (
    <main className="journey-page profile-group-page group-list-page">
      <ManagementPageHeader title="그룹" subtitle="함께 걷는 친구들의 코스를 나눠요" onBack={onBack} />
      <div className="group-list-page__actions">
        <Button onClick={onCreateGroup}>그룹 만들기</Button>
        <Button variant="secondary" onClick={onJoinGroup}>초대 코드로 참여</Button>
      </div>
      <div className="group-list-page__list">
        {groups.map((group) => <GroupCard key={group.id} group={group} onClick={() => onOpenGroup?.(group.id)} />)}
      </div>
      <HomeBottomNavigation active="groups" />
    </main>
  )
}
