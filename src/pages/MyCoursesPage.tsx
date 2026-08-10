import { useState } from 'react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { FilterChip, HomeBottomNavigation, ManagementPageHeader, RouteSummaryCard } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/management-pages.css'

type MyCoursesPageProps = {
  map?: BaseMapBinding
  onBack?: () => void
  onOpenCourse?: () => void
  onOpenShadeTimeline?: () => void
  onOpenDrawCourse?: () => void
}

export function MyCoursesPage({ map, onBack, onOpenCourse, onOpenShadeTimeline, onOpenDrawCourse }: MyCoursesPageProps) {
  const [filter, setFilter] = useState('전체')

  return (
    <main className="journey-page management-page my-courses-page">
      <ManagementPageHeader title="내 코스" subtitle="최근 산책과 다시 걷고 싶은 길" onBack={onBack} />

      <div className="management-page__chips ui-chip-row" aria-label="코스 필터">
        {['전체', '대표', '그늘 많은'].map((label) => (
          <FilterChip key={label} selected={filter === label} variant="soft" onClick={() => setFilter(label)}>{label}</FilterChip>
        ))}
      </div>

      <BaseMapViewport
        className="my-courses-page__map"
        ariaLabel="저녁 남산길 지도"
        map={map}
        fallback={{
          src: '/assets/s09/map.jpg',
          overlay: <img className="my-courses-page__route" src="/assets/c01/route.svg" alt="" />,
        }}
      />
      <button className="my-courses-page__draw" type="button" aria-label="직접 코스 그리기" onClick={onOpenDrawCourse}>＋</button>

      <div className="my-courses-page__route-card"><RouteSummaryCard onClick={onOpenCourse} /></div>

      <button className="my-courses-page__shade" type="button" aria-labelledby="shade-window-title" onClick={onOpenShadeTimeline}>
        <div className="my-courses-page__shade-heading">
          <h2 id="shade-window-title">추천 그늘 시간</h2>
          <p>이 시간에 걸으면 코스의 그늘을 가장 많이 이용할 수 있어요.</p>
        </div>
        <div className="my-courses-page__shade-track" aria-hidden="true"><span /></div>
        <div className="my-courses-page__shade-times"><span>16:30</span><span>18:10</span></div>
      </button>

      <HomeBottomNavigation active="courses" />
    </main>
  )
}
