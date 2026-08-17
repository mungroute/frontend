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
import { DistanceAlertPage } from '../pages/DistanceAlertPage'
import { PausedWalkPage } from '../pages/PausedWalkPage'
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
import { ShadeTimelinePage } from '../pages/ShadeTimelinePage'
import { DrawCoursePage } from '../pages/DrawCoursePage'
import { DogProfileFormPage } from '../pages/DogProfileFormPage'
import type { DogProfileFormValue } from '../pages/DogProfileFormPage'
import type { DogProfileSummary } from '../Components/profile/DogProfileCard'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../Components/profile/DogProfileCard'
import { GroupActivityPage } from '../pages/GroupActivityPage'
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
import { getCourseRouteCoordinates } from '../Components/courses/course-data'
import { walkApi } from '../api/walks'
import type { LockedWalkPresenceMode, NearbyPresence, PresenceUpdatePayload, PresenceUpdateResult, WalkEndResult, WalkPresenceMode, WalkRecordDetail, WalkRecordSummary } from '../api/walks'
import { getValidAccessToken } from '../api/http'
import { connectPresenceSocket } from '../api/presenceSocket'
import type { PresenceSocketClient } from '../api/presenceSocket'
import { authApi } from '../api/auth'
import type { AuthUser } from '../api/auth'
import { courseCatalogApi } from '../api/courses'
import type { CourseDetail, CourseSource } from '../api/courses'

const allowedWalkReturnPaths = new Set(['/home', '/home/no-course', '/courses/compare', '/courses/candidates', '/courses/detail'])

