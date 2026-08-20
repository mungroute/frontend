import { useCallback, useEffect, useRef, useState } from 'react'
import { SplashPage } from '../pages/SplashPage'
import { LocationPermissionPage } from '../pages/LocationPermissionPage'
import { RepresentativeHomePage } from '../pages/RepresentativeHomePage'
import { NoCourseHomePage } from '../pages/NoCourseHomePage'
import { RouteCandidatesPage } from '../pages/RouteCandidatesPage'
import { RouteGeneratingPage } from '../pages/RouteGeneratingPage'
import { WalkDurationPage } from '../pages/WalkDurationPage'
import { RouteComparisonPage } from '../pages/RouteComparisonPage'
import { DogSelectionPage } from '../pages/DogSelectionPage'
import { ActiveWalkPage } from '../pages/ActiveWalkPage'
import { WalkCompletePage } from '../pages/WalkCompletePage'
import { MyCoursesPage } from '../pages/MyCoursesPage'
import { CourseDetailPage } from '../pages/CourseDetailPage'
import { WalkRecordsPage } from '../pages/WalkRecordsPage'
import { WalkRecordDetailPage } from '../pages/WalkRecordDetailPage'
import { MyPage } from '../pages/MyPage'
import { DogManagementPage } from '../pages/DogManagementPage'
import { GroupListPage } from '../pages/GroupListPage'
import { GroupRoomPage } from '../pages/GroupRoomPage'
import { SharedCoursesPage } from '../pages/SharedCoursesPage'
import { CreateGroupPage } from '../pages/CreateGroupPage'
import { JoinGroupPage } from '../pages/JoinGroupPage'
import { NotificationSettingsPage } from '../pages/NotificationSettingsPage'
import { AccountProfilePage } from '../pages/AccountProfilePage'
import { ShadeTimelinePage } from '../pages/ShadeTimelinePage'
import { DrawCoursePage } from '../pages/DrawCoursePage'
import { DogProfileFormPage } from '../pages/DogProfileFormPage'
import { DogOnboardingPage } from '../pages/DogOnboardingPage'
import type { DogProfileFormValue } from '../pages/DogProfileFormPage'
import type { DogProfileSummary } from '../Components/profile/DogProfileCard'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../Components/profile/DogProfileCard'
import { GroupActivityPage } from '../pages/GroupActivityPage'
import { GroupCourseDetailPage } from '../pages/GroupCourseDetailPage'
import { ServiceInfoPage } from '../pages/ServiceInfoPage'
import type { ServiceInfoSection } from '../pages/ServiceInfoPage'
import { WalkStatisticsPage } from '../pages/WalkStatisticsPage'
import { SystemStatesPreviewPage } from '../pages/SystemStatesPreviewPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ServerErrorPage } from '../pages/ServerErrorPage'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import { PasswordResetPage } from '../pages/PasswordResetPage'
import { GpsErrorDialog, LocationPermissionSheet, isSystemStateCase } from '../Components/system'
import { useMapLocation } from '../Components/map'
import { formatWalkDistance, formatWalkTime, useWalkTracker } from '../features/walk-record/useWalkTracker'
import '../styles/app.css'
import { mapRecommendationCandidate } from '../Components/courses/course-data'
import type { CourseCandidate } from '../Components/courses/course-data'
import { walkApi } from '../api/walks'
import type { LockedWalkPresenceMode, NearbyPresence, PresenceUpdatePayload, PresenceUpdateResult, WalkEndResult, WalkPresenceMode, WalkRecordDetail, WalkStatistics } from '../api/walks'
import { getValidAccessToken } from '../api/http'
import { connectPresenceSocket } from '../api/presenceSocket'
import type { PresenceSocketClient } from '../api/presenceSocket'
import { authApi } from '../api/auth'
import type { AuthUser } from '../api/auth'
import { courseCatalogApi } from '../api/courses'
import { recommendationApi } from '../api/recommendations'
import type { CourseRecommendation } from '../api/recommendations'
import { groupApi } from '../api/groups'
import type { CourseDetail, CourseSource } from '../api/courses'
import { meetApi } from '../api/meet'
import type { MeetCandidate, MeetConnection, MeetPresenceResult, MeetRequest } from '../api/meet'
import { connectMeetSocket } from '../api/meetSocket'
import type { MeetSocketClient } from '../api/meetSocket'
import { profileApi } from '../api/profile'
import type { DogProfile, NotificationSettings } from '../api/profile'
import { getDevLocationOverride } from '../utils/devLocationOverride'
import { normalizeWalkRoute } from '../features/navigation/route-normalizer'
import { clearActiveWalkRoute, clearPendingWalkRoute, clearWalkRoutes, readActiveWalkRoute, readPendingWalkRoute, writeActiveWalkRoute, writePendingWalkRoute } from '../features/navigation/route-storage'
import type { WalkNavigationRoute, WalkRouteSelection } from '../features/navigation/types'

const allowedWalkReturnPaths = new Set(['/home', '/home/no-course', '/courses/compare', '/courses/candidates', '/courses/detail', '/courses/shade'])

const resolveHomePath = async () => {
  const [courses, records] = await Promise.all([
    courseCatalogApi.list({ page: 0, size: 100, requestedAt: new Date().toISOString() }),
    walkApi.list(0, 1),
  ])
  const hasRepresentativeCourse = courses.some((course) => course.representative)
  const hasWalkRecord = records.length > 0
  return hasRepresentativeCourse && hasWalkRecord ? '/home' : '/home/no-course'
}

const readWalkReturnTo = (search: string) => {
  const requested = new URLSearchParams(search).get('returnTo')
  if (!requested) return '/home/no-course'
  try {
    const url = new URL(requested, window.location.origin)
    return url.origin === window.location.origin && allowedWalkReturnPaths.has(url.pathname)
      ? `${url.pathname}${url.search}`
      : '/home/no-course'
  } catch {
    return '/home/no-course'
  }
}

const walkSelectionUrl = (returnTo: string, context: Record<string, string | number>) => {
  const params = new URLSearchParams({ returnTo })
  Object.entries(context).forEach(([key, value]) => params.set(key, String(value)))
  return `/walk/dogs?${params.toString()}`
}

const readLocation = () => ({ pathname: window.location.pathname, search: window.location.search })

const readDuration = (search: string) => {
  const duration = Number(new URLSearchParams(search).get('duration'))
  return duration >= 10 && duration <= 60 && duration % 5 === 0 ? duration : 30
}

const serviceInfoSections = new Set<ServiceInfoSection>(['version', 'terms', 'privacy', 'licenses'])
const isServiceInfoSection = (value: string | null): value is ServiceInfoSection => value !== null && serviceInfoSections.has(value as ServiceInfoSection)

type AppDog = DogProfileSummary & DogProfileFormValue

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

