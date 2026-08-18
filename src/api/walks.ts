import { apiRequest } from './http'

export type WalkMatchStatus = 'NOT_PERFORMED' | 'INSUFFICIENT_POINTS' | 'MATCHED' | 'PARTIAL' | 'FAILED'
export type WalkPresenceMode = 'off' | 'distance' | 'meet'
export type LockedWalkPresenceMode = Exclude<WalkPresenceMode, 'off'>
export type PresenceDistanceBand = 'VERY_CLOSE' | 'BAND_30_50' | 'BAND_50_100' | 'BAND_100_500'
export type PresenceTrend = 'NEW' | 'APPROACHING' | 'STEADY' | 'LEAVING'

export type NearbyPresence = {
  distanceBand: PresenceDistanceBand
  directionOctant: number | null
  directionSpread: number | null
  directionReference: 'HEADING' | 'MAP' | null
  trend: PresenceTrend
}

export type PresenceUpdateResult = {
  sessionId: number
  updatedAt: string
  nextUpdateAfterSeconds: number
  nearby: NearbyPresence[]
}

export type PresenceUpdatePayload = {
  sessionId: number
  measuredAt: string
  lon: number
  lat: number
  accuracy: number
  heading: number | null
  stationary: boolean
  radiusM: number
}

export type WalkModeResult = {
  sessionId: number
  mode: WalkPresenceMode
  lockedMode?: LockedWalkPresenceMode | null
  startedAt?: string
  changedAt?: string
}

export type GeoJsonLineString = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type WalkEndResult = {
  sessionId: number
  endedAt: string
  distanceM: number
  durationSec: number
  pointCount: number
  usablePointCount: number
  matchStatus: WalkMatchStatus
  matchFailureReason: string | null
  matchedSegmentIds: number[]
  isLoop: boolean | null
  trackGeoJson: GeoJsonLineString | null
}

export type WalkRecordSummary = {
  sessionId: number
  courseName: string
  startedAt: string
  endedAt: string
  distanceM: number
  durationSec: number
  representative: boolean
  loop: boolean | null
  matchStatus: WalkMatchStatus
}

export type WalkRecordDetail = WalkRecordSummary & {
  matchFailureReason: string | null
  matchedSegmentIds: number[]
  pointCount: number
  usablePointCount: number
  trackGeoJson: GeoJsonLineString | null
}

export const walkApi = {
  start(mode: WalkPresenceMode = 'off', dogIds: number[] = []) {
    return apiRequest<WalkModeResult & { startedAt: string }>('/api/walks/start', {
      method: 'POST',
      body: JSON.stringify({ mode, dogIds }),
    })
  },
  changeMode(sessionId: number, mode: WalkPresenceMode) {
    return apiRequest<WalkModeResult>(`/api/walks/${sessionId}/mode`, {
      method: 'PATCH',
      body: JSON.stringify({ mode }),
    })
  },
  consentPresence(sessionId: number) {
    return apiRequest<{ sessionId: number; mode: LockedWalkPresenceMode; consentedAt: string }>('/api/presence/consent', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    })
  },
  updatePresence(payload: PresenceUpdatePayload) {
    return apiRequest<PresenceUpdateResult>('/api/presence', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  addPoint(sessionId: number, point: { recordedAt: string; lon: number; lat: number; accuracy: number }) {
    return apiRequest<void>(`/api/walks/${sessionId}/points`, {
      method: 'POST',
      body: JSON.stringify(point),
    })
  },
  pause(sessionId: number) {
    return apiRequest<void>(`/api/walks/${sessionId}/pause`, { method: 'POST' })
  },
  resume(sessionId: number) {
    return apiRequest<void>(`/api/walks/${sessionId}/resume`, { method: 'POST' })
  },
  end(sessionId: number) {
    return apiRequest<WalkEndResult>(`/api/walks/${sessionId}/end`, { method: 'POST' })
  },
  save(sessionId: number, courseName: string, representative: boolean) {
    return apiRequest<WalkRecordDetail>(`/api/walks/${sessionId}/save`, {
      method: 'POST',
      body: JSON.stringify({ courseName, representative }),
    })
  },
  setRepresentative(sessionId: number, representative: boolean) {
    return apiRequest<WalkRecordDetail>(`/api/walks/${sessionId}/representative`, {
      method: 'PATCH',
      body: JSON.stringify({ representative }),
    })
  },
  list(page = 0, size = 20) {
    return apiRequest<WalkRecordSummary[]>(`/api/walks?page=${page}&size=${size}`)
  },
  detail(sessionId: number) {
    return apiRequest<WalkRecordDetail>(`/api/walks/${sessionId}`)
  },
  delete(sessionId: number) {
    return apiRequest<void>(`/api/walks/${sessionId}`, { method: 'DELETE' })
  },
}
