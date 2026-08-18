import { useCallback, useEffect, useState } from 'react'
import { GroupCard } from '../Components/groups/GroupCards'
import type { GroupCardData } from '../Components/groups/GroupCards'
import { Button, HomeBottomNavigation, ManagementPageHeader } from '../Components/ui'
import { groupApi } from '../api/groups'
import type { GroupApi, GroupSummary } from '../api/groups'
import type { CourseSource } from '../api/courses'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type GroupListPageProps = {
  api?: Pick<GroupApi, 'list' | 'discover' | 'joinOpen' | 'shareCourse'>
  pendingShare?: { courseSource: CourseSource; courseId: number }
  onBack?: () => void
  onCreateGroup?: () => void
  onJoinGroup?: () => void
  onOpenGroup?: (id: number) => void
}

const relativeActivity = (value: string | null) => {
  if (!value) return '아직 활동이 없어요'
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const hours = Math.floor(elapsed / 3_600_000)
  if (hours < 1) return '최근 활동 방금 전'
  if (hours < 24) return `최근 활동 ${hours}시간 전`
  return `최근 활동 ${Math.floor(hours / 24)}일 전`
}

const toCard = (group: GroupSummary): GroupCardData => ({
  id: String(group.groupId),
  name: group.name,
  summary: `${group.memberCount}명 · 공유 코스 ${group.sharedCourseCount}개`,
  activity: relativeActivity(group.latestActivityAt),
  membersImageSrc: '/assets/g01/members-namsan.svg',
})

export function GroupListPage({ api = groupApi, pendingShare, onBack, onCreateGroup, onJoinGroup, onOpenGroup }: GroupListPageProps) {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [discoverableGroups, setDiscoverableGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [openingGroupId, setOpeningGroupId] = useState<number>()
  const [actionError, setActionError] = useState<string>()
  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    void Promise.all([api.list(), api.discover()])
      .then(([mine, discoverable]) => { setGroups(mine); setDiscoverableGroups(discoverable) })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [api])

  useEffect(() => {
    let active = true
    void Promise.all([api.list(), api.discover()])
      .then(([mine, discoverable]) => { if (active) { setGroups(mine); setDiscoverableGroups(discoverable) } })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api])

  const openGroup = (groupId: number) => {
    if (!pendingShare) {
      onOpenGroup?.(groupId)
      return
    }
    setOpeningGroupId(groupId)
    setActionError(undefined)
    void api.shareCourse(groupId, pendingShare.courseSource, pendingShare.courseId)
      .then(() => onOpenGroup?.(groupId))
      .catch((reason: Error) => setActionError(reason.message))
      .finally(() => setOpeningGroupId(undefined))
  }

  const joinPublicGroup = (group: GroupSummary) => {
    if (group.joinPolicy === 'INVITE_ONLY') {
      onJoinGroup?.()
      return
    }
    setOpeningGroupId(group.groupId)
    setActionError(undefined)
    void api.joinOpen(group.groupId)
      .then(() => onOpenGroup?.(group.groupId))
      .catch((reason: Error) => setActionError(reason.message))
      .finally(() => setOpeningGroupId(undefined))
  }

  return (
    <main className="journey-page profile-group-page group-list-page">
      <ManagementPageHeader title="그룹" subtitle="함께 걷는 친구들의 코스를 나눠요" onBack={onBack} />
      <div className="group-list-page__actions">
        <Button onClick={onCreateGroup}>그룹 만들기</Button>
        <Button variant="secondary" onClick={onJoinGroup}>초대 코드로 참여</Button>
      </div>
      <div className="group-list-page__list">
        {pendingShare && <p className="group-list-page__share-guide">공유할 그룹을 선택해주세요.</p>}
        {actionError && <p className="group-list-page__error" role="alert">{actionError}</p>}
        {loading && <p className="group-page__state" role="status">참여 중인 그룹을 불러오는 중이에요…</p>}
        {!loading && error && <div className="group-page__state" role="alert"><p>{error}</p><button type="button" onClick={load}>다시 시도</button></div>}
        {!loading && !error && <h2>내 그룹</h2>}
        {!loading && !error && groups.length === 0 && <p className="group-page__state">아직 참여 중인 그룹이 없어요.<br />그룹을 만들거나 초대 코드로 참여해 보세요.</p>}
        {!loading && !error && groups.map((group) => <GroupCard key={group.groupId} group={{ ...toCard(group), activity: openingGroupId === group.groupId ? '코스를 공유하는 중이에요…' : toCard(group).activity }} onClick={() => openGroup(group.groupId)} />)}
        {!loading && !error && !pendingShare && discoverableGroups.length > 0 && <h2>공개 그룹 둘러보기</h2>}
        {!loading && !error && !pendingShare && discoverableGroups.map((group) => <GroupCard key={`discover-${group.groupId}`} group={{ ...toCard(group), activity: openingGroupId === group.groupId ? '참여하는 중이에요…' : group.joinPolicy === 'OPEN' ? '누르면 바로 참여해요' : '초대 코드가 필요해요' }} onClick={() => joinPublicGroup(group)} />)}
      </div>
      <HomeBottomNavigation active="groups" />
    </main>
  )
}