const dogAge = (birthDate: string) => Math.max(0, new Date().getFullYear() - new Date(birthDate).getFullYear())
const toAppDog = (dog: DogProfile): AppDog => ({
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

export function App() {
  const [restoredActiveSnapshot] = useState(readActiveWalkRoute)
  const [location, setLocation] = useState(readLocation)
  const [locationError, setLocationError] = useState(false)
  const [showSignupLocationPermission, setShowSignupLocationPermission] = useState(false)
  const [walkPresenceMode, setWalkPresenceMode] = useState<LockedWalkPresenceMode | null>('distance')
  const [presenceEnabled, setPresenceEnabled] = useState(true)
  const [distanceRadius, setDistanceRadius] = useState(100)
  const [dogs, setDogs] = useState<AppDog[]>(initialDogs)
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>(initialDogs[0] ? [initialDogs[0].id] : [])
  const [notificationSettings, setNotificationSettings] = useState(defaultNotifications)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser>()
  const [backendWalkStarted, setBackendWalkStarted] = useState(Boolean(restoredActiveSnapshot))
  const [walkStarting, setWalkStarting] = useState(false)
  const [walkEndResult, setWalkEndResult] = useState<WalkEndResult>()
  const [walkApiError, setWalkApiError] = useState<string>()
  const [nearbyPresence, setNearbyPresence] = useState<NearbyPresence>()
  const [meetCandidates, setMeetCandidates] = useState<MeetCandidate[]>([])
  const [meetRequests, setMeetRequests] = useState<MeetRequest[]>([])
  const [meetConnection, setMeetConnection] = useState<MeetConnection>()
  const [selectedWalkRecord, setSelectedWalkRecord] = useState<WalkRecordDetail>()
  const [representativeCourse, setRepresentativeCourse] = useState<CourseDetail>()
  const [pendingWalkSelection, setPendingWalkSelection] = useState<WalkRouteSelection>(readPendingWalkRoute)
  const [activeWalkRoute, setActiveWalkRoute] = useState<WalkNavigationRoute | null>(restoredActiveSnapshot?.route ?? null)
  const [courseRecommendation, setCourseRecommendation] = useState<CourseRecommendation>()
  const [recommendationLoadError, setRecommendationLoadError] = useState<{ requestId: string; reloadKey: number; message: string }>()
  const [recommendationReloadKey, setRecommendationReloadKey] = useState(0)
  const [profileWalkStatistics, setProfileWalkStatistics] = useState<WalkStatistics>()
  const walkSessionIdRef = useRef<number | undefined>(restoredActiveSnapshot?.sessionId)
  const walkStartedAtRef = useRef<string | undefined>(undefined)
  const walkStartPromiseRef = useRef<Promise<number> | undefined>(undefined)
  const walkEndPromiseRef = useRef<Promise<WalkEndResult> | undefined>(undefined)
  const walkStartingRef = useRef(false)
  const presenceSocketRef = useRef<PresenceSocketClient | undefined>(undefined)
  const meetSocketRef = useRef<MeetSocketClient | undefined>(undefined)
  const { currentLocation, requestCurrentLocation, setCurrentLocationMarker } = useMapLocation()
  const devLocationOverride = getDevLocationOverride(authenticatedUser?.email)
  const duration = readDuration(location.search)
  const recommendationRequestId = new URLSearchParams(location.search).get('recommendationId')
  const isWalkTracking = location.pathname === '/walk/active' || location.pathname === '/walk/distance-alert'
  const applyPresenceResponse = useCallback((response: PresenceUpdateResult) => {
    const nearest = response.nearby[0]
    setNearbyPresence(nearest)
    const currentPath = window.location.pathname
    if (nearest && currentPath === '/walk/active') {
      window.history.replaceState({}, '', `/walk/distance-alert${window.location.search}`)
      setLocation(readLocation())
    } else if (!nearest && currentPath === '/walk/distance-alert') {
      window.history.replaceState({}, '', `/walk/active${window.location.search}`)
      setLocation(readLocation())
    }
  }, [])
  const applyMeetResponse = useCallback((response: MeetPresenceResult) => {
    setMeetCandidates(response.candidates)
    setMeetConnection(response.connection ?? undefined)
  }, [])
  const applyMeetRequest = useCallback((request: MeetRequest) => {
    setMeetRequests((current) => [request, ...current.filter((item) => item.requestId !== request.requestId)])
  }, [])
  const walkTracker = useWalkTracker(
    isWalkTracking,
    (point) => {
      const sessionPromise = walkSessionIdRef.current
        ? Promise.resolve(walkSessionIdRef.current)
        : walkStartPromiseRef.current
      if (!sessionPromise) return
      void sessionPromise
        .then((sessionId) => walkApi.addPoint(sessionId, {
          recordedAt: walkStartedAtRef.current
            && Date.parse(point.recordedAt) < Date.parse(walkStartedAtRef.current)
            ? walkStartedAtRef.current
            : point.recordedAt,
          lon: point.longitude,
          lat: point.latitude,
          accuracy: point.accuracy,
        }))
        .catch((error: Error) => setWalkApiError(error.message))
    },
    (fix) => {
      if (!presenceEnabled || !walkPresenceMode) return
      const sessionPromise = walkSessionIdRef.current
        ? Promise.resolve(walkSessionIdRef.current)
        : walkStartPromiseRef.current
      if (!sessionPromise) return
      void sessionPromise
        .then(async (sessionId): Promise<PresenceUpdateResult | MeetPresenceResult | undefined> => {
          const payload: PresenceUpdatePayload = {
          sessionId,
          measuredAt: fix.recordedAt,
          lon: fix.longitude,
          lat: fix.latitude,
          accuracy: fix.accuracy,
          heading: fix.heading,
          stationary: fix.stationary,
          radiusM: distanceRadius,
          }
          if (walkPresenceMode === 'distance') {
            if (presenceSocketRef.current?.send(payload)) return undefined
            return await walkApi.updatePresence(payload)
          }
          if (meetSocketRef.current?.send(payload)) return undefined
          return await meetApi.updatePresence(payload)
        })
        .then((response) => {
          if (!response) return
          if ('nearby' in response) applyPresenceResponse(response)
          else applyMeetResponse(response)
        })
        .catch(() => undefined)
    },
    devLocationOverride,
  )

  useEffect(() => {
    const enabled = backendWalkStarted
      && isWalkTracking
      && presenceEnabled
      && walkPresenceMode === 'distance'
    if (!enabled) {
      presenceSocketRef.current?.close()
      presenceSocketRef.current = undefined
      return
    }

    const socket = connectPresenceSocket({
      tokenProvider: getValidAccessToken,
      onMessage: applyPresenceResponse,
    })
    presenceSocketRef.current = socket
    return () => {
      if (presenceSocketRef.current === socket) presenceSocketRef.current = undefined
      socket.close()
    }
  }, [applyPresenceResponse, backendWalkStarted, isWalkTracking, presenceEnabled, walkPresenceMode])

  useEffect(() => {
    const enabled = backendWalkStarted && isWalkTracking && presenceEnabled && walkPresenceMode === 'meet'
    if (!enabled) {
      meetSocketRef.current?.close()
      meetSocketRef.current = undefined
      return
    }
    const socket = connectMeetSocket({
      tokenProvider: getValidAccessToken,
      onPresence: applyMeetResponse,
      onEvent: (event) => applyMeetRequest(event.request),
    })
    meetSocketRef.current = socket
    const sessionId = walkSessionIdRef.current
    if (sessionId) void meetApi.listRequests(sessionId).then(setMeetRequests).catch(() => undefined)
    return () => {
      if (meetSocketRef.current === socket) meetSocketRef.current = undefined
      socket.close()
    }
  }, [applyMeetRequest, applyMeetResponse, backendWalkStarted, isWalkTracking, presenceEnabled, walkPresenceMode])

  useEffect(() => {
    if (['/login', '/signup', '/password-reset'].includes(window.location.pathname)) return
    void authApi.restore()
      .then((response) => setAuthenticatedUser(response.user))
      .catch(() => setAuthenticatedUser(undefined))
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
    if (!getDevLocationOverride(authenticatedUser?.email)) return
    void requestCurrentLocation().catch(() => undefined)
  }, [authenticatedUser?.email, requestCurrentLocation])

  useEffect(() => {
    if (location.pathname !== '/records/detail') return
    const sessionId = Number(new URLSearchParams(location.search).get('id'))
    if (!Number.isSafeInteger(sessionId) || sessionId < 1) return
    void walkApi.detail(sessionId)
      .then(setSelectedWalkRecord)
      .catch((error: Error) => setWalkApiError(error.message))
  }, [location.pathname, location.search])

  useEffect(() => {
    if (location.pathname !== '/profile') return
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let active = true
    void walkApi.statistics(month)
      .then((statistics) => { if (active) setProfileWalkStatistics(statistics) })
      .catch(() => { if (active) setProfileWalkStatistics(undefined) })
    return () => { active = false }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/home') return
    let active = true
    void courseCatalogApi.list({ page: 0, size: 100, requestedAt: new Date().toISOString() })
      .then((courses) => {
        const representative = courses.find((course) => course.representative)
        if (!representative) return undefined
        return courseCatalogApi.detail(representative.courseSource, representative.courseId)
      })
      .then((course) => { if (active) setRepresentativeCourse(course) })
      .catch(() => { if (active) setRepresentativeCourse(undefined) })
    return () => { active = false }
  }, [location.pathname])

  useEffect(() => {
    const activeDog = dogs.find((dog) => selectedDogIds.includes(dog.id)) ?? dogs.find((dog) => dog.isDefault) ?? dogs[0]
    setCurrentLocationMarker(activeDog ? { label: activeDog.name, profileImageSrc: activeDog.profileImageSrc } : undefined)
  }, [dogs, selectedDogIds, setCurrentLocationMarker])

  useEffect(() => {
    const syncLocation = () => setLocation(readLocation())
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])

  useEffect(() => {
    if (!recommendationRequestId || courseRecommendation?.requestId === recommendationRequestId) return
    let active = true
    void recommendationApi.get(recommendationRequestId)
      .then((response) => { if (active) setCourseRecommendation(response) })
      .catch((error: Error) => {
        if (active) setRecommendationLoadError({ requestId: recommendationRequestId, reloadKey: recommendationReloadKey, message: error.message })
      })
    return () => { active = false }
  }, [courseRecommendation?.requestId, recommendationReloadKey, recommendationRequestId])

  const navigate = (url: string) => {
    window.history.pushState({}, '', url)
    setLocation(readLocation())
  }

  const selectWalkRoute = (selection: WalkRouteSelection, url: string) => {
    setPendingWalkSelection(selection)
    writePendingWalkRoute(selection)
    setActiveWalkRoute(null)
    clearActiveWalkRoute()
    setWalkApiError(undefined)
    navigate(url)
  }

  const selectRequiredRoute = (routeFactory: () => WalkNavigationRoute, url: string) => {
    try {
      const route = routeFactory()
      if (!route.navigationPolyline) {
        throw new Error('분리된 여러 구간으로 구성된 코스는 아직 길 안내를 시작할 수 없습니다.')
      }
      selectWalkRoute({ route, routeRequired: true }, url)
    } catch (error) {
      const selection = { route: null, routeRequired: true } satisfies WalkRouteSelection
      setPendingWalkSelection(selection)
      writePendingWalkRoute(selection)
      setWalkApiError(error instanceof Error ? error.message : '선택한 경로를 준비하지 못했습니다.')
      navigate(url)
    }
  }

  const selectFreeWalk = (url: string) => selectWalkRoute({ route: null, routeRequired: false }, url)

  const startWalkWithRoute = async (route: WalkNavigationRoute | null, mode: WalkPresenceMode = 'off', dogIds: string[] = selectedDogIds) => {
    if (walkStartingRef.current) return
    walkStartingRef.current = true
    walkTracker.reset()
    setWalkEndResult(undefined)
    setWalkApiError(undefined)
    setNearbyPresence(undefined)
    setMeetCandidates([])
    setMeetRequests([])
    setMeetConnection(undefined)
    setBackendWalkStarted(false)
    setWalkStarting(true)
    setActiveWalkRoute(null)
    clearActiveWalkRoute()
    walkSessionIdRef.current = undefined
    walkStartedAtRef.current = undefined
    const persistedDogIds = dogIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)
    const pending = walkApi.start(mode, persistedDogIds).then(async ({ sessionId, startedAt, mode: activeMode, lockedMode }) => {
      if (mode !== 'off' && (activeMode !== mode || lockedMode !== mode)) {
        throw new Error('선택한 산책 모드가 적용되지 않았어요. 다시 시작해 주세요.')
      }
      walkSessionIdRef.current = sessionId
      walkStartedAtRef.current = startedAt
      const resolvedLockedMode = lockedMode ?? (activeMode === 'off' ? null : activeMode)
      setWalkPresenceMode(resolvedLockedMode)
      setPresenceEnabled(activeMode !== 'off')
      if (activeMode !== 'off') {
        try {
          if (activeMode === 'meet') {
            const dog = dogs.find((item) => dogIds.includes(item.id)) ?? dogs[0]
            if (!dog) throw new Error('만나기 모드에 사용할 반려견을 선택해 주세요.')
            await meetApi.saveProfile({
              dogName: dog.name,
              breed: dog.breed,
              ageYears: dogAge(dog.birthDate),
              profileImageUrl: dog.profileImageSrc && dog.profileImageSrc.length <= 500 ? dog.profileImageSrc : null,
              temperamentTags: dog.temperamentTags,
            })
          }
          await walkApi.consentPresence(sessionId)
        } catch (error) {
          await walkApi.end(sessionId).catch(() => undefined)
          throw error
        }
      }
      return sessionId
    })
    walkStartPromiseRef.current = pending
    try {
      await pending
      const sessionId = walkSessionIdRef.current
      if (!sessionId) throw new Error('산책 세션을 확인하지 못했습니다.')
      setActiveWalkRoute(route)
      writeActiveWalkRoute({ sessionId, route })
      clearPendingWalkRoute()
      setPendingWalkSelection({ route: null, routeRequired: false })
      setBackendWalkStarted(true)
      navigate('/walk/active')
    } catch (error) {
      walkStartPromiseRef.current = undefined
      setWalkApiError(error instanceof Error ? error.message : '산책을 시작하지 못했습니다.')
    } finally {
      walkStartingRef.current = false
      setWalkStarting(false)
    }
  }

  const changePresenceEnabled = (enabled: boolean) => {
    if (!walkPresenceMode) return
    const sessionPromise = walkSessionIdRef.current
      ? Promise.resolve(walkSessionIdRef.current)
      : walkStartPromiseRef.current

    if (!sessionPromise) {
      setPresenceEnabled(enabled)
      return
    }

    const nextMode: WalkPresenceMode = enabled ? walkPresenceMode : 'off'
    if (!enabled) {
      setNearbyPresence(undefined)
      setMeetCandidates([])
      setMeetConnection(undefined)
    }
    void sessionPromise
      .then((sessionId) => walkApi.changeMode(sessionId, nextMode)
        .then(async (response) => {
          if (enabled) await walkApi.consentPresence(sessionId)
          setWalkPresenceMode(response.lockedMode ?? walkPresenceMode)
          setPresenceEnabled(response.mode !== 'off')
        }))
      .catch((error: Error) => setWalkApiError(error.message))
  }

  const runMeetAction = (action: () => Promise<MeetRequest>) => {
    void action().then(applyMeetRequest).catch((error: Error) => setWalkApiError(error.message))
  }

  const pauseWalk = (url: string) => {
    navigate(url)
    if (walkSessionIdRef.current) {
      void walkApi.pause(walkSessionIdRef.current).catch((error: Error) => setWalkApiError(error.message))
    }
  }

  const resumeWalk = (url: string) => {
    navigate(url)
    if (walkSessionIdRef.current) {
      void walkApi.resume(walkSessionIdRef.current).catch((error: Error) => setWalkApiError(error.message))
    }
  }

  const endWalk = () => {
    navigate('/walk/complete')
    clearWalkRoutes()
    setActiveWalkRoute(null)
    setPendingWalkSelection({ route: null, routeRequired: false })
    const sessionPromise = walkSessionIdRef.current
      ? Promise.resolve(walkSessionIdRef.current)
      : walkStartPromiseRef.current
    if (!sessionPromise) return
    const pending = sessionPromise.then((sessionId) => walkApi.end(sessionId))
    walkEndPromiseRef.current = pending
    void pending
      .then(setWalkEndResult)
      .catch((error: Error) => setWalkApiError(error.message))
  }

  const requestLocationPermission = () => {
    setLocationError(false)
    void requestCurrentLocation()
      .then(async () => {
        try {
          navigate(await resolveHomePath())
        } catch {
          navigate('/home/no-course')
        }
      })
      .catch(() => setLocationError(true))
  }

  const requestSignupLocation = () => {
    setLocationError(false)
    void requestCurrentLocation()
      .then(() => setShowSignupLocationPermission(false))
      .catch(() => {
        setShowSignupLocationPermission(false)
        setLocationError(true)
      })
  }

  const requestMeet = (candidateRef: string) => {
    const sessionId = walkSessionIdRef.current
    if (sessionId) runMeetAction(() => meetApi.createRequest(sessionId, candidateRef))
  }

  const renderWalkSession = (sessionState: 'active' | 'distance-alert' | 'paused') => (
    <ActiveWalkPage
      sessionState={sessionState}
      route={activeWalkRoute}
      currentPosition={walkTracker.currentPosition}
      alert={nearbyPresence}
      time={walkTracker.formattedTime}
      distance={walkTracker.formattedDistance}
      walkedCoordinates={walkTracker.walkedCoordinates}
      gpsSignal={walkApiError ? 'error' : walkTracker.gpsSignal}
      presenceMode={walkPresenceMode}
      presenceEnabled={presenceEnabled}
      onPresenceEnabledChange={(enabled) => {
        changePresenceEnabled(enabled)
        if (sessionState === 'distance-alert' && !enabled) navigate('/walk/active')
      }}
      distanceRadius={distanceRadius}
      onDistanceRadiusChange={setDistanceRadius}
      meetCandidates={meetCandidates}
      meetRequests={meetRequests}
      meetConnection={meetConnection}
      onMeetRequest={requestMeet}
      onMeetAccept={(id) => runMeetAction(() => meetApi.accept(id))}
      onMeetReject={(id) => runMeetAction(() => meetApi.reject(id))}
      onMeetCancel={(id) => runMeetAction(() => meetApi.cancel(id))}
      onMeetEnd={(id) => { runMeetAction(() => meetApi.end(id)); setMeetConnection(undefined) }}
      onMeetBlock={(id) => {
        void meetApi.block(id)
          .then(() => { setMeetConnection(undefined); setMeetRequests([]) })
          .catch((error: Error) => setWalkApiError(error.message))
      }}
      onPause={() => pauseWalk('/walk/paused')}
      onResume={() => resumeWalk('/walk/active')}
      onStop={endWalk}
    />
  )

  if (location.pathname === '/preview/system-states') {
    const requestedCase = new URLSearchParams(location.search).get('case')
    return <SystemStatesPreviewPage selectedCase={isSystemStateCase(requestedCase) ? requestedCase : undefined} onSelect={(next) => navigate(next ? `/preview/system-states?case=${next}` : '/preview/system-states')} />
  }

  if (location.pathname === '/preview/location-permission') {
    return <SystemStatesPreviewPage selectedCase="m01" onSelect={() => navigate('/preview/system-states')} />
  }

  if (location.pathname === '/login') {
    return <LoginPage
      onLogin={async ({ email, password }) => {
        const response = await authApi.login(email, password)
        setAuthenticatedUser(response.user)
        navigate('/location-permission')
      }}
      onSignUp={() => navigate('/signup')}
      onForgotPassword={() => navigate('/password-reset')}
    />
  }

  if (location.pathname === '/signup') {
    return <SignupPage
      onBack={() => navigate('/login')}
      onCheckEmail={authApi.checkEmail}
      onCheckNickname={authApi.checkNickname}
      onVerifyPhone={async (phoneNumber) => (await authApi.verifyPhone(phoneNumber)).verified}
      onSignUp={async (value) => {
        const response = await authApi.signup({ ...value, termsAgreed: true })
        setAuthenticatedUser(response.user)
        navigate('/onboarding/dog')
      }}
    />
  }

  if (location.pathname === '/password-reset') {
    return <PasswordResetPage onBack={() => navigate('/login')} onComplete={() => navigate('/login')} />
  }

  if (location.pathname === '/groups/join') {
    return <JoinGroupPage defaultCode="" onBack={() => navigate('/groups')} onConfirm={async (code) => {
      const group = await groupApi.join(code)
      navigate(`/groups/detail?id=${group.groupId}`)
    }} />
  }

  if (location.pathname === '/groups/new') {
    return <CreateGroupPage onBack={() => navigate('/groups')} onCreate={async (input) => {
      const group = await groupApi.create(input)
      navigate(`/groups/detail?id=${group.groupId}`)
    }} />
  }

  if (location.pathname === '/groups/courses') {
    const groupId = Number(new URLSearchParams(location.search).get('id'))
    if (!Number.isSafeInteger(groupId) || groupId < 1) return <NotFoundPage onHome={() => navigate('/groups')} />
    return <SharedCoursesPage groupId={groupId} onBack={() => navigate(`/groups/detail?id=${groupId}`)} onOpenCourse={(sharedCourseId) => navigate(`/groups/course?id=${groupId}&sharedCourseId=${sharedCourseId}`)} />
  }

  if (location.pathname === '/groups/activity') {
    const groupId = Number(new URLSearchParams(location.search).get('id'))
    if (!Number.isSafeInteger(groupId) || groupId < 1) return <NotFoundPage onHome={() => navigate('/groups')} />
    return <GroupActivityPage groupId={groupId} onBack={() => navigate(`/groups/detail?id=${groupId}`)} />
  }

  if (location.pathname === '/groups/course') {
    const params = new URLSearchParams(location.search)
    const groupId = Number(params.get('id'))
    const sharedCourseId = Number(params.get('sharedCourseId'))
    if (!Number.isSafeInteger(groupId) || groupId < 1 || !Number.isSafeInteger(sharedCourseId) || sharedCourseId < 1) return <NotFoundPage onHome={() => navigate('/groups')} />
    return <GroupCourseDetailPage groupId={groupId} sharedCourseId={sharedCourseId} currentUserId={authenticatedUser?.userId} onBack={() => navigate(`/groups/detail?id=${groupId}`)} onSaved={(courseId) => navigate(`/courses/detail?source=custom&id=${courseId}`)} onUnshared={() => navigate(`/groups/detail?id=${groupId}`)} />
  }

  if (location.pathname === '/groups/detail') {
    const groupId = Number(new URLSearchParams(location.search).get('id'))
    if (!Number.isSafeInteger(groupId) || groupId < 1) return <NotFoundPage onHome={() => navigate('/groups')} />
    return <GroupRoomPage groupId={groupId} onBack={() => navigate('/groups')} onOpenSharedCourse={(sharedCourseId) => navigate(`/groups/course?id=${groupId}&sharedCourseId=${sharedCourseId}`)} onOpenActivity={() => navigate(`/groups/activity?id=${groupId}`)} onOpenAllCourses={() => navigate(`/groups/courses?id=${groupId}`)} onClosed={() => navigate('/groups')} />
  }

  if (location.pathname === '/groups') {
    const params = new URLSearchParams(location.search)
    const shareSource = params.get('shareSource')
    const shareCourseId = Number(params.get('shareCourseId'))
    const pendingShare = (shareSource === 'walk' || shareSource === 'custom') && Number.isSafeInteger(shareCourseId) && shareCourseId > 0
      ? { courseSource: shareSource as 'walk' | 'custom', courseId: shareCourseId }
      : undefined
    return <GroupListPage pendingShare={pendingShare} onBack={() => navigate('/profile')} onCreateGroup={() => navigate('/groups/new')} onJoinGroup={() => navigate('/groups/join')} onOpenGroup={(groupId) => navigate(`/groups/detail?id=${groupId}`)} />
  }

  if (location.pathname === '/profile/notifications') {
    return <NotificationSettingsPage value={notificationSettings} onBack={() => navigate('/profile')} onChange={async (next) => {
      const previous = notificationSettings
      setNotificationSettings(next)
      try {
        setNotificationSettings(await profileApi.updateNotifications(next))
      } catch (error) {
        setNotificationSettings(previous)
        setWalkApiError(error instanceof Error ? error.message : '알림 설정을 저장하지 못했습니다.')
      }
    }} />
  }

  if (location.pathname === '/onboarding/dog') {
    const finishOnboarding = () => {
      navigate('/home/no-course')
      setShowSignupLocationPermission(true)
    }
    return <DogOnboardingPage onSkip={finishOnboarding} onSave={async (value) => {
      const created = await profileApi.createDog({
        name: value.name,
        breed: value.breed,
        birthDate: value.birthDate,
        profileImageUrl: value.profileImageSrc || null,
        temperamentTags: value.temperamentTags,
        gender: value.gender,
        neutered: value.neutered,
        introduction: value.introduction || null,
        leashGreeting: value.leashGreeting,
        strangerResponse: value.strangerResponse,
        touchTolerance: value.touchTolerance,
        barkingLevel: value.barkingLevel,
        bitingLevel: value.bitingLevel,
        isDefault: true,
      })
      const savedDog = toAppDog(created)
      setDogs([savedDog])
      setSelectedDogIds([savedDog.id])
      finishOnboarding()
    }} />
  }

  if (location.pathname === '/profile/account') {
    return <AccountProfilePage
      nickname={authenticatedUser?.nickname ?? ''}
      email={authenticatedUser?.email ?? ''}
      profileImageSrc={authenticatedUser?.profileImageUrl}
      onBack={() => navigate('/profile')}
      onCheckNickname={(nickname) => profileApi.checkNickname(nickname)}
      onSave={async (value) => {
        const user = await profileApi.updateMe(value)
        setAuthenticatedUser(user)
        navigate('/profile')
      }}
      onDeactivate={async () => {
        await profileApi.deactivate()
        await authApi.logout()
        setAuthenticatedUser(undefined)
        setDogs([])
        setSelectedDogIds([])
        navigate('/login')
      }}
    />
  }

  if (location.pathname === '/profile/service') {
    const section = new URLSearchParams(location.search).get('section')
    const selectedSection = isServiceInfoSection(section) ? section : undefined
    return <ServiceInfoPage selectedSection={selectedSection} onBack={() => navigate(selectedSection ? '/profile/service' : '/profile')} onOpen={(nextSection) => navigate(`/profile/service?section=${nextSection}`)} />
  }

  if (location.pathname === '/profile/stats') {
    return <WalkStatisticsPage
      dogs={dogs.map((dog) => ({ id: Number(dog.id), name: dog.name })).filter((dog) => Number.isSafeInteger(dog.id) && dog.id > 0)}
      onBack={() => navigate('/profile')}
      onOpenRecords={() => navigate('/records')}
      onOpenRecord={(sessionId) => navigate(`/records/detail?id=${sessionId}&returnTo=%2Fprofile%2Fstats`)}
    />
  }

  if (location.pathname === '/profile/dogs/edit') {
    const params = new URLSearchParams(location.search)
    const returnTo = params.get('returnTo') === '/walk/dogs' ? '/walk/dogs' : '/profile/dogs'
    const editingId = params.get('id')
    const editingDog = dogs.find((dog) => dog.id === editingId)
    const initialDog: DogProfileFormValue = editingDog
      ? { name: editingDog.name, breed: editingDog.breed, birthDate: editingDog.birthDate, gender: editingDog.gender, neutered: editingDog.neutered, introduction: editingDog.introduction, isDefault: editingDog.isDefault, profileImageSrc: editingDog.profileImageSrc, temperamentTags: editingDog.temperamentTags, leashGreeting: editingDog.leashGreeting, strangerResponse: editingDog.strangerResponse, touchTolerance: editingDog.touchTolerance, barkingLevel: editingDog.barkingLevel, bitingLevel: editingDog.bitingLevel }
      : { name: '', breed: '', birthDate: '', gender: 'UNKNOWN', neutered: null, introduction: '', isDefault: dogs.length === 0, profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE, temperamentTags: [], leashGreeting: 'UNKNOWN', strangerResponse: 'UNKNOWN', touchTolerance: 'UNKNOWN', barkingLevel: 'UNKNOWN', bitingLevel: 'UNKNOWN' }
    return <DogProfileFormPage initialDog={initialDog} onBack={() => navigate(returnTo)} onDelete={editingDog ? async () => {
      await profileApi.deleteDog(Number(editingDog.id))
      const loaded = (await profileApi.listDogs()).map(toAppDog)
      setDogs(loaded)
      setSelectedDogIds((current) => current.filter((id) => id !== editingDog.id))
      navigate('/profile/dogs')
    } : undefined} onSave={async (value) => {
      const input = {
        name: value.name,
        breed: value.breed,
        birthDate: value.birthDate,
        isDefault: value.isDefault,
        profileImageUrl: value.profileImageSrc || null,
        temperamentTags: value.temperamentTags,
        gender: value.gender,
        neutered: value.neutered,
        introduction: value.introduction || null,
        leashGreeting: value.leashGreeting,
        strangerResponse: value.strangerResponse,
        touchTolerance: value.touchTolerance,
        barkingLevel: value.barkingLevel,
        bitingLevel: value.bitingLevel,
      }
      const response = editingDog
        ? await profileApi.updateDog(Number(editingDog.id), input)
        : await profileApi.createDog(input)
      const savedDog = toAppDog(response)
      setDogs((current) => {
        const updated = editingDog
          ? current.map((dog) => dog.id === savedDog.id ? savedDog : dog)
          : [...current, savedDog]
        return savedDog.isDefault ? updated.map((dog) => ({ ...dog, isDefault: dog.id === savedDog.id })) : updated
      })
      if (!editingDog) setSelectedDogIds([savedDog.id])
      navigate(returnTo)
    }} />
  }

  if (location.pathname === '/profile/dogs') {
    return <DogManagementPage dogs={dogs} onBack={() => navigate('/profile')} onEditDog={(id) => navigate(`/profile/dogs/edit?id=${encodeURIComponent(id)}`)} onRegisterDog={() => navigate('/profile/dogs/edit')} />
  }

  if (location.pathname === '/profile') {
    const defaultDog = dogs.find((dog) => dog.isDefault) ?? dogs[0]
    return <MyPage
      userNickname={authenticatedUser?.nickname}
      dog={defaultDog ?? null}
      dogCount={dogs.length}
      walkStatisticsDescription={profileWalkStatistics
        ? `이번 달 ${profileWalkStatistics.walkCount}회 · ${(profileWalkStatistics.totalDistanceM / 1000).toFixed(1)}km`
        : undefined}
      notificationDescription={[
        notificationSettings.distanceEnabled && '거리두기',
        notificationSettings.meetEnabled && '만나기',
        notificationSettings.groupEnabled && '그룹',
      ].filter(Boolean).join(' · ') || '모든 알림 꺼짐'}
      onOpenProfile={() => navigate(defaultDog ? `/profile/dogs/edit?id=${encodeURIComponent(defaultDog.id)}` : '/profile/dogs/edit')}
      onOpenAccount={() => navigate('/profile/account')}
      onOpenStats={() => navigate('/profile/stats')}
      onOpenDogs={() => navigate('/profile/dogs')}
      onOpenGroups={() => navigate('/groups')}
      onOpenNotifications={() => navigate('/profile/notifications')}
      onOpenServiceInfo={() => navigate('/profile/service')}
      onLogout={() => { void authApi.logout().finally(() => { setAuthenticatedUser(undefined); navigate('/login') }) }}
    />
  }

  if (location.pathname === '/records/detail') {
    const requestedRecordId = Number(new URLSearchParams(location.search).get('id'))
    const recordReturnTo = new URLSearchParams(location.search).get('returnTo') === '/profile/stats' ? '/profile/stats' : '/records'
    const currentRecord = selectedWalkRecord?.sessionId === requestedRecordId ? selectedWalkRecord : undefined
    return <WalkRecordDetailPage
      key={requestedRecordId}
      record={currentRecord}
      errorMessage={walkApiError}
      onBack={() => navigate(recordReturnTo)}
      onRepresentativeChange={(representative) => {
        if (!selectedWalkRecord) return
        void walkApi.setRepresentative(selectedWalkRecord.sessionId, representative)
          .then(setSelectedWalkRecord)
          .catch((error: Error) => setWalkApiError(error.message))
      }}
      onDelete={() => {
        if (!selectedWalkRecord) {
          navigate(recordReturnTo)
          return
        }
        void walkApi.delete(selectedWalkRecord.sessionId)
          .then(() => navigate(recordReturnTo))
          .catch((error: Error) => setWalkApiError(error.message))
      }}
      onRename={async (name) => {
        if (!selectedWalkRecord) return
        const updated = await walkApi.rename(selectedWalkRecord.sessionId, name)
        setSelectedWalkRecord(updated)
      }}
      onShareCourse={() => selectedWalkRecord && navigate(`/groups?shareSource=walk&shareCourseId=${selectedWalkRecord.sessionId}`)}
    />
  }

  if (location.pathname === '/records') {
    return <WalkRecordsPage
      dogs={dogs.map((dog) => ({ id: Number(dog.id), name: dog.name })).filter((dog) => Number.isSafeInteger(dog.id) && dog.id > 0)}
      onBack={() => navigate('/home')}
      onOpenRecord={(id) => navigate(`/records/detail?id=${id}`)}
    />
  }

  if (location.pathname === '/courses/detail') {
    const params = new URLSearchParams(location.search)
    const source = params.get('source')
    const courseId = Number(params.get('id'))
    if ((source !== 'walk' && source !== 'custom') || !Number.isSafeInteger(courseId) || courseId < 1) {
      return <NotFoundPage onHome={() => navigate('/courses')} />
    }
    return <CourseDetailPage
      source={source}
      courseId={courseId}
      onBack={() => navigate('/courses')}
      onStart={(course) => selectRequiredRoute(() => normalizeWalkRoute({
        routeKey: `course-detail:${course.courseSource}:${course.courseId}`,
        backendId: `${course.courseSource}:${course.courseId}`,
        origin: 'COURSE_DETAIL',
        name: course.courseName,
        geometry: course.route,
        distanceM: course.metrics?.lengthM,
        durationSec: course.metrics ? course.metrics.durationMin * 60 : undefined,
        estimatedSurfaceTempC: course.metrics?.estimatedSurfaceTempC,
        shadeRatio: course.metrics?.shadeRatio,
      }), walkSelectionUrl(`/courses/detail?source=${course.courseSource}&id=${course.courseId}`, { entry: 'course-detail', duration: course.metrics?.durationMin ?? 30 }))}
      onCompare={(course) => navigate(`/courses/compare?returnTo=%2Fcourses%2Fdetail&source=${course.courseSource}&id=${course.courseId}`)}
      onDeleted={() => navigate('/courses')}
      onShare={() => navigate(`/groups?shareSource=${source}&shareCourseId=${courseId}`)}
    />
  }

  if (location.pathname === '/courses/shade') {
    return <ShadeTimelinePage onBack={() => navigate('/courses')} onWalkAtRecommended={() => selectFreeWalk(walkSelectionUrl('/courses/shade', { entry: 'direct' }))} />
  }

  if (location.pathname === '/courses/draw') {
    return <DrawCoursePage onBack={() => navigate('/courses')} onSave={(course) => navigate(`/courses/detail?source=${course.courseSource}&id=${course.courseId}`)} />
  }

  if (location.pathname === '/courses') {
    return <MyCoursesPage onBack={() => navigate('/home')} onOpenCourse={(source, courseId) => navigate(`/courses/detail?source=${source}&id=${courseId}`)} onOpenShadeTimeline={() => navigate('/courses/shade')} onOpenDrawCourse={() => navigate('/courses/draw')} />
  }

  if (location.pathname === '/walk/distance-alert') {
    return renderWalkSession('distance-alert')
  }

  if (location.pathname === '/walk/complete') {
    const representativeEligible = Boolean(
      walkEndResult
      && (walkEndResult.matchStatus === 'MATCHED' || walkEndResult.matchStatus === 'PARTIAL')
      && walkEndResult.isLoop
      && walkEndResult.matchedSegmentIds.length > 0,
    )
    return <WalkCompletePage
      time={walkEndResult ? formatWalkTime(walkEndResult.durationSec) : walkTracker.formattedTime}
      distance={walkEndResult ? formatWalkDistance(walkEndResult.distanceM) : walkTracker.formattedDistance}
      representativeEligible={backendWalkStarted ? representativeEligible : true}
      matchStatus={walkEndResult?.matchStatus}
      errorMessage={walkApiError}
      onExitWithoutSaving={() => {
        setBackendWalkStarted(false)
        setWalkEndResult(undefined)
        setWalkApiError(undefined)
        walkSessionIdRef.current = undefined
        walkStartPromiseRef.current = undefined
        walkEndPromiseRef.current = undefined
        clearWalkRoutes()
        setActiveWalkRoute(null)
        navigate('/home')
      }}
      onSave={(course) => {
        const sessionPromise = walkSessionIdRef.current
          ? Promise.resolve(walkSessionIdRef.current)
          : walkStartPromiseRef.current
        if (!sessionPromise) {
          navigate('/home')
          return
        }
        const ended = walkEndPromiseRef.current ?? sessionPromise.then((sessionId) => walkApi.end(sessionId))
        void ended
          .then((result) => walkApi.save(result.sessionId, course.name, course.representative))
          .then(() => { setBackendWalkStarted(false); clearWalkRoutes(); setActiveWalkRoute(null); navigate('/home') })
          .catch((error: Error) => setWalkApiError(error.message))
      }}
    />
  }

  if (location.pathname === '/walk/paused') {
    return renderWalkSession('paused')
  }

  if (location.pathname === '/walk/active') {
    return renderWalkSession('active')
  }

  if (location.pathname === '/walk/dogs') {
    return <DogSelectionPage dogs={dogs} starting={walkStarting} errorMessage={walkApiError} onBack={() => navigate(readWalkReturnTo(location.search))} onConfirm={(selection) => {
      if (pendingWalkSelection.routeRequired && !pendingWalkSelection.route) {
        setWalkApiError('선택한 코스 경로를 불러온 뒤 다시 시도해 주세요.')
        return
      }
      setSelectedDogIds(selection.dogIds)
      setWalkPresenceMode(selection.mode === 'off' ? null : selection.mode)
      setPresenceEnabled(selection.mode !== 'off')
      void startWalkWithRoute(pendingWalkSelection.route, selection.mode, selection.dogIds)
    }} onRegisterDog={() => navigate('/profile/dogs/edit?returnTo=%2Fwalk%2Fdogs')} />
  }

  if (location.pathname === '/courses/compare') {
    const params = new URLSearchParams(location.search)
    const source = params.get('source') as CourseSource | null
    const courseId = Number(params.get('id'))
    const requestedReturnTo = params.get('returnTo')
    const returnTo = requestedReturnTo === '/home'
      ? '/home'
      : requestedReturnTo === '/courses/detail' && (source === 'walk' || source === 'custom') && courseId > 0
        ? `/courses/detail?source=${source}&id=${courseId}`
        : '/courses'
    if ((source !== 'walk' && source !== 'custom') || !Number.isSafeInteger(courseId) || courseId < 1) {
      return <NotFoundPage onHome={() => navigate('/courses')} />
    }
    return <RouteComparisonPage
      source={source}
      courseId={courseId}
      onBack={() => navigate(returnTo)}
      onStartAlternative={(comparison) => selectRequiredRoute(() => {
        if (!comparison.alternativeRoute || !comparison.alternative) throw new Error('추천 대안 경로를 불러오지 못했습니다.')
        return normalizeWalkRoute({
          routeKey: `comparison-alternative:${comparison.courseSource}:${comparison.courseId}`,
          origin: 'COMPARISON_ALTERNATIVE',
          name: `${comparison.courseName} 추천 대안`,
          geometry: comparison.alternativeRoute,
          distanceM: comparison.alternative.lengthM,
          durationSec: comparison.alternative.durationMin * 60,
          estimatedSurfaceTempC: comparison.alternative.estimatedSurfaceTempC,
          shadeRatio: comparison.alternative.shadeRatio,
        })
      }, walkSelectionUrl(`/courses/compare?source=${source}&id=${courseId}&returnTo=${encodeURIComponent(requestedReturnTo ?? '/courses')}`, { entry: 'course-comparison', duration: comparison.alternative?.durationMin ?? comparison.usual.durationMin }))}
      onStartUsual={(comparison) => selectRequiredRoute(() => normalizeWalkRoute({
        routeKey: `comparison-usual:${comparison.courseSource}:${comparison.courseId}`,
        backendId: `${comparison.courseSource}:${comparison.courseId}`,
        origin: 'COMPARISON_USUAL',
        name: comparison.courseName,
        geometry: comparison.usualRoute,
        distanceM: comparison.usual.lengthM,
        durationSec: comparison.usual.durationMin * 60,
        estimatedSurfaceTempC: comparison.usual.estimatedSurfaceTempC,
        shadeRatio: comparison.usual.shadeRatio,
      }), walkSelectionUrl(`/courses/compare?source=${source}&id=${courseId}&returnTo=${encodeURIComponent(requestedReturnTo ?? '/courses')}`, { entry: 'course-comparison', duration: comparison.usual.durationMin }))}
    />
  }

  if (location.pathname === '/courses/candidates') {
    if (recommendationRequestId && recommendationLoadError?.requestId === recommendationRequestId && recommendationLoadError.reloadKey === recommendationReloadKey) {
      return <ServerErrorPage onRetry={() => setRecommendationReloadKey((value) => value + 1)} />
    }
    if (recommendationRequestId && courseRecommendation?.requestId !== recommendationRequestId) {
      return <RouteGeneratingPage duration={duration} />
    }
    const candidates: CourseCandidate[] | undefined = courseRecommendation?.requestId === recommendationRequestId
      ? [...courseRecommendation.savedCandidates, ...courseRecommendation.generatedCandidates].map(mapRecommendationCandidate)
      : undefined
    return <RouteCandidatesPage duration={duration} candidates={candidates} onBack={() => navigate(`/walk/time?duration=${duration}`)} onConfirm={(candidate) => selectRequiredRoute(() => {
      if (!candidate.route) throw new Error('추천 코스 경로를 불러오지 못했습니다.')
      return normalizeWalkRoute({
        routeKey: `time-recommendation:${candidate.id}`,
        backendId: candidate.courseSource && candidate.courseId ? `${candidate.courseSource}:${candidate.courseId}` : undefined,
        origin: 'TIME_RECOMMENDATION',
        name: candidate.name,
        geometry: candidate.route,
        distanceM: candidate.distanceKm * 1_000,
        durationSec: candidate.durationMinutes * 60,
        thermalSegments: candidate.thermalSegments,
        estimatedSurfaceTempC: candidate.estimatedSurfaceTempC,
        shadeRatio: candidate.shadeRatio === null ? null : candidate.shadeRatio / 100,
      })
    }, walkSelectionUrl(`/courses/candidates?duration=${duration}&recommendationId=${encodeURIComponent(courseRecommendation?.requestId ?? '')}`, { entry: 'time-candidates', duration: candidate.durationMinutes }))} />
  }

  if (location.pathname === '/courses/loading') {
    const departureAt = new URLSearchParams(location.search).get('departureAt') ?? new Date().toISOString()
    return <RouteGeneratingPage duration={duration} onGenerate={async () => {
      const start = currentLocation ?? await requestCurrentLocation()
      const response = await recommendationApi.create({
        start: { lat: start.latitude, lon: start.longitude },
        targetDurationMin: duration,
        departureAt,
        candidateCount: 2,
      })
      setCourseRecommendation(response)
      navigate(`/courses/candidates?duration=${duration}&recommendationId=${encodeURIComponent(response.requestId)}`)
    }} />
  }

  if (location.pathname === '/walk/time') {
    return <WalkDurationPage initialDuration={duration} onContinue={(selectedDuration, departureAt) => navigate(`/courses/loading?duration=${selectedDuration}&departureAt=${encodeURIComponent(departureAt)}`)} />
  }

  if (location.pathname === '/home/no-course') {
    return <>
      <NoCourseHomePage onStartWalk={() => selectFreeWalk(walkSelectionUrl('/home/no-course', { entry: 'direct' }))} onDrawCourse={() => navigate('/courses/draw')} onRecommendCourse={() => navigate('/walk/time')} />
      {showSignupLocationPermission && <LocationPermissionSheet onClose={() => setShowSignupLocationPermission(false)} onAllow={requestSignupLocation} />}
      {locationError && <GpsErrorDialog onClose={() => setLocationError(false)} onRetry={requestSignupLocation} />}
    </>
  }

  if (location.pathname === '/home') {
    return <RepresentativeHomePage
      course={representativeCourse}
      onStartWalk={() => representativeCourse
        ? selectRequiredRoute(() => normalizeWalkRoute({
            routeKey: `representative:${representativeCourse.courseSource}:${representativeCourse.courseId}`,
            backendId: `${representativeCourse.courseSource}:${representativeCourse.courseId}`,
            origin: 'REPRESENTATIVE_COURSE',
            name: representativeCourse.courseName,
            geometry: representativeCourse.route,
            distanceM: representativeCourse.metrics?.lengthM,
            durationSec: representativeCourse.metrics ? representativeCourse.metrics.durationMin * 60 : undefined,
            estimatedSurfaceTempC: representativeCourse.metrics?.estimatedSurfaceTempC,
            shadeRatio: representativeCourse.metrics?.shadeRatio,
          }), walkSelectionUrl('/home', { entry: 'representative-home', duration: representativeCourse.metrics?.durationMin ?? 30 }))
        : selectFreeWalk(walkSelectionUrl('/home', { entry: 'direct' }))}
      onCompareCourse={() => representativeCourse
        ? navigate(`/courses/compare?returnTo=%2Fhome&source=${representativeCourse.courseSource}&id=${representativeCourse.courseId}`)
        : navigate('/courses')}
      onRecommendCourse={() => navigate('/walk/time')}
      onOpenCourse={() => representativeCourse
        ? navigate(`/courses/detail?source=${representativeCourse.courseSource}&id=${representativeCourse.courseId}`)
        : navigate('/courses')}
    />
  }

  if (location.pathname === '/location-permission') {
    return <><LocationPermissionPage onRequestPermission={requestLocationPermission} />{locationError && <GpsErrorDialog onClose={() => { setLocationError(false); navigate('/home/no-course') }} onRetry={requestLocationPermission} />}</>
  }

  if (location.pathname === '/') {
    return <SplashPage onReady={() => navigate('/login')} />
  }

  if (location.pathname === '/500' || location.pathname === '/server-error') {
    return <ServerErrorPage onRetry={() => navigate('/home')} />
  }

  return <NotFoundPage onHome={() => navigate('/home')} />
}