const readWalkReturnTo = (search: string) => {
  const requested = new URLSearchParams(search).get('returnTo')
  return requested && allowedWalkReturnPaths.has(requested) ? requested : '/home/no-course'
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

const initialDogs: AppDog[] = [
  { id: 'mango', name: '망고', detail: '골든 리트리버 · 4살', breed: '골든 리트리버', birthDate: '2022-05-12', isDefault: true, profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE },
  { id: 'cookie', name: '쿠키', detail: '푸들 · 2살', breed: '푸들', birthDate: '2024-03-18', isDefault: false, profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE },
]

export function App() {
  const [location, setLocation] = useState(readLocation)
  const [locationError, setLocationError] = useState(false)
  const [showSignupLocationPermission, setShowSignupLocationPermission] = useState(false)
  const [walkPresenceMode, setWalkPresenceMode] = useState<LockedWalkPresenceMode | null>('distance')
  const [presenceEnabled, setPresenceEnabled] = useState(true)
  const [distanceRadius, setDistanceRadius] = useState(100)
  const [dogs, setDogs] = useState<AppDog[]>(initialDogs)
  const [selectedDogIds, setSelectedDogIds] = useState<string[]>([initialDogs[0].id])
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser>()
  const [backendWalkStarted, setBackendWalkStarted] = useState(false)
  const [walkStarting, setWalkStarting] = useState(false)
  const [walkEndResult, setWalkEndResult] = useState<WalkEndResult>()
  const [walkApiError, setWalkApiError] = useState<string>()
  const [nearbyPresence, setNearbyPresence] = useState<NearbyPresence>()
  const [walkRecords, setWalkRecords] = useState<WalkRecordSummary[]>()
  const [selectedWalkRecord, setSelectedWalkRecord] = useState<WalkRecordDetail>()
  const [representativeCourse, setRepresentativeCourse] = useState<CourseDetail>()
  const walkSessionIdRef = useRef<number | undefined>(undefined)
  const walkStartedAtRef = useRef<string | undefined>(undefined)
  const walkStartPromiseRef = useRef<Promise<number> | undefined>(undefined)
  const walkEndPromiseRef = useRef<Promise<WalkEndResult> | undefined>(undefined)
  const presenceSocketRef = useRef<PresenceSocketClient | undefined>(undefined)
  const { requestCurrentLocation, setCurrentLocationMarker } = useMapLocation()
  const duration = readDuration(location.search)
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
      if (!presenceEnabled || walkPresenceMode !== 'distance') return
      const sessionPromise = walkSessionIdRef.current
        ? Promise.resolve(walkSessionIdRef.current)
        : walkStartPromiseRef.current
      if (!sessionPromise) return
      void sessionPromise
        .then((sessionId) => {
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
          if (presenceSocketRef.current?.send(payload)) return undefined
          return walkApi.updatePresence(payload)
        })
        .then((response) => { if (response) applyPresenceResponse(response) })
        .catch(() => undefined)
    },
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
    if (['/login', '/signup', '/password-reset'].includes(window.location.pathname)) return
    void authApi.restore()
      .then((response) => setAuthenticatedUser(response.user))
      .catch(() => setAuthenticatedUser(undefined))
  }, [])

  useEffect(() => {
    if (location.pathname !== '/records') return
    void walkApi.list()
      .then(setWalkRecords)
      .catch(() => undefined)
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/records/detail') return
    const sessionId = Number(new URLSearchParams(location.search).get('id'))
    if (!Number.isSafeInteger(sessionId) || sessionId < 1) return
    void walkApi.detail(sessionId)
      .then(setSelectedWalkRecord)
      .catch(() => setSelectedWalkRecord(undefined))
  }, [location.pathname, location.search])

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

  const navigate = (url: string) => {
    window.history.pushState({}, '', url)
    setLocation(readLocation())
  }

  const beginWalk = async (url: string, mode: WalkPresenceMode = 'off') => {
    walkTracker.reset()
    setWalkEndResult(undefined)
    setWalkApiError(undefined)
    setNearbyPresence(undefined)
    setBackendWalkStarted(false)
    setWalkStarting(true)
    walkSessionIdRef.current = undefined
    walkStartedAtRef.current = undefined
    const pending = walkApi.start(mode).then(async ({ sessionId, startedAt, mode: activeMode, lockedMode }) => {
      walkSessionIdRef.current = sessionId
      walkStartedAtRef.current = startedAt
      const resolvedLockedMode = lockedMode ?? (activeMode === 'off' ? null : activeMode)
      setWalkPresenceMode(resolvedLockedMode)
      setPresenceEnabled(activeMode !== 'off')
      if (activeMode !== 'off') {
        await walkApi.consentPresence(sessionId)
      }
      return sessionId
    })
    walkStartPromiseRef.current = pending
    try {
      await pending
      setBackendWalkStarted(true)
      navigate(url)
    } catch (error) {
      walkStartPromiseRef.current = undefined
      setWalkApiError(error instanceof Error ? error.message : '산책을 시작하지 못했습니다.')
    } finally {
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
    if (!enabled) setNearbyPresence(undefined)
    void sessionPromise
      .then((sessionId) => walkApi.changeMode(sessionId, nextMode)
        .then(async (response) => {
          if (enabled) await walkApi.consentPresence(sessionId)
          setWalkPresenceMode(response.lockedMode ?? walkPresenceMode)
          setPresenceEnabled(response.mode !== 'off')
        }))
      .catch((error: Error) => setWalkApiError(error.message))
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
      .then(() => navigate('/home/no-course'))
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

  if (location.pathname === '/preview/system-states') {
    const requestedCase = new URLSearchParams(location.search).get('case')
    return <SystemStatesPreviewPage selectedCase={isSystemStateCase(requestedCase) ? requestedCase : undefined} onSelect={(next) => navigate(next ? `/preview/system-states?case=${next}` : '/preview/system-states')} />
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
        navigate('/home/no-course')
        setShowSignupLocationPermission(true)
      }}
    />
  }

  if (location.pathname === '/password-reset') {
    return <PasswordResetPage onBack={() => navigate('/login')} onComplete={() => navigate('/login')} />
  }

  if (location.pathname === '/groups/join') {
    return <JoinGroupPage onBack={() => navigate('/groups')} onConfirm={() => navigate('/groups/detail')} />
  }

  if (location.pathname === '/groups/new') {
    return <CreateGroupPage onBack={() => navigate('/groups')} onCreate={() => navigate('/groups/detail')} />
  }

  if (location.pathname === '/groups/courses') {
    return <SharedCoursesPage onBack={() => navigate('/groups/detail')} onOpenCourse={(title) => navigate(`/courses/detail?source=group&title=${encodeURIComponent(title)}`)} />
  }

  if (location.pathname === '/groups/activity') {
    return <GroupActivityPage onBack={() => navigate('/groups/detail')} />
  }

  if (location.pathname === '/groups/detail') {
    return <GroupRoomPage onBack={() => navigate('/groups')} onOpenSharedCourse={(id) => navigate(`/courses/detail?source=group&id=${id}`)} onOpenActivity={() => navigate('/groups/activity')} onShareCourse={() => navigate('/groups/courses')} />
  }

  if (location.pathname === '/groups') {
    return <GroupListPage onBack={() => navigate('/profile')} onCreateGroup={() => navigate('/groups/new')} onJoinGroup={() => navigate('/groups/join')} onOpenGroup={() => navigate('/groups/detail')} />
  }

  if (location.pathname === '/profile/notifications') {
    return <NotificationSettingsPage onBack={() => navigate('/profile')} />
  }

  if (location.pathname === '/profile/service') {
    const section = new URLSearchParams(location.search).get('section')
    const selectedSection = isServiceInfoSection(section) ? section : undefined
    return <ServiceInfoPage selectedSection={selectedSection} onBack={() => navigate(selectedSection ? '/profile/service' : '/profile')} onOpen={(nextSection) => navigate(`/profile/service?section=${nextSection}`)} />
  }

  if (location.pathname === '/profile/stats') {
    return <WalkStatisticsPage onBack={() => navigate('/profile')} onOpenRecords={() => navigate('/records')} />
  }

  if (location.pathname === '/profile/dogs/edit') {
    const params = new URLSearchParams(location.search)
    const returnTo = params.get('returnTo') === '/walk/dogs' ? '/walk/dogs' : '/profile/dogs'
    const editingId = params.get('id')
    const editingDog = dogs.find((dog) => dog.id === editingId)
    const initialDog = editingDog
      ? { name: editingDog.name, breed: editingDog.breed, birthDate: editingDog.birthDate, isDefault: editingDog.isDefault, profileImageSrc: editingDog.profileImageSrc }
      : { name: '', breed: '', birthDate: '2022-05-12', isDefault: dogs.length === 0, profileImageSrc: DEFAULT_DOG_PROFILE_IMAGE }
    return <DogProfileFormPage initialDog={initialDog} onBack={() => navigate(returnTo)} onSave={(value) => {
      const id = editingDog?.id ?? `dog-${Date.now()}`
      const savedDog: AppDog = { id, ...value, detail: value.breed }
      setDogs((current) => {
        const updated = editingDog ? current.map((dog) => dog.id === id ? savedDog : dog) : [...current, savedDog]
        return value.isDefault ? updated.map((dog) => ({ ...dog, isDefault: dog.id === id })) : updated
      })
      if (!editingDog) setSelectedDogIds([id])
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
      onOpenProfile={() => navigate(defaultDog ? `/profile/dogs/edit?id=${encodeURIComponent(defaultDog.id)}` : '/profile/dogs/edit')}
      onOpenStats={() => navigate('/profile/stats')}
      onOpenDogs={() => navigate('/profile/dogs')}
      onOpenGroups={() => navigate('/groups')}
      onOpenNotifications={() => navigate('/profile/notifications')}
      onOpenServiceInfo={() => navigate('/profile/service')}
      onLogout={() => { void authApi.logout().finally(() => { setAuthenticatedUser(undefined); navigate('/login') }) }}
    />
  }

  if (location.pathname === '/records/detail') {
    return <WalkRecordDetailPage
      record={selectedWalkRecord}
      onBack={() => navigate('/records')}
      onRepresentativeChange={(representative) => {
        if (!selectedWalkRecord) return
        void walkApi.setRepresentative(selectedWalkRecord.sessionId, representative)
          .then(setSelectedWalkRecord)
          .catch((error: Error) => setWalkApiError(error.message))
      }}
      onDelete={() => {
        if (!selectedWalkRecord) {
          navigate('/records')
          return
        }
        void walkApi.delete(selectedWalkRecord.sessionId)
          .then(() => navigate('/records'))
          .catch((error: Error) => setWalkApiError(error.message))
      }}
      onShareCourse={() => navigate('/groups/courses')}
    />
  }

  if (location.pathname === '/records') {
    return <WalkRecordsPage records={walkRecords} onBack={() => navigate('/home')} onOpenRecord={(id) => navigate(`/records/detail?id=${id}`)} />
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
      onStart={(course) => navigate(walkSelectionUrl('/courses/detail', { entry: 'course-detail', courseSource: course.courseSource, courseId: course.courseId, duration: course.metrics?.durationMin ?? 30 }))}
      onCompare={(course) => navigate(`/courses/compare?returnTo=%2Fcourses%2Fdetail&source=${course.courseSource}&id=${course.courseId}`)}
      onDeleted={() => navigate('/courses')}
      onShare={() => navigate('/groups/courses')}
    />
  }

  if (location.pathname === '/courses/shade') {
    return <ShadeTimelinePage onBack={() => navigate('/courses')} onWalkAtRecommended={() => navigate('/walk/dogs')} />
  }

  if (location.pathname === '/courses/draw') {
    return <DrawCoursePage onBack={() => navigate('/courses')} onSave={(course) => navigate(`/courses/detail?source=${course.courseSource}&id=${course.courseId}`)} />
  }

  if (location.pathname === '/courses') {
    return <MyCoursesPage onBack={() => navigate('/home')} onOpenCourse={(source, courseId) => navigate(`/courses/detail?source=${source}&id=${courseId}`)} onOpenShadeTimeline={() => navigate('/courses/shade')} onOpenDrawCourse={() => navigate('/courses/draw')} />
  }

  if (location.pathname === '/walk/distance-alert') {
    return <DistanceAlertPage alert={nearbyPresence} time={walkTracker.formattedTime} distance={walkTracker.formattedDistance} distanceMode={presenceEnabled} onDistanceModeChange={(enabled) => { changePresenceEnabled(enabled); if (!enabled) navigate(`/walk/active${location.search}`) }} onPause={() => pauseWalk(`/walk/paused${location.search}`)} onStop={endWalk} />
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
          .then(() => { setBackendWalkStarted(false); navigate('/home') })
          .catch((error: Error) => setWalkApiError(error.message))
      }}
    />
  }

  if (location.pathname === '/walk/paused') {
    return <PausedWalkPage time={walkTracker.formattedTime} distance={walkTracker.formattedDistance} presenceMode={walkPresenceMode} presenceEnabled={presenceEnabled} onPresenceEnabledChange={changePresenceEnabled} onResume={() => resumeWalk(`/walk/active${location.search}`)} onStop={endWalk} />
  }

  if (location.pathname === '/walk/active') {
    const params = new URLSearchParams(location.search)
    const selectedCourseId = params.get('candidateId') ?? params.get('courseId')
    return <ActiveWalkPage time={walkTracker.formattedTime} distance={walkTracker.formattedDistance} plannedRouteCoordinates={getCourseRouteCoordinates(selectedCourseId)} walkedCoordinates={walkTracker.walkedCoordinates} gpsSignal={walkApiError ? 'error' : walkTracker.gpsSignal} presenceMode={walkPresenceMode} presenceEnabled={presenceEnabled} onPresenceEnabledChange={changePresenceEnabled} distanceRadius={distanceRadius} onDistanceRadiusChange={setDistanceRadius} onPause={() => pauseWalk(`/walk/paused${location.search}`)} onStop={endWalk} />
  }

  if (location.pathname === '/walk/dogs') {
    return <DogSelectionPage dogs={dogs} starting={walkStarting} errorMessage={walkApiError} onBack={() => navigate(readWalkReturnTo(location.search))} onConfirm={(selection) => { setSelectedDogIds(selection.dogIds); setWalkPresenceMode(selection.mode === 'off' ? null : selection.mode); setPresenceEnabled(selection.mode !== 'off'); void beginWalk(`/walk/active${location.search}`, selection.mode) }} onRegisterDog={() => navigate('/profile/dogs/edit?returnTo=%2Fwalk%2Fdogs')} />
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
      onStartAlternative={(comparison) => navigate(walkSelectionUrl('/courses/compare', { entry: 'course-comparison', courseSource: 'generated', candidateId: `${comparison.courseSource}-${comparison.courseId}-alternative`, duration: comparison.alternative?.durationMin ?? comparison.usual.durationMin }))}
      onStartUsual={(comparison) => navigate(walkSelectionUrl('/courses/compare', { entry: 'course-comparison', courseSource: comparison.courseSource, courseId: comparison.courseId, duration: comparison.usual.durationMin }))}
    />
  }

  if (location.pathname === '/courses/candidates') {
    return <RouteCandidatesPage duration={duration} onConfirm={(candidate) => navigate(walkSelectionUrl('/courses/candidates', { entry: 'time-candidates', courseSource: candidate.source, candidateId: candidate.id, duration: candidate.durationMinutes }))} />
  }

  if (location.pathname === '/courses/loading') {
    return <RouteGeneratingPage duration={duration} onComplete={() => navigate(`/courses/candidates?duration=${duration}`)} />
  }

  if (location.pathname === '/walk/time') {
    return <WalkDurationPage onContinue={(selectedDuration) => navigate(`/courses/loading?duration=${selectedDuration}`)} />
  }

  if (location.pathname === '/home/no-course') {
    return <>
      <NoCourseHomePage onStartWalk={() => navigate(walkSelectionUrl('/home/no-course', { entry: 'direct' }))} onDrawCourse={() => navigate('/courses/draw')} onRecommendCourse={() => navigate('/walk/time')} />
      {showSignupLocationPermission && <LocationPermissionSheet onClose={() => setShowSignupLocationPermission(false)} onAllow={requestSignupLocation} />}
      {locationError && <GpsErrorDialog onClose={() => setLocationError(false)} onRetry={requestSignupLocation} />}
    </>
  }

  if (location.pathname === '/home') {
    return <RepresentativeHomePage
      course={representativeCourse}
      onStartWalk={() => representativeCourse
        ? navigate(walkSelectionUrl('/home', { entry: 'representative-home', courseSource: representativeCourse.courseSource, courseId: representativeCourse.courseId, duration: representativeCourse.metrics?.durationMin ?? 30 }))
        : navigate(walkSelectionUrl('/home', { entry: 'direct' }))}
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
