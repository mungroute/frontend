import type { CourseRouteGeoJson, CourseSource } from './courses'
import { apiRequest } from './http'
import type { CourseTemperatureGrade } from './courses'

export type CourseRecommendationThermalSegment = {
  segmentId: number
  lengthM: number
  estimatedSurfaceTempC: number
  temperatureGrade: CourseTemperatureGrade
}

export type CourseRecommendationCandidate = {
  candidateId: string
  candidateType: 'SAVED' | 'GENERATED'
  courseSource: CourseSource | null
  courseId: number | null
  name: string
  durationMinutes: number
  distanceM: number
  shadeRatio: number | null
  estimatedSurfaceTempC: number | null
  representative: boolean
  withinTargetTime: boolean
  shadeApplicable: boolean
  referenceHour: number
  route: CourseRouteGeoJson | null
  segmentIds: number[]
  thermalSegments?: CourseRecommendationThermalSegment[]
  recommendationReasons: string[]
}

export type CourseRecommendation = {
  requestId: string
  status: 'COMPLETED'
  targetDurationMin: number
  departureAt: string
  savedCandidates: CourseRecommendationCandidate[]
  generatedCandidates: CourseRecommendationCandidate[]
  createdAt: string
}

export type CreateCourseRecommendationInput = {
  start: { lat: number; lon: number }
  targetDurationMin: number
  departureAt: string
  candidateCount?: number
}

export const recommendationApi = {
  create(input: CreateCourseRecommendationInput) {
    return apiRequest<CourseRecommendation>('/api/course-recommendations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  get(requestId: string) {
    return apiRequest<CourseRecommendation>(`/api/course-recommendations/${encodeURIComponent(requestId)}`)
  },
}
