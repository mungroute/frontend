import { apiRequest } from './http'
import type { AuthUser } from './auth'
import type { BarkingLevel, BitingLevel, DogGender, LeashGreeting, StrangerResponse, TouchTolerance } from '../features/dogs/personality-options'

export type DogProfile = {
  dogId: number
  name: string
  breed: string
  birthDate: string
  profileImageUrl: string | null
  temperamentTags: string[]
  gender: DogGender
  neutered: boolean | null
  introduction: string | null
  leashGreeting: LeashGreeting
  strangerResponse: StrangerResponse
  touchTolerance: TouchTolerance
  barkingLevel: BarkingLevel
  bitingLevel: BitingLevel
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type DogProfileInput = Pick<DogProfile, 'name' | 'breed' | 'birthDate' | 'temperamentTags' | 'gender' | 'neutered' | 'introduction' | 'leashGreeting' | 'strangerResponse' | 'touchTolerance' | 'barkingLevel' | 'bitingLevel' | 'isDefault'> & {
  profileImageUrl: string | null
}

export type NotificationSettings = {
  serviceEnabled: boolean
  distanceEnabled: boolean
  meetEnabled: boolean
  groupEnabled: boolean
}

export const profileApi = {
  me() {
    return apiRequest<AuthUser>('/api/users/me')
  },
  updateMe(input: { nickname?: string; profileImageUrl?: string | null }) {
    return apiRequest<AuthUser>('/api/users/me', { method: 'PATCH', body: JSON.stringify(input) })
  },
  async checkNickname(nickname: string) {
    const response = await apiRequest<{ available: boolean }>(
      `/api/users/me/check-nickname?nickname=${encodeURIComponent(nickname)}`,
    )
    return response.available
  },
  deactivate() {
    return apiRequest<void>('/api/users/me', { method: 'DELETE' })
  },
  listDogs() {
    return apiRequest<DogProfile[]>('/api/users/me/dogs')
  },
  createDog(input: DogProfileInput) {
    return apiRequest<DogProfile>('/api/users/me/dogs', { method: 'POST', body: JSON.stringify(input) })
  },
  updateDog(dogId: number, input: DogProfileInput) {
    return apiRequest<DogProfile>(`/api/users/me/dogs/${dogId}`, { method: 'PUT', body: JSON.stringify(input) })
  },
  deleteDog(dogId: number) {
    return apiRequest<void>(`/api/users/me/dogs/${dogId}`, { method: 'DELETE' })
  },
  getNotifications() {
    return apiRequest<NotificationSettings>('/api/users/me/notifications')
  },
  updateNotifications(input: NotificationSettings) {
    return apiRequest<NotificationSettings>('/api/users/me/notifications', { method: 'PATCH', body: JSON.stringify(input) })
  },
}
