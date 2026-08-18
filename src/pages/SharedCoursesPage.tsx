import { useCallback, useEffect, useState } from 'react'
import { SharedCourseCard } from '../Components/groups/GroupCards'
import { courseRouteCoordinates } from '../Components/courses/course-map'
import { FilterChip, ManagementPageHeader } from '../Components/ui'
import { groupApi } from '../api/groups'
import type { GroupApi, GroupSharedCourse } from '../api/groups'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type SortKey = 'latest' | 'shortest' | 'shade'
const filters: { label: string; value: SortKey }[] = [
  { label: '최신순', value: 'latest' },
  { label: '짧은 코스', value: 'shortest' },
  { label: '그늘 많은', value: 'shade' },
]

const routeThumbnail = (shared: GroupSharedCourse) => {
  const coordinates = courseRouteCoordinates(shared.course.route)
  if (coordinates.length < 2) {
    const emptySvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 122"><rect width="120" height="122" rx="12" fill="#f4efe9"/><path d="M10 34h100M16 76h92M38 8v106M82 8v106" stroke="#e3dbd3" stroke-width="1"/><circle cx="60" cy="61" r="5" fill="#f47a3a"/></svg>'
    return `data:image/svg+xml,${encodeURIComponent(emptySvg)}`
  }
  const west = Math.min(...coordinates.map((point) => point.longitude))
  const east = Math.max(...coordinates.map((point) => point.longitude))
  const south = Math.min(...coordinates.map((point) => point.latitude))
  const north = Math.max(...coordinates.map((point) => point.latitude))
  const width = Math.max(east - west, 0.00001)
  const height = Math.max(north - south, 0.00001)
  const points = coordinates.map((point) => {
    const x = 12 + ((point.longitude - west) / width) * 96
    const y = 110 - ((point.latitude - south) / height) * 96
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 122"><rect width="120" height="122" rx="12" fill="#f4efe9"/><path d="M10 34h100M16 76h92M38 8v106M82 8v106" stroke="#e3dbd3" stroke-width="1"/><polyline points="${points}" fill="none" stroke="#f47a3a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function SharedCoursesPage({ groupId, api = groupApi, onBack, onOpenCourse }: {
  groupId: number
  api?: Pick<GroupApi, 'courses'>
  onBack?: () => void
  onOpenCourse?: (sharedCourseId: number) => void
}) {
  const [filter, setFilter] = useState<SortKey>('latest')
  const [courses, setCourses] = useState<GroupSharedCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    void api.courses(groupId, filter)
      .then(setCourses)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [api, filter, groupId])

  useEffect(() => {
    let active = true
    void api.courses(groupId, filter)
      .then((value) => { if (active) setCourses(value) })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [api, filter, groupId])

  return (
    <main className="journey-page profile-group-page shared-courses-page">
      <ManagementPageHeader title="공유 코스" onBack={onBack} />
      <div className="shared-courses-page__filters ui-chip-row" aria-label="공유 코스 필터">
        {filters.map(({ label, value }) => <FilterChip key={value} selected={filter === value} variant="soft" onClick={() => { setLoading(true); setError(undefined); setFilter(value) }}>{label}</FilterChip>)}
      </div>
      <div className="shared-courses-page__list">
        {loading && <p className="group-page__state" role="status">공유 코스를 불러오는 중이에요…</p>}
        {!loading && error && <div className="group-page__state" role="alert"><p>{error}</p><button type="button" onClick={load}>다시 시도</button></div>}
        {!loading && !error && courses.length === 0 && <p className="group-page__state">아직 공유된 코스가 없어요.</p>}
        {!loading && !error && courses.map((shared) => <SharedCourseCard
          key={shared.sharedCourseId}
          title={shared.course.courseName}
          author={shared.sharerNickname}
          distance={shared.course.metrics ? `${(shared.course.metrics.lengthM / 1000).toFixed(1)}km` : '거리 정보 없음'}
          saves={shared.saveCount}
          routeImageSrc={routeThumbnail(shared)}
          onClick={() => onOpenCourse?.(shared.sharedCourseId)}
        />)}
      </div>
    </main>
  )
}
