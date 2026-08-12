import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { Button, ManagementPageHeader, MetricGrid, Switch } from '../Components/ui'
import { CourseShareSheet } from '../Components/system'
import { courseShareOptions } from '../Components/courses/course-data'
import '../styles/pages/journey-page.css'
import '../styles/pages/management-pages.css'

type CourseDetailPageProps = {
  map?: BaseMapBinding
  onBack?: () => void
  onStart?: () => void
  onShare?: (courseId: string) => void
}

export function CourseDetailPage({ map, onBack, onStart, onShare }: CourseDetailPageProps) {
  const [representative, setRepresentative] = useState(true)
  const [isShareOpen, setIsShareOpen] = useState(false)

  return (
    <main className="journey-page management-page course-detail-page">
      <ManagementPageHeader title="코스 상세" onBack={onBack} />

      <BaseMapViewport
        className="course-detail-page__map"
        ariaLabel="저녁 남산길 상세 지도"
        map={map}
        fallback={{ src: '/assets/s09/map.jpg' }}
      />

      <div className="course-detail-page__metrics">
        <MetricGrid ariaLabel="코스 정보" items={[{ label: '거리', value: '2.1km' }, { label: '예상 시간', value: '31분' }, { label: '그늘', value: '68%' }]} />
      </div>

      <section className="course-detail-page__representative" aria-label="대표 코스 설정">
        <Switch checked={representative} onChange={setRepresentative} label="대표 코스로 설정" description="홈에서 바로 시작할 코스" ariaLabel="대표 코스로 설정" />
      </section>

      <Button className="course-detail-page__start" onClick={onStart}>이 코스로 산책 시작</Button>
      <Button className="course-detail-page__share" variant="ghost" onClick={() => setIsShareOpen(true)}>공유하기</Button>
      {isShareOpen && <CourseShareSheet courses={courseShareOptions} onBack={() => setIsShareOpen(false)} onClose={() => setIsShareOpen(false)} onConfirm={(courseId) => { setIsShareOpen(false); onShare?.(courseId) }} />}
    </main>
  )
}
