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
  errorMessage?: string
  onBack?: () => void
  onMore?: () => void
  onDelete?: () => void
  onRename?: (name: string) => void | Promise<void>
  onRepresentativeChange?: (representative: boolean) => void
  onOpenDistanceAlerts?: () => void
  onOpenDogs?: () => void
  onShareCourse?: (courseId: string) => void
}

const formatDate = (iso: string) => new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul',
}).format(new Date(iso))

export function WalkRecordDetailPage({ map, record, errorMessage, onBack, onMore, onDelete, onRename, onRepresentativeChange, onOpenDistanceAlerts, onOpenDogs, onShareCourse }: WalkRecordDetailPageProps) {
  const [representativeOverride, setRepresentativeOverride] = useState<boolean>()
  const [courseNameOverride, setCourseNameOverride] = useState<string>()
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

  if (!record) {
    return (
      <main className="journey-page management-page walk-record-detail-page">
        <ManagementPageHeader title="산책 기록 상세" onBack={onBack} />
        <p className="walk-record-detail-page__loading" role={errorMessage ? 'alert' : undefined}>
          {errorMessage || '산책 기록을 불러오는 중이에요…'}
        </p>
      </main>
    )
  }

  const representative = representativeOverride ?? record.representative
  const courseName = courseNameOverride ?? record.courseName
  const duration = `${Math.max(1, Math.round(record.durationSec / 60))}분`
  const distance = `${(record.distanceM / 1000).toFixed(1)}km`
  const speed = `${record.averageSpeedKmh.toFixed(1)}km/h`
  const dateLabel = formatDate(record.endedAt)
  const dogNames = record.dogs.map((dog) => dog.name).join(', ') || '함께한 반려견 없음'
  const dogDescription = record.dogs.map((dog) => `${dog.name} · ${dog.breed}`).join('\n') || '등록된 반려견 정보가 없어요.'

  return (
    <main className="journey-page management-page walk-record-detail-page">
      <ManagementPageHeader
        title="산책 기록 상세"
        onBack={onBack}
        trailing={<button className="walk-record-detail-page__more" type="button" aria-label="기록 더보기" onClick={openMore}>•••</button>}
      />
      <p className="walk-record-detail-page__date">{dateLabel} · {courseName}</p>

      <BaseMapViewport
        className="walk-record-detail-page__map"
        ariaLabel={`${dateLabel} 산책 경로 지도`}
        map={map}
        sceneOverlay={routeOverlay}
        fallback={{ src: '/assets/s09/map.jpg' }}
      />

      <div className="walk-record-detail-page__metrics">
        <MetricGrid ariaLabel="산책 기록 정보" items={[{ label: '거리', value: distance }, { label: '시간', value: duration }, { label: '평균 속도', value: speed }]} />
      </div>
      <section className="walk-record-detail-page__representative" aria-label="대표 코스 설정">
        <Switch checked={representative} onChange={(checked) => { setRepresentativeOverride(checked); onRepresentativeChange?.(checked) }} label="대표 코스로 설정" description="홈에서 바로 시작할 코스" ariaLabel="대표 코스로 설정" />
      </section>
      <div className="walk-record-detail-page__alerts"><DetailRow title="거리두기 알림" description={`접근 방향 알림 ${record.distanceAlertCount}회`} onClick={() => { setInfo('alerts'); onOpenDistanceAlerts?.() }} /></div>
      <div className="walk-record-detail-page__dogs"><DetailRow title="함께한 반려견" description={dogNames} onClick={() => { setInfo('dogs'); onOpenDogs?.() }} /></div>
      {overlay === 'more' && <RecordMoreSheet onClose={() => setOverlay(null)} onDelete={() => setOverlay('delete')} onRename={() => setOverlay('rename')} onShare={() => setOverlay('share')} />}
      {overlay === 'rename' && <RenameCourseDialog initialName={courseName} onClose={() => setOverlay('more')} onConfirm={(name) => {
        void Promise.resolve(onRename?.(name)).then(() => {
          setCourseNameOverride(name)
          setOverlay(null)
        })
      }} />}
      {overlay === 'delete' && <DeleteRecordDialog onClose={() => setOverlay(null)} onConfirm={() => { setOverlay(null); onDelete?.() }} />}
      {overlay === 'share' && <CourseShareSheet courses={courseShareOptions} onBack={() => setOverlay('more')} onClose={() => setOverlay(null)} onConfirm={(courseId) => { setOverlay(null); onShareCourse?.(courseId) }} />}
      {info === 'alerts' && <RecordInfoDialog title="거리두기 알림" description={<><p>산책 중 접근 방향 알림이 기록됐어요.</p><strong>총 {record.distanceAlertCount}회</strong></>} onClose={() => setInfo(null)} />}
      {info === 'dogs' && <RecordInfoDialog title="함께한 반려견" description={<><p>이 산책에 함께 저장된 친구예요.</p><strong className="walk-record-detail-page__dog-description">{dogDescription}</strong></>} onClose={() => setInfo(null)} />}
    </main>
  )
}
