export type CoursePoint = { x: number; y: number }

export const recommendedShadeHour = 18

export const drawnCourseSummary = {
  distanceKm: 2.4,
  durationMinutes: 36,
}

export type CourseCandidateSource = 'saved' | 'generated'
import type { MapCoordinate } from '../map'
import type { CourseRecommendationCandidate } from '../../api/recommendations'
import type { CourseRecommendationThermalSegment } from '../../api/recommendations'
import type { CourseRouteGeoJson, CourseSource } from '../../api/courses'
import { courseRouteCoordinates } from './course-map'

export type CourseCandidate = {
  id: string
  source: CourseCandidateSource
  name: string
  durationMinutes: number
  distanceKm: number
  shadeRatio: number | null
  estimatedSurfaceTempC: number | null
  shadeApplicable: boolean
  isRepresentative: boolean
  withinTargetTime: boolean
  routeCoordinates: MapCoordinate[]
  route?: CourseRouteGeoJson
  thermalSegments?: CourseRecommendationThermalSegment[]
  courseSource?: CourseSource
  courseId?: number
  recommendationReasons?: string[]
}

type CourseCandidateSeed = Omit<CourseCandidate, 'withinTargetTime'>

const savedCourseSeeds: CourseCandidateSeed[] = [
  { id: 'saved-namsan-evening', source: 'saved', name: '저녁 남산길', durationMinutes: 29, distanceKm: 1.8, shadeRatio: 68, estimatedSurfaceTempC: 34, shadeApplicable: true, isRepresentative: true, routeCoordinates: [] },
  { id: 'saved-hangang-sunset', source: 'saved', name: '한강 노을 산책', durationMinutes: 42, distanceKm: 2.7, shadeRatio: 54, estimatedSurfaceTempC: 37, shadeApplicable: true, isRepresentative: false, routeCoordinates: [] },
]

const generatedCourseSeeds: CourseCandidateSeed[] = [
  { id: 'generated-namsan-loop-a', source: 'generated', name: '남산 둘레길 A', durationMinutes: 30, distanceKm: 1.9, shadeRatio: 72, estimatedSurfaceTempC: 33, shadeApplicable: true, isRepresentative: false, routeCoordinates: [] },
  { id: 'generated-jangchung-park-b', source: 'generated', name: '장충단 공원길 B', durationMinutes: 31, distanceKm: 2, shadeRatio: 61, estimatedSurfaceTempC: 36, shadeApplicable: true, isRepresentative: false, routeCoordinates: [] },
]

const withTargetTime = (candidate: CourseCandidateSeed, targetMinutes: number): CourseCandidate => ({
  ...candidate,
  withinTargetTime: Math.abs(candidate.durationMinutes - targetMinutes) <= targetMinutes * 0.15,
})

/** P1 mock adapter. Replace this function body with the future candidate API response mapper. */
export function getCourseCandidates(targetMinutes: number, options: { includeSaved?: boolean } = {}): CourseCandidate[] {
  const saved = options.includeSaved === false ? [] : savedCourseSeeds
  return [...saved, ...generatedCourseSeeds].map((candidate) => {
    const routeCoordinates = getCourseRouteCoordinates(candidate.id)
    return {
      ...withTargetTime(candidate, targetMinutes),
      routeCoordinates,
      route: routeCoordinates.length >= 2
        ? { type: 'LineString', coordinates: routeCoordinates.map(({ longitude, latitude }) => [longitude, latitude]) }
        : undefined,
    }
  })
}

export function mapRecommendationCandidate(candidate: CourseRecommendationCandidate): CourseCandidate {
  return {
    id: candidate.candidateId,
    source: candidate.candidateType === 'SAVED' ? 'saved' : 'generated',
    name: candidate.name,
    durationMinutes: candidate.durationMinutes,
    distanceKm: candidate.distanceM / 1_000,
    shadeRatio: candidate.shadeRatio === null ? null : Math.round(candidate.shadeRatio * 100),
    estimatedSurfaceTempC: candidate.estimatedSurfaceTempC === null ? null : Math.round(candidate.estimatedSurfaceTempC),
    shadeApplicable: candidate.shadeApplicable,
    isRepresentative: candidate.representative,
    withinTargetTime: candidate.withinTargetTime,
    routeCoordinates: courseRouteCoordinates(candidate.route),
    route: candidate.route ?? undefined,
    thermalSegments: candidate.thermalSegments ?? [],
    courseSource: candidate.courseSource ?? undefined,
    courseId: candidate.courseId ?? undefined,
    recommendationReasons: candidate.recommendationReasons,
  }
}

const namsanRoute: MapCoordinate[] = [
  { latitude: 37.5607, longitude: 126.9964 },
  { latitude: 37.5598, longitude: 126.9949 },
  { latitude: 37.5583, longitude: 126.9942 },
  { latitude: 37.5569, longitude: 126.9954 },
  { latitude: 37.5572, longitude: 126.9976 },
  { latitude: 37.5588, longitude: 126.9988 },
  { latitude: 37.5604, longitude: 126.9981 },
  { latitude: 37.5607, longitude: 126.9964 },
]

const jangchungRoute: MapCoordinate[] = [
  { latitude: 37.5607, longitude: 126.9964 },
  { latitude: 37.5618, longitude: 126.998 },
  { latitude: 37.5631, longitude: 127.0001 },
  { latitude: 37.5619, longitude: 127.0015 },
  { latitude: 37.5601, longitude: 127.0005 },
  { latitude: 37.5591, longitude: 126.9983 },
  { latitude: 37.5607, longitude: 126.9964 },
]

const courseRouteMocks: Record<string, MapCoordinate[]> = {
  'saved-namsan-evening': namsanRoute,
  'saved-hangang-sunset': namsanRoute,
  'generated-namsan-loop-a': namsanRoute,
  'generated-jangchung-park-b': jangchungRoute,
  'comparison-alternative': jangchungRoute,
}

/** P1 route geometry mock. Replace with the selected course detail API geometry. */
export function getCourseRouteCoordinates(courseId?: string | null): MapCoordinate[] {
  return courseId ? courseRouteMocks[courseId] ?? [] : []
}

export type CourseShareOption = { id: string; title: string; meta: string }

export const courseShareOptions: CourseShareOption[] = [
  { id: 'namsan', title: '저녁 남산길', meta: '29분 · 1.8km · 그늘 68%' },
  { id: 'hangang', title: '한강 노을 산책', meta: '29분 · 1.8km · 그늘 68%' },
  { id: 'park', title: '조용한 공원길', meta: '29분 · 1.8km · 그늘 68%' },
]
