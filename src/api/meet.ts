import { apiRequest } from './http'
import type { PresenceUpdatePayload } from './walks'
import type { BarkingLevel, BitingLevel, LeashGreeting, StrangerResponse, TouchTolerance } from '../features/dogs/personality-options'

export type MeetProfilePreview = {
  profileImageUrl: string | null
  leashGreeting: LeashGreeting
  strangerResponse: StrangerResponse
  touchTolerance: TouchTolerance
  barkingLevel: BarkingLevel
  bitingLevel: BitingLevel
}

export type MeetProfile = MeetProfilePreview & {
  dogName: string
  breed: string
  ageYears: number | null
  temperamentTags: string[]
}

export type MeetCandidate = {
  candidateRef: string
  distanceBand: 'VERY_CLOSE' | 'BAND_30_50' | 'BAND_50_100' | 'BAND_100_500'
  expiresAt: string
  preview: MeetProfilePreview
}

export type MeetConnection = {
  requestId: string
  lon: number
  lat: number
  updatedAt: string
  profile: MeetProfile
}

export type MeetPresenceResult = {
  sessionId: number
  updatedAt: string
  nextUpdateAfterSeconds: number
  candidates: MeetCandidate[]
  connection: MeetConnection | null
}

export type MeetRequest = {
  requestId: string
  direction: 'INCOMING' | 'OUTGOING'
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'ENDED'
  createdAt: string
  expiresAt: string
  preview: MeetProfilePreview | null
  profile: MeetProfile | null
}

export type MeetEvent = { type: string; request: MeetRequest }

export const meetApi = {
  saveProfile(profile: Omit<MeetProfile, 'ageYears' | 'profileImageUrl'> & { ageYears?: number | null; profileImageUrl?: string | null }) {
    return apiRequest<MeetProfile>('/api/meet/profile', { method: 'PUT', body: JSON.stringify(profile) })
  },
  updatePresence(payload: PresenceUpdatePayload) {
    return apiRequest<MeetPresenceResult>('/api/meet/presence', { method: 'PUT', body: JSON.stringify(payload) })
  },
  createRequest(sessionId: number, candidateRef: string) {
    return apiRequest<MeetRequest>('/api/meet/requests', { method: 'POST', body: JSON.stringify({ sessionId, candidateRef }) })
  },
  listRequests(sessionId: number) {
    return apiRequest<MeetRequest[]>(`/api/meet/requests?sessionId=${sessionId}`)
  },
  accept(requestId: string) { return apiRequest<MeetRequest>(`/api/meet/requests/${requestId}/accept`, { method: 'POST' }) },
  reject(requestId: string) { return apiRequest<MeetRequest>(`/api/meet/requests/${requestId}/reject`, { method: 'POST' }) },
  cancel(requestId: string) { return apiRequest<MeetRequest>(`/api/meet/requests/${requestId}/cancel`, { method: 'POST' }) },
  end(requestId: string) { return apiRequest<MeetRequest>(`/api/meet/requests/${requestId}/end`, { method: 'POST' }) },
  block(requestId: string) { return apiRequest<void>(`/api/meet/requests/${requestId}/block`, { method: 'POST' }) },
}
