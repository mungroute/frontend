import { useCallback, useEffect, useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { courseRouteCoordinates } from '../Components/courses/course-map'
import { CancelCourseShareDialog } from '../Components/system'
import { Button, ManagementPageHeader, MetricGrid } from '../Components/ui'
import { groupApi } from '../api/groups'
import type { GroupApi, GroupDetail, GroupSharedCourse } from '../api/groups'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

export function GroupCourseDetailPage({ groupId, sharedCourseId, currentUserId, map, api = groupApi, onBack, onSaved, onUnshared }: {
  groupId: number
  sharedCourseId: number
  currentUserId?: number
  map?: BaseMapBinding
  api?: Pick<GroupApi, 'sharedCourse' | 'detail' | 'saveSharedCourse' | 'unshareCourse'>
  onBack?: () => void
  onSaved?: (courseId: number) => void
  onUnshared?: () => void
}) {
  const [shared, setShared] = useState<GroupSharedCourse>()
  const [group, setGroup] = useState<GroupDetail>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [actionMessage, setActionMessage] = useState<string>()
  const [unshareConfirmOpen, setUnshareConfirmOpen] = useState(false)
  const [unsharing, setUnsharing] = useState(false)
  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    void Promise.all([api.sharedCourse(groupId, sharedCourseId), api.detail(groupId)])
      .then(([course, detail]) => { setShared(course); setGroup(detail) })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [api, groupId, sharedCourseId])

  useEffect(() => {
    let active = true
    void Promise.all([api.sharedCourse(groupId, sharedCourseId), api.detail(groupId)])
      .then(([course, detail]) => {
        if (!active) return
        setShared(course)
        setGroup(detail)
      })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, groupId, sharedCourseId])

  const scene = useMemo(() => {
    const coordinates = courseRouteCoordinates(shared?.course.route)
    return {
      viewFit: coordinates.length > 1 ? {
        coordinates,
        padding: [36, 24, 36, 24] as [number, number, number, number],
        maxZoom: 17,
      } : undefined,
      markers: coordinates.length > 1 ? [
        { id: 'group-course-start', position: coordinates[0], kind: 'start' as const, label: '출발' },
        { id: 'group-course-finish', position: coordinates.at(-1)!, kind: 'finish' as const, label: '도착' },
      ] : [],
      routes: coordinates.length > 1 ? [{ id: 'group-course-route', coordinates, color: '#f47a3a', width: 7, outlineColor: '#fffdf8', outlineWidth: 10, lineCap: 'round' as const }] : [],
    }
  }, [shared])

  if (loading || !shared || !group) return <main className="journey-page profile-group-page group-course-detail-page"><ManagementPageHeader title="공유 코스" onBack={onBack} /><div className="group-page__state" role={error ? 'alert' : 'status'}><p>{error || '공유 코스를 불러오는 중이에요…'}</p>{error && <button type="button" onClick={load}>다시 시도</button>}</div></main>

  const metrics = shared.course.metrics
  const canUnshare = group.myRole === 'OWNER' || shared.sharedByUserId === currentUserId

  return (
    <main className="journey-page profile-group-page group-course-detail-page">
      <ManagementPageHeader title={shared.course.courseName} subtitle={`${shared.sharerNickname}님이 공유한 코스`} onBack={onBack} />
      <BaseMapViewport className="group-course-detail-page__map" ariaLabel="그룹 공유 코스 경로 지도" map={map} sceneOverlay={scene} replaceBaseMarkers fallback={{ src: '/assets/g02/map.jpg' }} />
      <section className="group-course-detail-page__sheet">
        <MetricGrid ariaLabel="공유 코스 정보" items={[
          { label: '거리', value: metrics ? `${(metrics.lengthM / 1000).toFixed(1)}km` : '-' },
          { label: '예상 시간', value: metrics ? `${metrics.durationMin}분` : '-' },
          { label: '그늘', value: metrics?.shadeRatio == null ? '야간·미산출' : `${Math.round(metrics.shadeRatio * 100)}%` },
        ]} />
        <p>{shared.saveCount}명이 이 코스를 저장했어요.</p>
        {actionMessage && <p className="group-course-detail-page__message" role="status">{actionMessage}</p>}
        <Button onClick={() => {
          setActionMessage(undefined)
          void api.saveSharedCourse(groupId, sharedCourseId)
            .then((saved) => { setActionMessage('내 코스로 저장했어요.'); onSaved?.(saved.courseId) })
            .catch((reason: Error) => setActionMessage(reason.message))
        }}>내 코스로 저장</Button>
        {canUnshare && <button className="group-course-detail-page__unshare" type="button" onClick={() => setUnshareConfirmOpen(true)}>그룹 공유 취소</button>}
      </section>
      {unshareConfirmOpen && <CancelCourseShareDialog
        busy={unsharing}
        onClose={() => { if (!unsharing) setUnshareConfirmOpen(false) }}
        onConfirm={() => {
          setUnsharing(true)
          setActionMessage(undefined)
          void api.unshareCourse(groupId, sharedCourseId)
            .then(() => {
              setUnshareConfirmOpen(false)
              onUnshared?.()
            })
            .catch((reason: Error) => {
              setUnshareConfirmOpen(false)
              setActionMessage(reason.message)
            })
            .finally(() => setUnsharing(false))
        }}
      />}
    </main>
  )
}
