import { useCallback, useEffect, useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding, MapCoordinate } from '../Components/map'
import { courseRouteCoordinates } from '../Components/courses/course-map'
import { SharedRouteRow } from '../Components/groups/GroupCards'
import { Button, ManagementPageHeader } from '../Components/ui'
import { CourseShareSheet, GroupExitConfirmDialog, GroupInfoSaveConfirmDialog, RemoveGroupMemberDialog } from '../Components/system'
import { courseCatalogApi } from '../api/courses'
import type { CourseCatalogApi, CourseSummary } from '../api/courses'
import { groupApi } from '../api/groups'
import type { GroupApi, GroupDetail, GroupInvite, GroupJoinPolicy, GroupVisibility } from '../api/groups'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type GroupRoomPageProps = {
  groupId: number
  map?: BaseMapBinding
  api?: GroupApi
  courseApi?: Pick<CourseCatalogApi, 'list'>
  onBack?: () => void
  onOpenSharedCourse?: (id: number) => void
  onOpenActivity?: () => void
  onOpenAllCourses?: () => void
  onClosed?: () => void
}

const routeViewport = (coordinates: MapCoordinate[]) => {
  if (!coordinates.length) return undefined
  const west = Math.min(...coordinates.map((point) => point.longitude))
  const east = Math.max(...coordinates.map((point) => point.longitude))
  const south = Math.min(...coordinates.map((point) => point.latitude))
  const north = Math.max(...coordinates.map((point) => point.latitude))
  const span = Math.max(east - west, north - south, 0.0002)
  return {
    center: { latitude: (south + north) / 2, longitude: (west + east) / 2 },
    zoom: Math.max(11, Math.min(17, Math.log2(360 / span) - 8)),
  }
}

const shareOption = (course: CourseSummary) => ({
  id: `${course.courseSource}:${course.courseId}`,
  title: course.courseName,
  meta: `${course.durationMin}분 · ${(course.lengthM / 1000).toFixed(1)}km${course.metrics?.shadeRatio == null ? '' : ` · 그늘 ${Math.round(course.metrics.shadeRatio * 100)}%`}`,
})

const GROUP_ROUTE_COLORS = [
  '#f47a3a', '#20a88f', '#5f82c5', '#9b6fc3', '#d96f8c',
  '#c5902f', '#5e9a68', '#d65e55', '#467f96', '#b87945',
]

export const groupRouteColorForUser = (userId: number) => {
  let hash = Math.imul(userId, 0x45d9f3b)
  hash = Math.imul((hash >>> 16) ^ hash, 0x45d9f3b)
  hash = (hash >>> 16) ^ hash
  return GROUP_ROUTE_COLORS[(hash >>> 0) % GROUP_ROUTE_COLORS.length]
}

