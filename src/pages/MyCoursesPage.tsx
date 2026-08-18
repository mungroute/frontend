import { useEffect, useMemo, useState } from 'react'
import { FilterChip, HomeBottomNavigation, ManagementPageHeader } from '../Components/ui'
import { courseCatalogApi } from '../api/courses'
import type { CourseCatalogApi, CourseSource, CourseSummary } from '../api/courses'
import '../styles/pages/journey-page.css'
import '../styles/pages/management-pages.css'

type CourseFilter = '전체' | '대표' | '그늘 많은'

type MyCoursesPageProps = {
  api?: CourseCatalogApi
  onBack?: () => void
  onOpenCourse?: (source: CourseSource, courseId: number) => void
  onOpenShadeTimeline?: () => void
  onOpenDrawCourse?: () => void
}

export function MyCoursesPage({
  api = courseCatalogApi,
  onBack,
  onOpenCourse,
  onOpenShadeTimeline,
  onOpenDrawCourse,
}: MyCoursesPageProps) {
  const [filter, setFilter] = useState<CourseFilter>('전체')
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    api.list({ requestedAt: new Date().toISOString() })
      .then((result) => {
        if (!active) return
        setCourses(result)
        setError(undefined)
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api])

  const filteredCourses = useMemo(() => courses.filter((course) => {
    if (filter === '대표') return course.representative
    if (filter === '그늘 많은') return course.metrics?.shadeApplicable
      && (course.metrics.shadeRatio ?? 0) >= 0.5
    return true
  }), [courses, filter])
  return (
    <main className="journey-page management-page my-courses-page">
      <ManagementPageHeader title="내 코스" subtitle="저장한 산책길을 다시 걸어보세요" onBack={onBack} />

      <div className="management-page__chips ui-chip-row" aria-label="코스 필터">
        {(['전체', '대표', '그늘 많은'] as CourseFilter[]).map((label) => (
          <FilterChip key={label} selected={filter === label} variant="soft" onClick={() => setFilter(label)}>{label}</FilterChip>
        ))}
      </div>

      <button className="my-courses-page__draw" type="button" aria-label="직접 코스 그리기" onClick={onOpenDrawCourse}>
        <span aria-hidden="true">＋</span>
        <strong>직접 코스 그리기</strong>
        <small>지도에서 나만의 산책길을 만들어 보세요</small>
        <b aria-hidden="true">›</b>
      </button>

      <section className="my-courses-page__course-list" aria-label="저장한 코스 목록">
        {loading && <p className="my-courses-page__state" role="status">코스를 불러오는 중이에요.</p>}
        {error && <p className="my-courses-page__state" role="alert">{error}</p>}
        {!loading && !error && filteredCourses.length === 0 && <p className="my-courses-page__state">조건에 맞는 코스가 없어요.</p>}
        {filteredCourses.map((course) => {
          const metrics = course.metrics
          return (
            <button
              key={`${course.courseSource}:${course.courseId}`}
              className="my-courses-page__course-card"
              type="button"
              onClick={() => onOpenCourse?.(course.courseSource, course.courseId)}
            >
              <span className="my-courses-page__course-title">
                <strong>{course.courseName}</strong>
                {course.representative && <em>대표</em>}
              </span>
              <span>{(course.lengthM / 1000).toFixed(2)}km · {course.durationMin}분 · {course.courseSource === 'custom' ? '직접 그린 길' : '산책 기록'}</span>
              <small>{metrics?.shadeApplicable ? `그늘 ${Math.round((metrics.shadeRatio ?? 0) * 100)}%` : '현재 그늘 비율 미표시'}</small>
              <b aria-hidden="true">›</b>
            </button>
          )
        })}
        {courses.length > 0 && (
          <button className="my-courses-page__shade" type="button" onClick={onOpenShadeTimeline}>
            추천 그늘 시간 확인하기
          </button>
        )}
      </section>

      <HomeBottomNavigation active="courses" />
    </main>
  )
}
