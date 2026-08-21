import { apiRequest } from './http'

export type DrawGeoPoint = {
  lat: number
  lon: number
}

export type SnapCoursePointResult = {
  snapStatus: 'DIRECT' | 'FALLBACK_APPLIED'
  originalPointRejected: boolean
  message: string | null
  original: DrawGeoPoint
  snapped: DrawGeoPoint
  snapDistanceM: number
  nodeId: number
  segmentId: number
}

export type CourseDrawMetrics = {
  lengthM: number
  durationMin: number
  shadeRatio: number | null
  estimatedSurfaceTempC: number
  referenceHour: number
  weatherSource: 'SCENARIO' | 'SCENARIO_REFERENCE' | 'NOWCAST' | 'CACHED'
  basisDate: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  calculatedAt: string
  solarState: 'DAYLIGHT' | 'NIGHT'
  solarElevationDeg: number
  shadeApplicable: boolean
}

export type ConnectCourseResult = {
  addedSegmentIds: number[]
  segmentIds: number[]
  coordinates: DrawGeoPoint[]
  cumulative: CourseDrawMetrics
  ignoredWaypointIndexes?: number[]
}

export type DrawWaypoint = {
  original: DrawGeoPoint
  snapped: DrawGeoPoint
  nodeId: number
  segmentId: number
  fallbackApplied: boolean
}

export type SaveCustomCourseInput = {
  courseName: string
  waypoints: DrawWaypoint[]
  loop: boolean
  representative: boolean
  requestedAt: string
}

export type CustomCourseResult = {
  courseId: number
  courseSource: 'custom'
  courseName: string
  loop: boolean
  representative: boolean
  metrics: CourseDrawMetrics
}

export type CourseSource = 'walk' | 'custom'

export type CourseRouteGeoJson = {
  type: 'LineString' | 'MultiLineString'
  coordinates: number[][] | number[][][]
}

export type CourseSummary = {
  courseSource: CourseSource
  courseId: number
  courseName: string
  lengthM: number
  durationMin: number
  loop: boolean
  representative: boolean
  createdAt: string
  metrics: CourseDrawMetrics | null
}

export type CourseDetail = {
  courseSource: CourseSource
  courseId: number
  courseName: string
  loop: boolean
  representative: boolean
  createdAt: string
  segmentIds: number[]
  route: CourseRouteGeoJson
  metrics: CourseDrawMetrics | null
}

export type SwappedCourseSection = {
  sectionIndex: number
  originalSegmentIds: number[]
  alternativeSegmentIds: number[]
  temperatureImprovementC: number
  addedLengthM: number
}

export type CourseComparison = {
  courseSource: CourseSource
  courseId: number
  courseName: string
  hasAlternative: boolean
  usual: CourseDrawMetrics
  alternative: CourseDrawMetrics | null
  usualRoute: CourseRouteGeoJson
  alternativeRoute: CourseRouteGeoJson | null
  temperatureImprovementC: number | null
  distanceDifferenceM: number | null
  swappedSections: SwappedCourseSection[]
  unavailableReason: string | null
}

export type CourseTemperatureGrade = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
export type CourseDiagnosticFactor = 'SHADE' | 'SURFACE' | 'SVF' | 'PARK_PROXIMITY' | 'OTHER'

export type CourseSegmentDiagnostic = {
  sequence: number
  legSequence: number
  segmentId: number
  lengthM: number
  route: CourseRouteGeoJson
  estimatedSurfaceTempC: number
  deviationFromCourseC: number
  temperatureGrade: CourseTemperatureGrade
  weightedTemperatureShare: number
  shadeRatio: number | null
  treeShadeRatio: number | null
  buildingShadeRatio: number | null
  surfaceType: string | null
  svf: number | null
  albedo: number | null
  parkProximityM: number | null
  dominantFactor: CourseDiagnosticFactor
  dominantImprovementC: number
  explanation: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  basisDate: string
}

export type CourseDiagnostics = {
  courseSource: CourseSource
  courseId: number
  courseName: string
  referenceHour: 9 | 12 | 15 | 18
  temperatureLayerBasis: 'SELECTED_REFERENCE' | 'H18_REFERENCE'
  solarState: 'DAYLIGHT' | 'NIGHT'
  shadeApplicable: boolean
  shadeMessage: string | null
  courseAverageSurfaceTempC: number
  hottestSurfaceTempC: number | null
  hottestSegmentId: number | null
  summary: string
  diagnosticMethod: 'EMPIRICAL_COUNTERFACTUAL'
  calculatedAt: string
  segments: CourseSegmentDiagnostic[]
}

export type CourseCatalogApi = {
  list(input?: { source?: CourseSource; page?: number; size?: number; requestedAt?: string }): Promise<CourseSummary[]>
  detail(source: CourseSource, courseId: number, requestedAt?: string): Promise<CourseDetail>
  setRepresentative(source: CourseSource, courseId: number, representative: boolean, requestedAt?: string): Promise<CourseDetail>
  delete(source: CourseSource, courseId: number): Promise<void>
  comparison(source: CourseSource, courseId: number, requestedAt?: string): Promise<CourseComparison>
  diagnostics(source: CourseSource, courseId: number, requestedAt?: string): Promise<CourseDiagnostics>
}

export type CourseDrawApi = {
  snap(point: DrawGeoPoint): Promise<SnapCoursePointResult>
  connect(input: {
    waypoints: DrawWaypoint[]
    requestedAt: string
  }): Promise<ConnectCourseResult>
  save(input: SaveCustomCourseInput): Promise<CustomCourseResult>
}

export const courseDrawApi: CourseDrawApi = {
  snap(point) {
    return apiRequest<SnapCoursePointResult>('/api/courses/draw/snap', {
      method: 'POST',
      body: JSON.stringify(point),
    })
  },
  connect(input) {
    return apiRequest<ConnectCourseResult>('/api/courses/draw/connect', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  save(input) {
    return apiRequest<CustomCourseResult>('/api/courses/draw', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}

const withRequestedAt = (path: string, requestedAt?: string) => {
  if (!requestedAt) return path
  const params = new URLSearchParams({ requestedAt })
  return `${path}?${params.toString()}`
}

export const courseCatalogApi: CourseCatalogApi = {
  list(input = {}) {
    const params = new URLSearchParams({
      page: String(input.page ?? 0),
      size: String(input.size ?? 100),
      requestedAt: input.requestedAt ?? new Date().toISOString(),
    })
    if (input.source) params.set('source', input.source)
    return apiRequest<CourseSummary[]>(`/api/courses?${params.toString()}`)
  },
  detail(source, courseId, requestedAt = new Date().toISOString()) {
    return apiRequest<CourseDetail>(withRequestedAt(`/api/courses/${source}/${courseId}`, requestedAt))
  },
  setRepresentative(source, courseId, representative, requestedAt = new Date().toISOString()) {
    return apiRequest<CourseDetail>(withRequestedAt(`/api/courses/${source}/${courseId}/representative`, requestedAt), {
      method: 'PATCH',
      body: JSON.stringify({ representative }),
    })
  },
  delete(source, courseId) {
    return apiRequest<void>(`/api/courses/${source}/${courseId}`, { method: 'DELETE' })
  },
  comparison(source, courseId, requestedAt = new Date().toISOString()) {
    return apiRequest<CourseComparison>(withRequestedAt(`/api/courses/${source}/${courseId}/comparison`, requestedAt))
  },
  diagnostics(source, courseId, requestedAt = new Date().toISOString()) {
    return apiRequest<CourseDiagnostics>(withRequestedAt(`/api/courses/${source}/${courseId}/diagnostics`, requestedAt))
  },
}