export function GroupRoomPage({ groupId, map, api = groupApi, courseApi = courseCatalogApi, onBack, onOpenSharedCourse, onOpenActivity, onOpenAllCourses, onClosed }: GroupRoomPageProps) {
  const [group, setGroup] = useState<GroupDetail>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [invite, setInvite] = useState<GroupInvite>()
  const [actionError, setActionError] = useState<string>()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<GroupVisibility>('PRIVATE')
  const [joinPolicy, setJoinPolicy] = useState<GroupJoinPolicy>('INVITE_ONLY')
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ userId: number; nickname: string }>()
  const [actionBusy, setActionBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    void api.detail(groupId)
      .then((value) => {
        setGroup(value)
        setName(value.name)
        setDescription(value.description)
        setVisibility(value.visibility)
        setJoinPolicy(value.joinPolicy)
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [api, groupId])

  useEffect(() => {
    let active = true
    void api.detail(groupId)
      .then((value) => {
        if (!active) return
        setGroup(value)
        setName(value.name)
        setDescription(value.description)
        setVisibility(value.visibility)
        setJoinPolicy(value.joinPolicy)
      })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, groupId])

  const mapOverlay = useMemo(() => {
    const routes = group?.recentCourses.map((shared) => ({
      id: `group-route-${shared.sharedCourseId}`,
      coordinates: courseRouteCoordinates(shared.course.route),
      color: groupRouteColorForUser(shared.sharedByUserId),
      width: 6,
      outlineColor: '#fffdf8',
      outlineWidth: 9,
      lineCap: 'round' as const,
      interactive: true,
      interactionId: String(shared.sharedCourseId),
    })).filter((route) => route.coordinates.length > 1) ?? []
    const allCoordinates = routes.flatMap((route) => route.coordinates)
    return { ...routeViewport(allCoordinates), routes, markers: [] }
  }, [group])

  const openShare = () => {
    setActionError(undefined)
    void courseApi.list({ size: 100 })
      .then((value) => {
        setCourses(value)
        setIsShareOpen(true)
      })
      .catch((reason: Error) => setActionError(reason.message))
  }

  const share = (id: string) => {
    const [source, rawId] = id.split(':')
    if ((source !== 'walk' && source !== 'custom') || !Number.isSafeInteger(Number(rawId))) return
    setActionError(undefined)
    void api.shareCourse(groupId, source, Number(rawId))
      .then(() => {
        setIsShareOpen(false)
        load()
      })
      .catch((reason: Error) => setActionError(reason.message))
  }

  const issueInvite = () => {
    setActionError(undefined)
    void api.issueInvite(groupId).then(setInvite).catch((reason: Error) => setActionError(reason.message))
  }

  const closeGroup = () => {
    if (!group) return
    const owner = group.myRole === 'OWNER'
    setActionBusy(true)
    setActionError(undefined)
    void (owner ? api.delete(groupId) : api.leave(groupId))
      .then(() => {
        setExitConfirmOpen(false)
        onClosed?.()
      })
      .catch((reason: Error) => {
        setExitConfirmOpen(false)
        setActionError(reason.message)
      })
      .finally(() => setActionBusy(false))
  }

  const removeMember = () => {
    if (!memberToRemove) return
    setActionBusy(true)
    setActionError(undefined)
    void api.removeMember(groupId, memberToRemove.userId)
      .then(() => {
        setMemberToRemove(undefined)
        load()
      })
      .catch((reason: Error) => {
        setMemberToRemove(undefined)
        setActionError(reason.message)
      })
      .finally(() => setActionBusy(false))
  }

  const saveGroupInfo = () => {
    setActionBusy(true)
    setActionError(undefined)
    void api.update(groupId, {
      name: name.trim(),
      description: description.trim(),
      visibility,
      joinPolicy: visibility === 'PRIVATE' ? 'INVITE_ONLY' : joinPolicy,
    })
      .then((value) => {
        setGroup(value)
        setSaveConfirmOpen(false)
      })
      .catch((reason: Error) => {
        setSaveConfirmOpen(false)
        setActionError(reason.message)
      })
      .finally(() => setActionBusy(false))
  }

  if (loading || !group) {
    return (
      <main className="journey-page profile-group-page group-room-page">
        <ManagementPageHeader title="그룹" onBack={onBack} />
        <div className="group-room-page__state" role={error ? 'alert' : 'status'}>
          <p>{error || '그룹 정보를 불러오는 중이에요…'}</p>
          {error && <button type="button" onClick={load}>다시 시도</button>}
        </div>
      </main>
    )
  }

  return (
    <main className="journey-page profile-group-page group-room-page">
      <ManagementPageHeader title={group.name} onBack={onBack} trailing={<div className="group-room-page__header-actions"><button type="button" onClick={() => setIsManageOpen((value) => !value)}>{group.myRole === 'OWNER' ? '관리' : '멤버'}</button><button type="button" aria-label="그룹 활동 보기" onClick={onOpenActivity}>활동</button></div>} />
      <BaseMapViewport
        className="group-room-page__map"
        ariaLabel="그룹 공유 코스 지도"
        map={map}
        sceneOverlay={mapOverlay}
        replaceBaseMarkers
        fallback={{ src: '/assets/g02/map.jpg', overlay: <span className="group-room-page__map-note">실시간 위치가 아닌 공유 코스만 표시</span> }}
        onMapClick={(event) => { if (event.featureId) onOpenSharedCourse?.(Number(event.featureId)) }}
      />
      <section className="group-room-page__sheet">
        {!isManageOpen ? <>
          <div className="group-room-page__sheet-heading"><div><h2>그룹 공유 코스</h2><p>멤버의 실시간 위치는 표시하지 않아요.</p></div>{group.sharedCourseCount > 3 && <button type="button" onClick={onOpenAllCourses}>전체 보기</button>}</div>
          <div className="group-room-page__routes">
            {group.recentCourses.length === 0 && <p className="group-page__state">아직 공유된 코스가 없어요.</p>}
            {group.recentCourses.map((shared) => <SharedRouteRow key={shared.sharedCourseId} title={shared.course.courseName} meta={`${shared.sharerNickname} · ${shared.course.metrics ? `${(shared.course.metrics.lengthM / 1000).toFixed(1)}km` : '거리 정보 없음'}`} onClick={() => onOpenSharedCourse?.(shared.sharedCourseId)} />)}
          </div>
          {actionError && <p className="group-room-page__error" role="alert">{actionError}</p>}
          <Button className="group-room-page__share" onClick={openShare}>코스 공유하기</Button>
        </> : <div className="group-room-page__manage">
          <div className="group-room-page__manage-heading"><div><h2>{group.myRole === 'OWNER' ? '그룹 관리' : '멤버 목록'}</h2><p>{group.memberCount}명이 함께하고 있어요.</p></div><button type="button" onClick={() => setIsManageOpen(false)}>닫기</button></div>
          {group.myRole === 'OWNER' && <div className="group-room-page__edit">
            <input aria-label="그룹 이름" value={name} maxLength={50} onChange={(event) => setName(event.target.value)} />
            <textarea aria-label="그룹 소개" value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} />
            <fieldset><legend>공개 범위</legend><div><button type="button" aria-pressed={visibility === 'PUBLIC'} onClick={() => setVisibility('PUBLIC')}>공개</button><button type="button" aria-pressed={visibility === 'PRIVATE'} onClick={() => { setVisibility('PRIVATE'); setJoinPolicy('INVITE_ONLY') }}>비공개</button></div></fieldset>
            {visibility === 'PUBLIC' && <fieldset><legend>참여 방식</legend><div><button type="button" aria-pressed={joinPolicy === 'OPEN'} onClick={() => setJoinPolicy('OPEN')}>누구나</button><button type="button" aria-pressed={joinPolicy === 'INVITE_ONLY'} onClick={() => setJoinPolicy('INVITE_ONLY')}>초대 코드</button></div></fieldset>}
            <button type="button" disabled={!name.trim()} onClick={() => setSaveConfirmOpen(true)}>그룹 정보 저장</button>
          </div>}
          {group.myRole === 'OWNER' && <div className="group-room-page__invite"><button type="button" onClick={issueInvite}>초대 코드 {invite ? '재발급' : '발급'}</button>{invite && <strong>{invite.inviteCode}</strong>}</div>}
          <ul className="group-room-page__members">{group.members.map((member) => <li key={member.userId}><img src={member.profileImageUrl || '/assets/g06/avatar-cream.svg'} alt="" /><span><strong>{member.nickname}</strong><small>{member.role === 'OWNER' ? '방장' : '멤버'}</small></span>{group.myRole === 'OWNER' && member.role === 'MEMBER' && <button type="button" onClick={() => setMemberToRemove({ userId: member.userId, nickname: member.nickname })}>내보내기</button>}</li>)}</ul>
          {actionError && <p className="group-room-page__error" role="alert">{actionError}</p>}
          <button className="group-room-page__close-group" type="button" onClick={() => setExitConfirmOpen(true)}>{group.myRole === 'OWNER' ? '그룹 삭제' : '그룹 탈퇴'}</button>
        </div>}
      </section>
      {isShareOpen && <CourseShareSheet courses={courses.map(shareOption)} onBack={() => setIsShareOpen(false)} onClose={() => setIsShareOpen(false)} onConfirm={share} />}
      {saveConfirmOpen && <GroupInfoSaveConfirmDialog busy={actionBusy} onClose={() => { if (!actionBusy) setSaveConfirmOpen(false) }} onConfirm={saveGroupInfo} />}
      {exitConfirmOpen && <GroupExitConfirmDialog owner={group.myRole === 'OWNER'} busy={actionBusy} onClose={() => { if (!actionBusy) setExitConfirmOpen(false) }} onConfirm={closeGroup} />}
      {memberToRemove && <RemoveGroupMemberDialog nickname={memberToRemove.nickname} busy={actionBusy} onClose={() => { if (!actionBusy) setMemberToRemove(undefined) }} onConfirm={removeMember} />}
    </main>
  )
}
