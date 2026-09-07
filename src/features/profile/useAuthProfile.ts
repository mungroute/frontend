import { useEffect, useState } from 'react'
import { authApi } from '../../api/auth'
import type { AuthUser } from '../../api/auth'
import { profileApi } from '../../api/profile'
import type { DogProfile, NotificationSettings } from '../../api/profile'
import { walkApi } from '../../api/walks'
import type { WalkStatistics } from '../../api/walks'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../../Components/profile/DogProfileCard'
import type { DogProfileSummary } from '../../Components/profile/DogProfileCard'
import type { DogProfileFormValue } from '../../pages/DogProfileFormPage'

export type AppDog = DogProfileSummary & DogProfileFormValue

const previewDogs: AppDog[] = [
  { id: 'mango', name: '망고', detail: '골든 리트리버 · 4살', breed: '골든 리트리버', birthDate: '2022-05-12', gender: 'MALE', neutered: true, introduction: '천천히 다가오면 금방 친해져요.', isDefault: true, profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE, temperamentTags: ['차분해요', '사람을 좋아해요'], leashGreeting: 'LIKES', strangerResponse: 'NEUTRAL', touchTolerance: 'COMFORTABLE', barkingLevel: 'RARE', bitingLevel: 'NONE' },
  { id: 'cookie', name: '쿠키', detail: '푸들 · 2살', breed: '푸들', birthDate: '2024-03-18', gender: 'FEMALE', neutered: false, introduction: '', isDefault: false, profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE, temperamentTags: ['활발해요'], leashGreeting: 'NEUTRAL', strangerResponse: 'NEUTRAL', touchTolerance: 'CONDITIONAL', barkingLevel: 'NORMAL', bitingLevel: 'NONE' },
]

const initialDogs: AppDog[] = import.meta.env.MODE === 'test' ? previewDogs : []

const defaultNotifications: NotificationSettings = {
  serviceEnabled: true,
  distanceEnabled: true,
  meetEnabled: true,
  groupEnabled: true,
}

export const dogAge = (birthDate: string) => (
  Math.max(0, new Date().getFullYear() - new Date(birthDate).getFullYear())
)

export const toAppDog = (dog: DogProfile): AppDog => ({
  id: String(dog.dogId),
  name: dog.name,
  breed: dog.breed,
  birthDate: dog.birthDate,
  isDefault: dog.isDefault,
  profileImageSrc: dog.profileImageUrl || DEFAULT_DOG_PROFILE_IMAGE,
  temperamentTags: dog.temperamentTags,
  gender: dog.gender,
  neutered: dog.neutered,
  introduction: dog.introduction ?? '',
  leashGreeting: dog.leashGreeting,
  strangerResponse: dog.strangerResponse,
  touchTolerance: dog.touchTolerance,
  barkingLevel: dog.barkingLevel,
  bitingLevel: dog.bitingLevel,
  detail: `${dog.breed} · ${dogAge(dog.birthDate)}살`,
})

export function useAuthProfile(pathname: string, restoredDogIds?: string[]) {
  const [dogs, setDogs] = useState<AppDog[]>(initialDogs)
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>(
    restoredDogIds?.length ? restoredDogIds : initialDogs[0] ? [initialDogs[0].id] : [],
  )
  const [notificationSettings, setNotificationSettings] = useState(defaultNotifications)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser>()
  const [profileWalkStatistics, setProfileWalkStatistics] = useState<WalkStatistics>()

  useEffect(() => {
    if (['/login', '/signup', '/password-reset'].includes(window.location.pathname)) return
    let active = true
    void authApi.restore()
      .then((response) => { if (active) setAuthenticatedUser(response.user) })
      .catch(() => { if (active) setAuthenticatedUser(undefined) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!authenticatedUser) return
    let active = true
    void Promise.all([profileApi.listDogs(), profileApi.getNotifications()])
      .then(([loadedDogs, loadedNotifications]) => {
        if (!active) return
        const mappedDogs = loadedDogs.map(toAppDog)
        setDogs(mappedDogs)
        setSelectedDogIds((current) => {
          const valid = current.filter((id) => mappedDogs.some((dog) => dog.id === id))
          if (valid.length > 0) return valid
          const first = mappedDogs.find((dog) => dog.isDefault) ?? mappedDogs[0]
          return first ? [first.id] : []
        })
        setNotificationSettings(loadedNotifications)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [authenticatedUser])

  useEffect(() => {
    if (pathname !== '/profile') return
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let active = true
    void walkApi.statistics(month)
      .then((statistics) => { if (active) setProfileWalkStatistics(statistics) })
      .catch(() => { if (active) setProfileWalkStatistics(undefined) })
    return () => { active = false }
  }, [pathname])

  return {
    authenticatedUser,
    setAuthenticatedUser,
    dogs,
    setDogs,
    selectedDogIds,
    setSelectedDogIds,
    notificationSettings,
    setNotificationSettings,
    profileWalkStatistics,
  }
}
