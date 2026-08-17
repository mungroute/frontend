import { useMemo, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { DetailRow, ManagementPageHeader, MetricGrid, Switch } from '../Components/ui'
import { CourseShareSheet, DeleteRecordDialog, RecordInfoDialog, RecordMoreSheet, RenameCourseDialog } from '../Components/system'
import { courseShareOptions } from '../Components/courses/course-data'
import type { WalkRecordDetail } from '../api/walks'
import '../styles/pages/journey-page.css'
import '../styles/pages/management-pages.css'

type WalkRecordDetailPageProps = {
  map?: BaseMapBinding
  record?: WalkRecordDetail
  onBack?: () => void
  onMore?: () => void
  onDelete?: () => void
  onRepresentativeChange?: (representative: boolean) => void
  onOpenDistanceAlerts?: () => void
  onOpenDogs?: () => void
  onShareCourse?: (courseId: string) => void
}

export function WalkRecordDetailPage({ map, record, onBack, onMore, onDelete, onRepresentativeChange, onOpenDistanceAlerts, onOpenDogs, onShareCourse }: WalkRecordDetailPageProps) {
  const [representativeOverride, setRepresentativeOverride] = useState<boolean | undefined>(undefined)
  const [courseNameOverride, setCourseNameOverride] = useState<string | undefined>(undefined)
  const [overlay, setOverlay] = useState<'more' | 'rename' | 'delete' | 'share' | null>(null)
  const [info, setInfo] = useState<'alerts' | 'dogs' | null>(null)
  const openMore = () => { setOverlay('more'); onMore?.() }
  const routeOverlay = useMemo(() => ({ routes: record?.trackGeoJson?.coordinates?.length
    ? [{
      id: 'walk-record-route',
      coordinates: record.trackGeoJson.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      color: '#f47a3a',
      width: 6,
    }]
    : [] }), [record])

  const representative = representativeOverride ?? record?.representative ?? false
  const courseName = courseNameOverride ?? record?.courseName ?? '저녁 남산길'
  const duration = record ? `${Math.max(1, Math.round(record.durationSec / 60))}분` : '31분'
  const distance = record ? `${(record.distanceM / 1000).toFixed(1)}km` : '2.1km'

  return (
    <main className="journey-page management-page walk-record-detail-page">
      <ManagementPageHeader
        title="산책 기록 상세"
        onBack={onBack}
        trailing={<button className="walk-record-detail-page__more" type="button" aria-label="기록 더보기" onClick={openMore}>•••</button>}
      />
      <p className="walk-record-detail-page__date">8월 7일 목요일 · {courseName}</p>

      <BaseMapViewport
        className="walk-record-detail-page__map"
        ariaLabel="8월 7일 산책 경로 지도"
        map={map}
        sceneOverlay={routeOverlay}
        fallback={{ src: '/assets/s09/map.jpg' }}
      />

      <div className="walk-record-detail-page__metrics">
        <MetricGrid ariaLabel="산책 기록 정보" items={[{ label: '거리', value: distance }, { label: '시간', value: duration }, { label: 'GPS 지점', value: record ? `${record.usablePointCount}` : '3,246' }]} />
      </div>
      <section className="walk-record-detail-page__representative" aria-label="대표 코스 설정">
        <Switch checked={representative} onChange={(checked) => { setRepresentativeOverride(checked); onRepresentativeChange?.(checked) }} label="대표 코스로 설정" description="홈에서 바로 시작할 코스" ariaLabel="대표 코스로 설정" />
      </section>
      <div className="walk-record-detail-page__alerts"><DetailRow title="거리두기 알림" description="접근 방향 알림 1회" onClick={() => { setInfo('alerts'); onOpenDistanceAlerts?.() }} /></div>
      <div className="walk-record-detail-page__dogs"><DetailRow title="함께한 반려견" description="망고" onClick={() => { setInfo('dogs'); onOpenDogs?.() }} /></div>
      {overlay === 'more' && <RecordMoreSheet onClose={() => setOverlay(null)} onDelete={() => setOverlay('delete')} onRename={() => setOverlay('rename')} onShare={() => setOverlay('share')} />}
      {overlay === 'rename' && <RenameCourseDialog initialName={courseName} onClose={() => setOverlay('more')} onConfirm={(name) => { setCourseNameOverride(name); setOverlay(null) }} />}
      {overlay === 'delete' && <DeleteRecordDialog onClose={() => setOverlay(null)} onConfirm={() => { setOverlay(null); onDelete?.() }} />}
      {overlay === 'share' && <CourseShareSheet courses={courseShareOptions} onBack={() => setOverlay('more')} onClose={() => setOverlay(null)} onConfirm={(courseId) => { setOverlay(null); onShareCourse?.(courseId) }} />}
      {info === 'alerts' && <RecordInfoDialog title="거리두기 알림" description={<><p>산책 중 접근 방향 알림이 1회 기록됐어요.</p><strong>왼쪽 위 방향 · 약 50~100m</strong></>} onClose={() => setInfo(null)} />}
      {info === 'dogs' && <RecordInfoDialog title="함께한 반려견" description={<><p>망고와 함께한 산책 기록이에요.</p><strong>골든리트리버 · 4살</strong></>} onClose={() => setInfo(null)} />}
    </main>
  )
}
