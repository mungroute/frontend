import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { SharedRouteRow } from '../Components/groups/GroupCards'
import { Button, ManagementPageHeader } from '../Components/ui'
import { CourseShareSheet } from '../Components/system'
import { courseShareOptions } from '../Components/courses/course-data'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type GroupRoomPageProps = {
  map?: BaseMapBinding
  onBack?: () => void
  onOpenSharedCourse?: (id: string) => void
  onOpenActivity?: () => void
  onShareCourse?: (id: string) => void
}

const sharedRoutes = [
  { id: 'namsan', title: '민지님이 공유한 남산 코스', meta: '2.1km · 31분 · 그늘 68%' },
  { id: 'park', title: '태훈님이 공유한 공원 코스', meta: '1.6km · 24분 · 평탄함' },
]

export function GroupRoomPage({ map, onBack, onOpenSharedCourse, onOpenActivity, onShareCourse }: GroupRoomPageProps) {
  const [isShareOpen, setIsShareOpen] = useState(false)
  return (
    <main className="journey-page profile-group-page group-room-page">
      <ManagementPageHeader title="남산 댕댕이 산책단" onBack={onBack} trailing={<button className="group-room-page__activity" type="button" aria-label="그룹 활동 보기" onClick={onOpenActivity}>활동</button>} />
      <BaseMapViewport
        className="group-room-page__map"
        ariaLabel="그룹 공유 코스 지도"
        map={map}
        fallback={{
          src: '/assets/g02/map.jpg',
          overlay: <><span className="group-room-page__map-note">실시간 위치가 아닌 공유 코스만 표시</span><img className="group-room-page__route group-room-page__route--shared" src="/assets/g02/route-shared.svg" alt="" /><img className="group-room-page__route group-room-page__route--alternative" src="/assets/g02/route-alternative.svg" alt="" /></>,
        }}
      />
      <section className="group-room-page__sheet">
        <h2>그룹 공유 코스</h2>
        <p>멤버의 실시간 위치는 표시하지 않아요.</p>
        <div className="group-room-page__routes">
          {sharedRoutes.map((route) => <SharedRouteRow key={route.id} title={route.title} meta={route.meta} onClick={() => onOpenSharedCourse?.(route.id)} />)}
        </div>
        <Button className="group-room-page__share" disabled={!onShareCourse} onClick={() => setIsShareOpen(true)}>코스 공유하기</Button>
      </section>
      {isShareOpen && <CourseShareSheet courses={courseShareOptions} onBack={() => setIsShareOpen(false)} onClose={() => setIsShareOpen(false)} onConfirm={(id) => { setIsShareOpen(false); onShareCourse?.(id) }} />}
    </main>
  )
}
