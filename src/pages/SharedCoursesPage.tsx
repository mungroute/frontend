import { useState } from 'react'
import { SharedCourseCard } from '../Components/groups/GroupCards'
import { FilterChip, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

const courses = [
  { title: '저녁 남산길', author: '민지', distance: '2.1km', duration: 31, shade: 68, saves: 12, routeImageSrc: '/assets/g03/route-orange.svg' },
  { title: '한강 노을 산책', author: '서준', distance: '3.0km', duration: 42, shade: 44, saves: 8, routeImageSrc: '/assets/g03/route-green.svg' },
  { title: '조용한 공원길', author: '태훈', distance: '1.4km', duration: 18, shade: 72, saves: 5, routeImageSrc: '/assets/g03/route-orange.svg' },
]

export function SharedCoursesPage({ onBack, onOpenCourse }: { onBack?: () => void; onOpenCourse?: (title: string) => void }) {
  const [filter, setFilter] = useState('최신순')
  const visibleCourses = filter === '짧은 코스'
    ? courses.filter((course) => course.duration <= 25)
    : filter === '그늘 많은'
      ? courses.filter((course) => course.shade >= 60)
      : courses
  return (
    <main className="journey-page profile-group-page shared-courses-page">
      <ManagementPageHeader title="공유 코스" onBack={onBack} />
      <div className="shared-courses-page__filters ui-chip-row" aria-label="공유 코스 필터">
        {['최신순', '짧은 코스', '그늘 많은'].map((label) => <FilterChip key={label} selected={filter === label} variant="soft" onClick={() => setFilter(label)}>{label}</FilterChip>)}
      </div>
      <div className="shared-courses-page__list">
        {visibleCourses.map((course) => <SharedCourseCard key={course.title} {...course} onClick={onOpenCourse ? () => onOpenCourse(course.title) : undefined} />)}
      </div>
    </main>
  )
}
