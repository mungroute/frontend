import { useEffect, useState } from 'react'
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
import { GroupActivityPage } from '../pages/GroupActivityPage'
import { ServiceInfoPage } from '../pages/ServiceInfoPage'
import type { ServiceInfoSection } from '../pages/ServiceInfoPage'
import { WalkStatisticsPage } from '../pages/WalkStatisticsPage'
import { SystemStatesPreviewPage } from '../pages/SystemStatesPreviewPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ServerErrorPage } from '../pages/ServerErrorPage'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import { GpsErrorDialog, isSystemStateCase } from '../Components/system'
import '../styles/app.css'

const readLocation = () => ({ pathname: window.location.pathname, search: window.location.search })

const readDuration = (search: string) => {
  const duration = Number(new URLSearchParams(search).get('duration'))
  return duration >= 10 && duration <= 60 && duration % 5 === 0 ? duration : 30
}

const serviceInfoSections = new Set<ServiceInfoSection>(['version', 'terms', 'privacy', 'licenses'])
const isServiceInfoSection = (value: string | null): value is ServiceInfoSection => value !== null && serviceInfoSections.has(value as ServiceInfoSection)

export function App() {
  const [location, setLocation] = useState(readLocation)
  const [locationError, setLocationError] = useState(false)
  const [distanceMode, setDistanceMode] = useState(true)
  const duration = readDuration(location.search)

  useEffect(() => {
    const syncLocation = () => setLocation(readLocation())
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])

  const navigate = (url: string) => {
    window.history.pushState({}, '', url)
    setLocation(readLocation())
  }

  const requestLocationPermission = () => {
    setLocationError(false)
    if (!navigator.geolocation) {
      setLocationError(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => navigate('/home/no-course'),
      () => setLocationError(true),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  if (location.pathname === '/preview/system-states') {
    const requestedCase = new URLSearchParams(location.search).get('case')
    return <SystemStatesPreviewPage selectedCase={isSystemStateCase(requestedCase) ? requestedCase : undefined} onSelect={(next) => navigate(next ? `/preview/system-states?case=${next}` : '/preview/system-states')} />
  }

  if (location.pathname === '/login') {
    return <LoginPage onLogin={() => navigate('/location-permission')} onSignUp={() => navigate('/signup')} />
  }

  if (location.pathname === '/signup') {
    return <SignupPage onBack={() => navigate('/login')} onSignUp={() => navigate('/login')} />
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
    const returnTo = new URLSearchParams(location.search).get('returnTo') === '/walk/dogs' ? '/walk/dogs' : '/profile/dogs'
    return <DogProfileFormPage onBack={() => navigate(returnTo)} onSave={() => navigate(returnTo)} />
  }

  if (location.pathname === '/profile/dogs') {
    return <DogManagementPage onBack={() => navigate('/profile')} onEditDog={() => navigate('/profile/dogs/edit')} onRegisterDog={() => navigate('/profile/dogs/edit')} />
  }

  if (location.pathname === '/profile') {
    return <MyPage onOpenProfile={() => navigate('/profile/dogs/edit')} onOpenStats={() => navigate('/profile/stats')} onOpenDogs={() => navigate('/profile/dogs')} onOpenGroups={() => navigate('/groups')} onOpenNotifications={() => navigate('/profile/notifications')} onOpenServiceInfo={() => navigate('/profile/service')} />
  }

  if (location.pathname === '/records/detail') {
    return <WalkRecordDetailPage onBack={() => navigate('/records')} onDelete={() => navigate('/records')} onShareCourse={() => navigate('/groups/courses')} />
  }

  if (location.pathname === '/records') {
    return <WalkRecordsPage onBack={() => navigate('/home')} onOpenRecord={() => navigate('/records/detail')} />
  }

  if (location.pathname === '/courses/detail') {
    return <CourseDetailPage onBack={() => navigate('/courses')} onStart={() => navigate('/walk/dogs')} onShare={() => navigate('/groups/courses')} />
  }

  if (location.pathname === '/courses/shade') {
    return <ShadeTimelinePage onBack={() => navigate('/courses')} onWalkAtRecommended={() => navigate('/walk/dogs')} />
  }

  if (location.pathname === '/courses/draw') {
    return <DrawCoursePage onBack={() => navigate('/courses')} onSave={() => navigate('/courses/detail')} />
  }

  if (location.pathname === '/courses') {
    return <MyCoursesPage onBack={() => navigate('/home')} onOpenCourse={() => navigate('/courses/detail')} onOpenShadeTimeline={() => navigate('/courses/shade')} onOpenDrawCourse={() => navigate('/courses/draw')} />
  }

  if (location.pathname === '/walk/distance-alert') {
    return <DistanceAlertPage distanceMode={distanceMode} onDistanceModeChange={(checked) => { setDistanceMode(checked); if (!checked) navigate('/walk/active') }} onPause={() => navigate('/walk/paused')} onStop={() => navigate('/walk/complete')} />
  }

  if (location.pathname === '/walk/complete') {
    return <WalkCompletePage onSave={() => navigate('/home')} />
  }

  if (location.pathname === '/walk/paused') {
    return <PausedWalkPage distanceMode={distanceMode} onDistanceModeChange={setDistanceMode} onResume={() => navigate('/walk/active')} onStop={() => navigate('/walk/complete')} />
  }

  if (location.pathname === '/walk/active') {
    return <ActiveWalkPage distanceMode={distanceMode} onDistanceModeChange={setDistanceMode} onPause={() => navigate('/walk/paused')} onStop={() => navigate('/walk/complete')} />
  }

  if (location.pathname === '/walk/dogs') {
    return <DogSelectionPage onConfirm={(selection) => { setDistanceMode(selection.distanceMode); navigate('/walk/active') }} onRegisterDog={() => navigate('/profile/dogs/edit?returnTo=%2Fwalk%2Fdogs')} />
  }

  if (location.pathname === '/courses/compare') {
    return <RouteComparisonPage onStartAlternative={() => navigate('/walk/dogs')} onStartUsual={() => navigate('/walk/dogs')} />
  }

  if (location.pathname === '/courses/candidates') {
    return <RouteCandidatesPage duration={duration} onConfirm={() => navigate(`/courses/compare?duration=${duration}`)} />
  }

  if (location.pathname === '/courses/loading') {
    return <RouteGeneratingPage duration={duration} onComplete={() => navigate(`/courses/candidates?duration=${duration}`)} />
  }

  if (location.pathname === '/walk/time') {
    return <WalkDurationPage onContinue={(selectedDuration) => navigate(`/courses/loading?duration=${selectedDuration}`)} />
  }

  if (location.pathname === '/home/no-course') {
    return <NoCourseHomePage onStartWalk={() => navigate('/walk/time')} />
  }

  if (location.pathname === '/home') {
    return <RepresentativeHomePage onStartWalk={() => navigate('/walk/time')} onOpenCourse={() => navigate('/courses/detail')} />
  }

  if (location.pathname === '/location-permission') {
    return <><LocationPermissionPage onRequestPermission={requestLocationPermission} />{locationError && <GpsErrorDialog onClose={() => navigate('/home/no-course')} onRetry={requestLocationPermission} />}</>
  }

  if (location.pathname === '/') {
    return <SplashPage onReady={() => navigate('/login')} />
  }

  if (location.pathname === '/500' || location.pathname === '/server-error') {
    return <ServerErrorPage onRetry={() => navigate('/home')} />
  }

  return <NotFoundPage onHome={() => navigate('/home')} />
}
