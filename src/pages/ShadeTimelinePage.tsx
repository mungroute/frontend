import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { ShadeTimelineChart } from '../Components/courses/CourseVisuals'
import { recommendedShadeHour } from '../Components/courses/course-data'
import { Button, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

type ShadeTimelinePageProps = {
  map?: BaseMapBinding
  onBack?: () => void
  onWalkAtRecommended?: () => void
}

export function ShadeTimelinePage({ map, onBack, onWalkAtRecommended }: ShadeTimelinePageProps) {
  return (
    <main className="journey-page extended-management-page shade-timeline-page">
      <ManagementPageHeader title="그늘 시간대" subtitle="코스 구간별 그늘 변화를 확인해요" onBack={onBack} />
      <BaseMapViewport className="shade-timeline-page__map" ariaLabel="코스 구간별 그늘 지도" map={map} fallback={{ src: '/assets/s09/map.jpg' }} />
      <div className="shade-timeline-page__chart"><ShadeTimelineChart /></div>
      <Button className="shade-timeline-page__walk" onClick={onWalkAtRecommended}>{recommendedShadeHour}시에 이 코스 걷기</Button>
    </main>
  )
}
