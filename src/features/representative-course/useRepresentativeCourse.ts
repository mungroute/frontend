import { useEffect, useState } from 'react'
import { courseCatalogApi } from '../../api/courses'
import type { CourseDetail, CourseDiagnostics } from '../../api/courses'

export function useRepresentativeCourse(pathname: string) {
  const [course, setCourse] = useState<CourseDetail>()
  const [diagnostics, setDiagnostics] = useState<CourseDiagnostics>()

  useEffect(() => {
    if (pathname !== '/home') return
    let active = true
    const requestedAt = new Date().toISOString()
    void courseCatalogApi.list({ page: 0, size: 100, requestedAt })
      .then(async (courses) => {
        const representative = courses.find((candidate) => candidate.representative)
        if (!representative) return { course: undefined, diagnostics: undefined }
        const [courseResult, diagnosticsResult] = await Promise.allSettled([
          courseCatalogApi.detail(representative.courseSource, representative.courseId, requestedAt),
          courseCatalogApi.diagnostics(representative.courseSource, representative.courseId, requestedAt),
        ])
        return {
          course: courseResult.status === 'fulfilled' ? courseResult.value : undefined,
          diagnostics: diagnosticsResult.status === 'fulfilled' ? diagnosticsResult.value : undefined,
        }
      })
      .then((result) => {
        if (!active) return
        setCourse(result.course)
        setDiagnostics(result.diagnostics)
      })
      .catch(() => {
        if (!active) return
        setCourse(undefined)
        setDiagnostics(undefined)
      })
    return () => { active = false }
  }, [pathname])

  return {
    representativeCourse: course,
    representativeCourseDiagnostics: diagnostics,
  }
}
