import { useCallback, useEffect, useState } from 'react'
import { GroupActivityItem } from '../Components/groups/GroupCards'
import type { GroupActivity as ActivityCard } from '../Components/groups/GroupCards'
import { ManagementPageHeader } from '../Components/ui'
import { groupApi } from '../api/groups'
import type { GroupActivity, GroupApi } from '../api/groups'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-profile-pages.css'

const relativeTime = (value: string) => {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

const toCard = (activity: GroupActivity): ActivityCard => ({
  id: String(activity.activityId),
  member: activity.actorNickname,
  message: activity.message,
  time: relativeTime(activity.createdAt),
  avatarSrc: activity.actorProfileImageUrl || '/assets/g06/avatar-cream.svg',
})

export function GroupActivityPage({ groupId, groupName, api = groupApi, onBack }: {
  groupId: number
  groupName?: string
  api?: Pick<GroupApi, 'activities'>
  onBack?: () => void
}) {
  const [activities, setActivities] = useState<GroupActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    void api.activities(groupId)
      .then(setActivities)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [api, groupId])

  useEffect(() => {
    let active = true
    void api.activities(groupId)
      .then((value) => { if (active) setActivities(value) })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, groupId])

  return (
    <main className="journey-page extended-profile-page group-activity-page">
      <ManagementPageHeader title="그룹 활동" subtitle={groupName} onBack={onBack} />
      <ol className="group-activity-page__list">
        {loading && <li className="group-page__state" role="status">그룹 활동을 불러오는 중이에요…</li>}
        {!loading && error && <li className="group-page__state" role="alert"><p>{error}</p><button type="button" onClick={load}>다시 시도</button></li>}
        {!loading && !error && activities.length === 0 && <li className="group-page__state">아직 기록된 그룹 활동이 없어요.</li>}
        {!loading && !error && activities.map((activity) => <GroupActivityItem activity={toCard(activity)} key={activity.activityId} />)}
      </ol>
    </main>
  )
}
