import { GroupActivityItem } from '../Components/groups/GroupCards'
import type { GroupActivity } from '../Components/groups/GroupCards'
import { ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-profile-pages.css'

const activities: GroupActivity[] = [
  { id: 'share', member: '민지', message: '새 코스를 공유했어요', time: '2시간 전', avatarSrc: '/assets/g06/avatar-cream.svg' },
  { id: 'save-namsan', member: '태훈', message: '저녁 남산길을 저장했어요', time: '어제', avatarSrc: '/assets/g06/avatar-peach.svg' },
  { id: 'join', member: '서준', message: '그룹에 참여했어요', time: '2일 전', avatarSrc: '/assets/g06/avatar-cream.svg' },
  { id: 'save-hangang', member: '나', message: '한강 노을 산책을 저장했어요', time: '3일 전', avatarSrc: '/assets/g06/avatar-peach.svg' },
]

export function GroupActivityPage({ onBack }: { onBack?: () => void }) {
  return (
    <main className="journey-page extended-profile-page group-activity-page">
      <ManagementPageHeader title="그룹 활동" subtitle="남산 댕댕이 산책단" onBack={onBack} />
      <ol className="group-activity-page__list">
        {activities.map((activity) => <GroupActivityItem activity={activity} key={activity.id} />)}
      </ol>
    </main>
  )
}
