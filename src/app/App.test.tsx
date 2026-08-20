import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { walkApi } from '../api/walks'
import { courseCatalogApi } from '../api/courses'
import type { CourseComparison, CourseDetail, CourseDiagnostics, CourseSummary } from '../api/courses'
import { groupApi } from '../api/groups'
import type { GroupDetail, GroupSharedCourse } from '../api/groups'
import { recommendationApi } from '../api/recommendations'
import type { CourseRecommendation } from '../api/recommendations'
import { normalizeWalkRoute } from '../features/navigation/route-normalizer'
import { readActiveWalkRoute, writeActiveWalkRoute } from '../features/navigation/route-storage'

const courseMetrics = {
  lengthM: 1800, durationMin: 45, shadeRatio: 0.68, estimatedSurfaceTempC: 34,
  referenceHour: 15, weatherSource: 'SCENARIO' as const, basisDate: '2026-08-11', confidence: 'MEDIUM' as const,
  calculatedAt: '2026-08-15T06:00:00Z', solarState: 'DAYLIGHT' as const, solarElevationDeg: 45, shadeApplicable: true,
}
const catalogCourse: CourseSummary = {
  courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', lengthM: 1800, durationMin: 45,
  loop: false, representative: true, createdAt: '2026-08-15T00:00:00Z', metrics: courseMetrics,
}
const catalogDetail: CourseDetail = {
  ...catalogCourse, segmentIds: [1, 2], route: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
}
const catalogComparison: CourseComparison = {
  courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', hasAlternative: true,
  usual: courseMetrics, alternative: { ...courseMetrics, lengthM: 1900, durationMin: 48, estimatedSurfaceTempC: 31 },
  usualRoute: catalogDetail.route,
  alternativeRoute: { type: 'LineString', coordinates: [[126.98, 37.56], [126.985, 37.565], [126.992, 37.568]] },
  temperatureImprovementC: 3, distanceDifferenceM: 100,
  swappedSections: [{ sectionIndex: 0, originalSegmentIds: [1], alternativeSegmentIds: [2], temperatureImprovementC: 3, addedLengthM: 100 }],
  unavailableReason: null,
}
const catalogDiagnostics: CourseDiagnostics = {
  courseSource: 'custom', courseId: 42, courseName: '저녁 남산길', referenceHour: 15,
  temperatureLayerBasis: 'SELECTED_REFERENCE', solarState: 'DAYLIGHT', shadeApplicable: true,
  shadeMessage: null, courseAverageSurfaceTempC: 34, hottestSurfaceTempC: 34,
  hottestSegmentId: 1, summary: '가장 뜨거운 1번 구간은 추정 34.0℃예요.',
  diagnosticMethod: 'EMPIRICAL_COUNTERFACTUAL', calculatedAt: '2026-08-15T06:00:00Z',
  segments: [{ sequence: 1, legSequence: 1, segmentId: 1, lengthM: 1800, route: catalogDetail.route,
    estimatedSurfaceTempC: 34, deviationFromCourseC: 0, temperatureGrade: 'LOW', weightedTemperatureShare: 1,
    shadeRatio: 0.68, treeShadeRatio: 0.4, buildingShadeRatio: 0.28, surfaceType: 'asphalt',
    svf: 0.4, albedo: 0.12, parkProximityM: 100, dominantFactor: 'OTHER', dominantImprovementC: 0,
    explanation: '여러 환경 요인이 함께 작용한 구간이에요.', confidence: 'MEDIUM', basisDate: '2026-08-11' }],
}
const savedWalkRecord = {
  sessionId: 27, courseName: '저녁 남산길', startedAt: '2026-08-15T09:00:00+09:00',
  endedAt: '2026-08-15T09:45:00+09:00', distanceM: 1800, durationSec: 2700,
  representative: true, loop: false, matchStatus: 'MATCHED' as const,
  dogNames: ['망고'], distanceAlertCount: 1, averageSpeedKmh: 2.4,
  routePreviewGeoJson: { type: 'LineString' as const, coordinates: [[126.98, 37.56], [126.99, 37.57]] as [number, number][] },
}
const savedWalkDetail = {
  ...savedWalkRecord,
  matchFailureReason: null,
  matchedSegmentIds: [101, 102],
  pointCount: 42,
  usablePointCount: 40,
  trackGeoJson: savedWalkRecord.routePreviewGeoJson,
  dogs: [{ dogId: 1, name: '망고', breed: '골든 리트리버' }],
}
const sharedGroupCourse: GroupSharedCourse = {
  sharedCourseId: 31, groupId: 10, sharedByUserId: 1, sharerNickname: '망고 보호자', saveCount: 2,
  sharedAt: '2026-08-18T12:00:00+09:00', course: catalogDetail,
}
const groupDetail: GroupDetail = {
  groupId: 10, name: '남산 댕댕이 산책단', description: '같이 걸어요', visibility: 'PUBLIC', joinPolicy: 'OPEN', myRole: 'OWNER', memberCount: 2,
  sharedCourseCount: 1, latestActivityAt: '2026-08-18T12:00:00+09:00', createdAt: '2026-08-18T09:00:00+09:00',
  members: [{ userId: 1, nickname: '망고 보호자', profileImageUrl: null, role: 'OWNER', joinedAt: '2026-08-18T09:00:00+09:00' }],
  recentCourses: [sharedGroupCourse],
}
const courseRecommendation: CourseRecommendation = {
  requestId: 'recommendation-35', status: 'COMPLETED', targetDurationMin: 35,
  departureAt: '2026-08-19T18:30:00+09:00', createdAt: '2026-08-19T13:00:00Z',
  savedCandidates: [],
  generatedCandidates: [{
    candidateId: 'generated-1', candidateType: 'GENERATED', courseSource: null, courseId: null,
    name: '중구 추천 순환길 A', durationMinutes: 35, distanceM: 1400, shadeRatio: 0.62,
    estimatedSurfaceTempC: 33, representative: false, withinTargetTime: true,
    shadeApplicable: true, referenceHour: 18, weatherSource: 'SCENARIO',
    route: { type: 'LineString', coordinates: [[126.997, 37.564], [126.999, 37.565], [126.997, 37.564]] },
    segmentIds: [1, 2], recommendationReasons: ['선택한 시간과 잘 맞아요'],
  }],
}

const { authResponse } = vi.hoisted(() => ({
  authResponse: {
    accessToken: 'test-access-token',
    tokenType: 'Bearer' as const,
    expiresIn: 1800,
    user: { userId: 1, email: 'mango@example.com', nickname: '망고 보호자', phoneNumber: '01012345678' },
  },
}))

vi.mock('../api/auth', () => ({
  authApi: {
    restore: vi.fn().mockRejectedValue(new Error('anonymous')),
    login: vi.fn().mockResolvedValue(authResponse),
    signup: vi.fn().mockResolvedValue(authResponse),
    logout: vi.fn().mockResolvedValue(undefined),
    checkEmail: vi.fn().mockResolvedValue(true),
    checkNickname: vi.fn().mockResolvedValue(true),
    verifyPhone: vi.fn().mockResolvedValue({ available: true, verified: true }),
  },
}))

vi.mock('../api/profile', () => ({
  profileApi: {
    listDogs: vi.fn().mockResolvedValue([
      { dogId: 1, name: '망고', breed: '골든 리트리버', birthDate: '2022-05-12', profileImageUrl: null, temperamentTags: [], gender: 'MALE', neutered: true, introduction: '', leashGreeting: 'LIKES', strangerResponse: 'NEUTRAL', touchTolerance: 'COMFORTABLE', barkingLevel: 'RARE', bitingLevel: 'NONE', isDefault: true, createdAt: '2026-08-17T00:00:00Z', updatedAt: '2026-08-17T00:00:00Z' },
      { dogId: 2, name: '쿠키', breed: '푸들', birthDate: '2024-03-18', profileImageUrl: null, temperamentTags: [], gender: 'FEMALE', neutered: false, introduction: '', leashGreeting: 'NEUTRAL', strangerResponse: 'NEUTRAL', touchTolerance: 'CONDITIONAL', barkingLevel: 'NORMAL', bitingLevel: 'NONE', isDefault: false, createdAt: '2026-08-17T00:00:00Z', updatedAt: '2026-08-17T00:00:00Z' },
    ]),
    createDog: vi.fn().mockImplementation(async (input) => ({ dogId: 3, ...input, createdAt: '2026-08-17T00:00:00Z', updatedAt: '2026-08-17T00:00:00Z' })),
    updateDog: vi.fn().mockImplementation(async (dogId, input) => ({ dogId, ...input, createdAt: '2026-08-17T00:00:00Z', updatedAt: '2026-08-17T00:00:00Z' })),
    deleteDog: vi.fn().mockResolvedValue(undefined),
    getNotifications: vi.fn().mockResolvedValue({ serviceEnabled: true, distanceEnabled: true, meetEnabled: true, groupEnabled: true }),
    updateNotifications: vi.fn().mockImplementation(async (input) => input),
    updateMe: vi.fn().mockImplementation(async (input) => ({ ...authResponse.user, ...input })),
    deactivate: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('App location permission route', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.spyOn(walkApi, 'start').mockResolvedValue({
      sessionId: 42,
      startedAt: '2026-08-14T14:30:00+09:00',
      mode: 'distance',
      lockedMode: 'distance',
    })
    vi.spyOn(walkApi, 'consentPresence').mockResolvedValue({
      sessionId: 42,
      mode: 'distance',
      consentedAt: '2026-08-14T14:30:01+09:00',
    })
    vi.spyOn(walkApi, 'changeMode').mockImplementation(async (sessionId, mode) => ({
      sessionId,
      mode,
      lockedMode: 'distance',
      changedAt: '2026-08-14T14:31:00+09:00',
    }))
    vi.spyOn(walkApi, 'state').mockResolvedValue({
      sessionId: 42,
      status: 'ACTIVE',
      startedAt: '2026-08-14T14:30:00+09:00',
      elapsedSeconds: 0,
      distanceM: 0,
      mode: 'off',
      lockedMode: null,
    })
    vi.spyOn(walkApi, 'list').mockResolvedValue([savedWalkRecord])
    vi.spyOn(walkApi, 'detail').mockResolvedValue(savedWalkDetail)
    vi.spyOn(walkApi, 'statistics').mockResolvedValue({
      month: '2026-08', dogId: null, walkCount: 1, totalDistanceM: 1800,
      totalDurationSec: 2700, averageDistanceM: 1800, averageDurationSec: 2700,
      lastWalkedAt: '2026-08-16T20:30:00+09:00',
      weekdayDistances: [{ dayOfWeek: 6, distanceM: 1800 }],
      favoriteCourse: { courseName: '저녁 남산길', walkCount: 1, averageDurationSec: 2700 },
    })
    vi.spyOn(courseCatalogApi, 'list').mockResolvedValue([catalogCourse])
    vi.spyOn(courseCatalogApi, 'detail').mockResolvedValue(catalogDetail)
    vi.spyOn(courseCatalogApi, 'setRepresentative').mockResolvedValue(catalogDetail)
    vi.spyOn(courseCatalogApi, 'delete').mockResolvedValue(undefined)
    vi.spyOn(courseCatalogApi, 'comparison').mockResolvedValue(catalogComparison)
    vi.spyOn(courseCatalogApi, 'diagnostics').mockResolvedValue(catalogDiagnostics)
    vi.spyOn(recommendationApi, 'create').mockResolvedValue(courseRecommendation)
    vi.spyOn(recommendationApi, 'get').mockResolvedValue(courseRecommendation)
    vi.spyOn(groupApi, 'list').mockResolvedValue([groupDetail])
    vi.spyOn(groupApi, 'discover').mockResolvedValue([])
    vi.spyOn(groupApi, 'create').mockResolvedValue(groupDetail)
    vi.spyOn(groupApi, 'join').mockResolvedValue(groupDetail)
    vi.spyOn(groupApi, 'joinOpen').mockResolvedValue(groupDetail)
    vi.spyOn(groupApi, 'detail').mockResolvedValue(groupDetail)
    vi.spyOn(groupApi, 'update').mockResolvedValue(groupDetail)
    vi.spyOn(groupApi, 'delete').mockResolvedValue(undefined)
    vi.spyOn(groupApi, 'leave').mockResolvedValue(undefined)
    vi.spyOn(groupApi, 'removeMember').mockResolvedValue(undefined)
    vi.spyOn(groupApi, 'issueInvite').mockResolvedValue({ groupId: 10, groupName: groupDetail.name, inviteCode: 'MUNG24', expiresAt: '2026-08-25T12:00:00+09:00' })
    vi.spyOn(groupApi, 'courses').mockResolvedValue([sharedGroupCourse])
    vi.spyOn(groupApi, 'sharedCourse').mockResolvedValue(sharedGroupCourse)
    vi.spyOn(groupApi, 'shareCourse').mockResolvedValue(sharedGroupCourse)
    vi.spyOn(groupApi, 'unshareCourse').mockResolvedValue(undefined)
    vi.spyOn(groupApi, 'saveSharedCourse').mockResolvedValue({ sharedCourseId: 31, courseSource: 'custom', courseId: 77 })
    vi.spyOn(groupApi, 'activities').mockResolvedValue([{ activityId: 1, actorUserId: 1, actorNickname: '망고 보호자', actorProfileImageUrl: null, activityType: 'COURSE_SHARED', subject: '저녁 남산길', message: '새 코스를 공유했어요', createdAt: '2026-08-18T12:00:00+09:00' }])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
    window.sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('moves from splash to the login screen', () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/')

    render(<App />)
    act(() => vi.advanceTimersByTime(1_200))

    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })

  it('moves from login to location permission after valid credentials are submitted', async () => {
    window.history.replaceState({}, '', '/login')
    render(<App />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'mango@example.com' } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'mungroute1' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(window.location.pathname).toBe('/location-permission'))
    expect(screen.getByRole('heading', { name: '산책 시작 위치를 알려주세요' })).toBeInTheDocument()
  })

  it('creates an account, offers dog onboarding, and then asks for location permission', async () => {
    window.history.replaceState({}, '', '/login')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }))

    expect(window.location.pathname).toBe('/signup')
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'mango@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '이메일 중복 확인' }))
    expect(await screen.findByText('사용 가능한 이메일이에요.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'mungroute1' } })
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '망고 보호자' } })
    fireEvent.click(screen.getByRole('button', { name: '닉네임 중복 확인' }))
    expect(await screen.findByText('사용 가능한 닉네임이에요.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('전화번호'), { target: { value: '01012345678' } })
    fireEvent.click(screen.getByRole('button', { name: '전화번호 확인' }))
    expect(await screen.findByText('전화번호 확인이 완료됐어요.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /이용약관/ }))
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    await waitFor(() => expect(window.location.pathname).toBe('/onboarding/dog'))
    expect(screen.getByRole('heading', { name: '반려견 등록' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '나중에 등록할게요' }))
    expect(window.location.pathname).toBe('/home/no-course')
    expect(screen.getByRole('dialog', { name: '위치 권한 안내' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '위치 사용 허용' })).toBeInTheDocument()
  })

  it('requests the current position after the permission CTA is pressed', () => {
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { getCurrentPosition },
    })
    window.history.replaceState({}, '', '/location-permission')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '위치 권한 확인' }))

    expect(getCurrentPosition).toHaveBeenCalledOnce()
    expect(getCurrentPosition.mock.calls[0][2]).toEqual({
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 60_000,
    })
  })

  it('moves a returning member with a representative course and a walk record to home', async () => {
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { getCurrentPosition },
    })
    window.history.replaceState({}, '', '/location-permission')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '위치 권한 확인' }))
    act(() => getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 37.5, longitude: 127 } }))

    await waitFor(() => expect(window.location.pathname).toBe('/home'))
    expect(screen.getByRole('button', { name: '산책 시작' })).toBeInTheDocument()
  })

  it.each([
    { caseName: '대표 코스가 없으면', courses: [catalogCourse].map((course) => ({ ...course, representative: false })), records: [savedWalkRecord] },
    { caseName: '산책 기록이 없으면', courses: [catalogCourse], records: [] },
  ])('$caseName no-course 홈으로 이동한다', async ({ courses, records }) => {
    vi.mocked(courseCatalogApi.list).mockResolvedValue(courses)
    vi.mocked(walkApi.list).mockResolvedValue(records)
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { getCurrentPosition },
    })
    window.history.replaceState({}, '', '/location-permission')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '위치 권한 확인' }))
    act(() => getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 37.5, longitude: 127 } }))

    await waitFor(() => expect(window.location.pathname).toBe('/home/no-course'))
    expect(screen.getByRole('button', { name: '산책 시작' })).toBeInTheDocument()
  })

  it('shows the GPS error dialog when location lookup fails', async () => {
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { getCurrentPosition },
    })
    window.history.replaceState({}, '', '/location-permission')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '위치 권한 확인' }))
    act(() => getCurrentPosition.mock.calls[0][1]())

    expect(await screen.findByRole('dialog', { name: 'GPS 오류' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '홈으로 돌아가기' }))
    expect(window.location.pathname).toBe('/home/no-course')
  })

  it('renders the representative route home screen at /home', async () => {
    window.history.replaceState({}, '', '/home')

    render(<App />)

    expect(await screen.findByRole('heading', { name: '저녁 남산길' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '산책 시작' })).toBeInTheDocument()
    expect(courseCatalogApi.diagnostics).toHaveBeenCalledWith(
      'custom',
      42,
      expect.any(String),
    )
    const detailRequestedAt = vi.mocked(courseCatalogApi.detail).mock.calls[0][2]
    const diagnosticsRequestedAt = vi.mocked(courseCatalogApi.diagnostics).mock.calls[0][2]
    expect(diagnosticsRequestedAt).toBe(detailRequestedAt)
  })

  it('renders the no-course home state at /home/no-course', () => {
    window.history.replaceState({}, '', '/home/no-course')

    render(<App />)

    expect(screen.getByRole('region', { name: '현재 위치 지도' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '저녁 남산길' })).not.toBeInTheDocument()
  })

  it.each(['/home', '/home/no-course'])('starts a direct walk from %s', (path) => {
    window.history.replaceState({}, '', path)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '산책 시작' }))

    expect(window.location.pathname).toBe('/walk/dogs')
    expect(screen.getByRole('heading', { name: '함께 산책할 반려견 선택' })).toBeInTheDocument()
  })

  it('opens the API-backed representative course detail from the home card', async () => {
    window.history.replaceState({}, '', '/home')

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /저녁 남산길/ }))

    expect(window.location.pathname).toBe('/courses/detail')
    expect(window.location.search).toBe('?source=custom&id=42')
    expect(screen.getByRole('heading', { name: '코스 상세' })).toBeInTheDocument()
  })

  it('carries the representative home course route into the active walk', async () => {
    window.history.replaceState({}, '', '/home')
    render(<App />)

    await screen.findByRole('heading', { name: '저녁 남산길' })
    fireEvent.click(screen.getByRole('button', { name: '산책 시작' }))

    expect(window.location.search).not.toContain('courseSource')
    expect(window.location.search).not.toContain('courseId')
    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    await waitFor(() => expect(window.location.pathname).toBe('/walk/active'))
    expect(screen.getByTestId('walk-route-progress')).toBeInTheDocument()
    expect(screen.getByText('저녁 남산길')).toBeInTheDocument()
  })

  it.each([
    {
      choice: 'usual',
      cardName: '나의 기존 코스',
      startName: '기존 코스로 산책 시작',
      origin: 'COMPARISON_USUAL' as const,
      routeName: '저녁 남산길',
      geometry: catalogComparison.usualRoute,
      backendId: 'custom:42',
    },
    {
      choice: 'alternative',
      cardName: '오늘의 추천 대안',
      startName: '대안 코스로 산책 시작',
      origin: 'COMPARISON_ALTERNATIVE' as const,
      routeName: '저녁 남산길 추천 대안',
      geometry: catalogComparison.alternativeRoute,
      backendId: undefined,
    },
  ])('keeps the $choice comparison geometry through final walk confirmation', async ({ choice, cardName, startName, origin, routeName, geometry, backendId }) => {
    window.history.replaceState({}, '', '/courses/compare?source=custom&id=42')
    render(<App />)

    await screen.findByRole('heading', { name: '오늘은 이 구간만 바꿔볼까요?' })
    if (choice === 'usual') fireEvent.click(screen.getByRole('button', { name: new RegExp(cardName) }))
    fireEvent.click(screen.getByRole('button', { name: startName }))

    expect(window.location.pathname).toBe('/walk/dogs')
    expect(walkApi.start).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    await waitFor(() => expect(window.location.pathname).toBe('/walk/active'))
    const active = readActiveWalkRoute()
    expect(walkApi.start).toHaveBeenCalledOnce()
    expect(active?.route).toEqual(expect.objectContaining({ origin, name: routeName, geometry, backendId }))
    expect(screen.getByText(routeName)).toBeInTheDocument()
  })

  it('keeps home course actions as separate flows', async () => {
    window.history.replaceState({}, '', '/home')
    const view = render(<App />)

    await screen.findByRole('heading', { name: '저녁 남산길' })
    fireEvent.click(screen.getByRole('button', { name: '오늘의 추천 대안 보기' }))
    expect(window.location.pathname).toBe('/courses/compare')
    fireEvent.click(screen.getByRole('button', { name: '코스 비교에서 뒤로 가기' }))
    expect(window.location.pathname).toBe('/home')

    fireEvent.click(screen.getByRole('button', { name: '새 코스 추천받기' }))
    expect(window.location.pathname).toBe('/walk/time')
    view.unmount()

    window.history.replaceState({}, '', '/home/no-course')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /지도에서 코스 그리기/ }))
    expect(window.location.pathname).toBe('/courses/draw')
  })

  it('returns from time-based course recommendations to /home', () => {
    window.history.replaceState({}, '', '/home/no-course')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /시간 맞춤 코스 추천받기/ }))
    expect(window.location.pathname).toBe('/walk/time')

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(window.location.pathname).toBe('/home')
  })

  it.each([
    ['/walk/dogs?returnTo=%2Fhome', '/home'],
    ['/walk/dogs?returnTo=%2Fcourses%2Fcompare', '/courses/compare'],
    ['/walk/dogs?returnTo=%2Fcourses%2Fcandidates', '/courses/candidates'],
    ['/walk/dogs?returnTo=%2Fcourses%2Fdetail', '/courses/detail'],
    ['/walk/dogs?returnTo=https%3A%2F%2Fevil.example', '/home/no-course'],
  ])('returns safely from %s to %s', (path, expected) => {
    window.history.replaceState({}, '', path)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '반려견 선택에서 뒤로 가기' }))
    expect(window.location.pathname).toBe(expected)
  })

  it.each([
    ['/walk/time', '오늘 몇 분 걸을까요?'],
    ['/courses/loading', '30분에 맞는 길을 찾고 있어요'],
    ['/courses/candidates', '30분 안에 걸을 수 있는 코스예요'],
    ['/courses/compare?source=custom&id=42', '오늘은 이 구간만 바꿔볼까요?'],
    ['/walk/dogs', '함께 산책할 반려견 선택'],
    ['/walk/active', '산책 중'],
    ['/walk/distance-alert', '주변 접근 알림'],
    ['/walk/paused', '산책을 잠시 멈췄어요'],
    ['/walk/complete', '산책을 마쳤어요!'],
    ['/password-reset', '비밀번호 재설정'],
    ['/courses', '내 코스'],
    ['/courses/detail?source=custom&id=42', '코스 상세'],
    ['/records', '산책 기록'],
    ['/records/detail', '산책 기록 상세'],
    ['/profile', '마이'],
    ['/profile/dogs', '반려견 관리'],
    ['/groups', '그룹'],
    ['/groups/detail?id=10', '남산 댕댕이 산책단'],
    ['/groups/courses?id=10', '공유 코스'],
    ['/groups/new', '그룹 만들기'],
    ['/groups/join', '그룹 참여'],
    ['/groups/activity?id=10', '그룹 활동'],
    ['/profile/notifications', '알림 설정'],
    ['/profile/dogs/edit', '반려견 정보'],
    ['/profile/service', '서비스 정보'],
    ['/profile/stats', '산책 통계'],
    ['/courses/shade', '그늘 시간대'],
    ['/courses/draw', '직접 코스 그리기'],
    ['/preview/system-states', '모달 · 시스템 상태'],
  ])('renders the next journey screen at %s', async (path, heading) => {
    window.history.replaceState({}, '', path)

    render(<App />)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('falls back to the system-state catalog for an unknown preview case', () => {
    window.history.replaceState({}, '', '/preview/system-states?case=unknown')

    render(<App />)

    expect(screen.getByRole('heading', { name: '모달 · 시스템 상태' })).toBeInTheDocument()
  })

  it('shows the location permission sheet from a permission-independent preview route', () => {
    window.history.replaceState({}, '', '/preview/location-permission')

    render(<App />)

    expect(screen.getByRole('dialog', { name: '위치 권한 안내' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '위치 사용 허용' })).toBeInTheDocument()
  })

  it('shows a recoverable not-found page for an unknown route', () => {
    window.history.replaceState({}, '', '/missing-page')
    render(<App />)

    expect(screen.getByRole('heading', { name: '페이지를 찾지 못했어요' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '홈으로 돌아가기' }))
    expect(window.location.pathname).toBe('/home')
  })

  it.each(['/500', '/server-error'])('shows a recoverable server-error page at %s', (path) => {
    window.history.replaceState({}, '', path)
    render(<App />)

    expect(screen.getByLabelText('500 오류')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '잠시 문제가 생겼어요' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(window.location.pathname).toBe('/home')
  })

  it('moves through profile, groups, and group creation without reloading', async () => {
    window.history.replaceState({}, '', '/profile')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /반려견 관리/ }))
    expect(window.location.pathname).toBe('/profile/dogs')

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(window.location.pathname).toBe('/profile')

    fireEvent.click(screen.getByRole('button', { name: /그룹 관리/ }))
    expect(window.location.pathname).toBe('/groups')
    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))
    expect(window.location.pathname).toBe('/groups/new')

    fireEvent.change(screen.getByLabelText('그룹 이름'), { target: { value: '남산 모임' } })
    fireEvent.click(screen.getByRole('button', { name: '그룹 만들기' }))
    await waitFor(() => expect(window.location.pathname).toBe('/groups/detail'))
    expect(window.location.search).toBe('?id=10')
  })

  it('opens group invitation and notification settings from their existing entry points', () => {
    window.history.replaceState({}, '', '/groups')
    const { unmount } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '초대 코드로 참여' }))
    expect(window.location.pathname).toBe('/groups/join')

    unmount()
    window.history.replaceState({}, '', '/profile')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /알림 설정/ }))
    expect(window.location.pathname).toBe('/profile/notifications')
  })

  it('opens dog editing, group activity, and service information from their management screens', async () => {
    window.history.replaceState({}, '', '/profile/dogs')
    const dogView = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '망고 편집' }))
    expect(window.location.pathname).toBe('/profile/dogs/edit')
    expect(screen.getByRole('heading', { name: '반려견 정보' })).toBeInTheDocument()

    dogView.unmount()
    window.history.replaceState({}, '', '/groups/detail?id=10')
    const groupView = render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: '그룹 활동 보기' }))
    expect(window.location.pathname).toBe('/groups/activity')
    expect(window.location.search).toBe('?id=10')

    groupView.unmount()
    window.history.replaceState({}, '', '/profile')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /서비스 정보/ }))
    expect(window.location.pathname).toBe('/profile/service')
  })

  it('opens profile management from the my page', () => {
    window.history.replaceState({}, '', '/profile')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '망고 프로필 관리' }))

    expect(window.location.pathname).toBe('/profile/dogs/edit')
  })

  it('opens service information details and returns to the service list', () => {
    window.history.replaceState({}, '', '/profile/service')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이용약관' }))
    expect(window.location.pathname).toBe('/profile/service')
    expect(window.location.search).toBe('?section=terms')
    expect(screen.getByRole('heading', { name: '이용약관' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    expect(window.location.pathname).toBe('/profile/service')
    expect(window.location.search).toBe('')
  })

  it('registers a dog during walk setup and returns to the selection screen after saving', async () => {
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '반려견 등록하기' }))
    expect(window.location.pathname).toBe('/profile/dogs/edit')
    expect(window.location.search).toBe('?returnTo=%2Fwalk%2Fdogs')

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '망고' } })
    fireEvent.change(screen.getByLabelText('견종'), { target: { value: '골든리트리버' } })
    fireEvent.click(screen.getByRole('button', { name: '남아' }))
    fireEvent.click(screen.getByRole('button', { name: '했어요' }))
    fireEvent.change(screen.getByLabelText('출생 연도'), { target: { value: '2022' } })
    fireEvent.change(screen.getByLabelText('출생 월'), { target: { value: '05' } })
    fireEvent.change(screen.getByLabelText('출생 일'), { target: { value: '12' } })
    fireEvent.click(within(screen.getByRole('group', { name: /목줄 인사/ })).getByRole('button', { name: '상황에 따라' }))
    fireEvent.click(within(screen.getByRole('group', { name: /낯선 사람/ })).getByRole('button', { name: '보통이에요' }))
    fireEvent.click(within(screen.getByRole('group', { name: /스킨십/ })).getByRole('button', { name: '상황에 따라' }))
    fireEvent.click(within(screen.getByRole('group', { name: /짖음 정도/ })).getByRole('button', { name: '보통이에요' }))
    fireEvent.click(within(screen.getByRole('group', { name: /입질 반응/ })).getByRole('button', { name: '없어요' }))
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }))
    await waitFor(() => expect(window.location.pathname).toBe('/walk/dogs'))
  })

  it('opens walk statistics and then the full record list', async () => {
    window.history.replaceState({}, '', '/profile')
    render(<App />)

    expect(await screen.findByText('이번 달 1회 · 1.8km')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /산책 통계/ }))
    expect(window.location.pathname).toBe('/profile/stats')
    expect(screen.getByRole('heading', { name: '산책 통계' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '기록 전체 보기' }))
    expect(window.location.pathname).toBe('/records')
  })

  it('moves from saved courses and records into their detail pages', async () => {
    window.history.replaceState({}, '', '/courses')
    const { unmount } = render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /저녁 남산길/ }))
    expect(window.location.pathname).toBe('/courses/detail')
    expect(screen.getByRole('heading', { name: '코스 상세' })).toBeInTheDocument()

    unmount()
    window.history.replaceState({}, '', '/records')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /저녁 남산길/ }))
    expect(window.location.pathname).toBe('/records/detail')
    expect(screen.getByRole('heading', { name: '산책 기록 상세' })).toBeInTheDocument()
  })

  it('shares a course after choosing a group', async () => {
    window.history.replaceState({}, '', '/courses/detail?source=custom&id=42')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: '공유하기' }))
    const dialog = screen.getByRole('dialog', { name: '코스 공유' })
    fireEvent.click(within(dialog).getByRole('button', { name: '선택한 코스 공유' }))

    expect(window.location.pathname).toBe('/groups')
    expect(window.location.search).toContain('shareSource=custom')
    fireEvent.click(await screen.findByRole('button', { name: /남산 댕댕이 산책단/ }))
    await waitFor(() => expect(window.location.pathname).toBe('/groups/detail'))
    expect(groupApi.shareCourse).toHaveBeenCalledWith(10, 'custom', 42)
  })

  it('opens record detail information instead of leaving dead rows', async () => {
    window.history.replaceState({}, '', '/records/detail?id=27')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /거리두기 알림/ }))
    expect(screen.getByRole('dialog', { name: '거리두기 알림 상세' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    fireEvent.click(screen.getByRole('button', { name: /함께한 반려견/ }))
    expect(screen.getByRole('dialog', { name: '함께한 반려견 상세' })).toBeInTheDocument()
  })

  it('shares a saved record course after choosing a group', async () => {
    window.history.replaceState({}, '', '/records/detail?id=27')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: '기록 더보기' }))
    fireEvent.click(screen.getByRole('button', { name: '그룹에 코스 공유' }))
    fireEvent.click(screen.getByRole('button', { name: '선택한 코스 공유' }))

    expect(window.location.pathname).toBe('/groups')
    expect(window.location.search).toContain('shareSource=walk')
    fireEvent.click(await screen.findByRole('button', { name: /남산 댕댕이 산책단/ }))
    await waitFor(() => expect(window.location.pathname).toBe('/groups/detail'))
    expect(groupApi.shareCourse).toHaveBeenCalledWith(10, 'walk', 27)
  })

  it('opens a shared route detail from the group room and shared list', async () => {
    window.history.replaceState({}, '', '/groups/detail?id=10')
    const view = render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: '저녁 남산길 보기' }))
    expect(window.location.pathname).toBe('/groups/course')
    expect(window.location.search).toBe('?id=10&sharedCourseId=31')

    view.unmount()
    window.history.replaceState({}, '', '/groups/courses?id=10')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /저녁 남산길 상세 보기/ }))
    expect(window.location.pathname).toBe('/groups/course')
    expect(window.location.search).toBe('?id=10&sharedCourseId=31')
  })

  it('opens direct course drawing from saved courses', () => {
    window.history.replaceState({}, '', '/courses')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '직접 코스 그리기' }))
    expect(window.location.pathname).toBe('/courses/draw')
    expect(screen.getByRole('heading', { name: '직접 코스 그리기' })).toBeInTheDocument()
  })

  it('keeps the selected duration when moving to route generation', () => {
    window.history.replaceState({}, '', '/walk/time')
    render(<App />)

    const picker = screen.getByRole('spinbutton', { name: '목표 산책 시간' })
    fireEvent.keyDown(picker, { key: 'ArrowDown' })
    fireEvent.click(screen.getByRole('button', { name: '35분 코스 보기' }))

    expect(window.location.pathname).toBe('/courses/loading')
    expect(window.location.search).toContain('?duration=35&departureAt=')
    expect(screen.getByRole('heading', { name: '35분에 맞는 길을 찾고 있어요' })).toBeInTheDocument()
  })

  it('moves from route generation to candidates with the duration preserved', async () => {
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { getCurrentPosition },
    })
    window.history.replaceState({}, '', '/courses/loading?duration=35')

    render(<App />)
    act(() => getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 37.564, longitude: 126.997 } }))

    await waitFor(() => expect(window.location.pathname).toBe('/courses/candidates'))
    expect(window.location.search).toBe('?duration=35&recommendationId=recommendation-35')
    expect(screen.getByRole('heading', { name: '35분 안에 걸을 수 있는 코스예요' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /중구 추천 순환길 A/ })).toBeInTheDocument()
  })

  it('reads the selected duration on the candidate route', () => {
    window.history.replaceState({}, '', '/courses/candidates?duration=35')

    render(<App />)

    expect(screen.getByRole('heading', { name: '35분 안에 걸을 수 있는 코스예요' })).toBeInTheDocument()
  })

  it('moves from route choice through dog selection into the active walk', async () => {
    window.history.replaceState({}, '', '/courses/candidates')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '추천 코스로 산책 시작' }))
    expect(window.location.pathname).toBe('/walk/dogs')
    expect(window.location.search).toContain('returnTo=%2Fcourses%2Fcandidates')

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))
    await waitFor(() => expect(window.location.pathname).toBe('/walk/active'))
    expect(window.location.search).toBe('')
    expect(screen.getByText('남산 둘레길 A')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '산책 중' })).toBeInTheDocument()
  })

  it('returns from dog selection to candidates and then to the duration step without reopening dog selection', () => {
    window.history.replaceState({}, '', '/courses/candidates?duration=35')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '추천 코스로 산책 시작' }))
    expect(window.location.pathname).toBe('/walk/dogs')

    fireEvent.click(screen.getByRole('button', { name: '반려견 선택에서 뒤로 가기' }))
    expect(window.location.pathname).toBe('/courses/candidates')

    fireEvent.click(screen.getByRole('button', { name: '코스 후보에서 뒤로 가기' }))
    expect(window.location.pathname).toBe('/walk/time')
    expect(window.location.search).toBe('?duration=35')
    expect(screen.getByRole('spinbutton', { name: '목표 산책 시간' })).toHaveAttribute('aria-valuenow', '35')
    expect(screen.queryByRole('heading', { name: '함께 산책할 반려견 선택' })).not.toBeInTheDocument()
  })

  it('returns from candidates to duration and then home without reopening candidates', async () => {
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', {
      ...window.navigator,
      geolocation: { getCurrentPosition },
    })
    window.history.replaceState({}, '', '/home')
    window.history.pushState({}, '', '/walk/time')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '30분 코스 보기' }))
    act(() => getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 37.564, longitude: 126.997 } }))
    await waitFor(() => expect(window.location.pathname).toBe('/courses/candidates'))

    fireEvent.click(screen.getByRole('button', { name: '코스 후보에서 뒤로 가기' }))
    await waitFor(() => expect(window.location.pathname).toBe('/walk/time'))

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }))
    await waitFor(() => expect(window.location.pathname).toBe('/home'))
    expect(screen.queryByRole('heading', { name: '30분 안에 걸을 수 있는 코스예요' })).not.toBeInTheDocument()
  })

  it('stays on dog selection and shows the API error when walk start fails', async () => {
    vi.mocked(walkApi.start).mockRejectedValueOnce(new Error('이미 진행 중인 산책이 있습니다.'))
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 진행 중인 산책이 있습니다.')
    expect(window.location.pathname).toBe('/walk/dogs')
    expect(screen.queryByRole('heading', { name: '산책 중' })).not.toBeInTheDocument()
  })

  it('continues an existing active session with the newly selected distance mode', async () => {
    vi.mocked(walkApi.start).mockResolvedValueOnce({
      sessionId: 27,
      startedAt: '2026-08-14T14:15:00+09:00',
      mode: 'distance',
      lockedMode: 'distance',
    })
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    await screen.findByRole('button', { name: '패널 높이 조절' })
    const activeSwitch = screen.getByRole('switch', { name: '거리두기 알림 모드' })
    expect(window.location.pathname).toBe('/walk/active')
    expect(activeSwitch).toHaveAttribute('aria-checked', 'true')
    expect(walkApi.start).toHaveBeenCalledWith('distance', [])
  })

  it('does not enter the active screen when the API returns a different mode', async () => {
    vi.mocked(walkApi.start).mockResolvedValueOnce({
      sessionId: 27,
      startedAt: '2026-08-14T14:15:00+09:00',
      mode: 'off',
      lockedMode: null,
    })
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('선택한 산책 모드가 적용되지 않았어요')
    expect(window.location.pathname).toBe('/walk/dogs')
  })

  it('keeps the distance mode choice during a walk and changes it only after confirmation', async () => {
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    await screen.findByRole('button', { name: '패널 높이 조절' })
    const activeSwitch = screen.getByRole('switch', { name: '거리두기 알림 모드' })
    expect(activeSwitch).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(activeSwitch)
    expect(activeSwitch).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(within(screen.getByRole('dialog', { name: '거리두기 알림 끄기 확인' })).getByRole('button', { name: '거리두기 알림 끄기' }))
    await waitFor(() => expect(activeSwitch).toHaveAttribute('aria-checked', 'false'))

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    expect(screen.getByRole('switch', { name: '거리두기 알림 모드' })).toHaveAttribute('aria-checked', 'false')
  })

  it('pauses and resumes the active walk without reloading the document', () => {
    const route = normalizeWalkRoute({
      routeKey: 'test-active-route',
      origin: 'TIME_RECOMMENDATION',
      name: '테스트 추천 코스',
      geometry: { type: 'LineString', coordinates: [[126.997, 37.564], [126.999, 37.565]] },
    })
    writeActiveWalkRoute({ sessionId: 42, route, presenceMode: null, presenceEnabled: false })
    window.history.replaceState({}, '', '/walk/active')
    render(<App />)

    expect(screen.getByTestId('walk-route-progress')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    expect(window.location.pathname).toBe('/walk/paused')
    expect(screen.getByRole('heading', { name: '산책을 잠시 멈췄어요' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '산책 재개' }))
    expect(window.location.pathname).toBe('/walk/active')
    expect(screen.getByTestId('walk-route-progress')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '산책 중' })).toBeInTheDocument()
  })

  it('restores elapsed time and distance from the active server session after refresh', async () => {
    const route = normalizeWalkRoute({
      routeKey: 'restored-active-route',
      origin: 'TIME_RECOMMENDATION',
      name: '복구 테스트 코스',
      geometry: { type: 'LineString', coordinates: [[126.997, 37.564], [126.999, 37.565]] },
    })
    writeActiveWalkRoute({
      sessionId: 42,
      startedAt: '2026-08-14T14:30:00+09:00',
      route,
      presenceMode: null,
      presenceEnabled: false,
    })
    vi.mocked(walkApi.state).mockResolvedValueOnce({
      sessionId: 42,
      status: 'ACTIVE',
      startedAt: '2026-08-14T14:30:00+09:00',
      elapsedSeconds: 367,
      distanceM: 1_234,
      mode: 'off',
      lockedMode: null,
    })
    window.history.replaceState({}, '', '/walk/active')

    render(<App />)

    expect(await screen.findByText('00:06:07')).toBeInTheDocument()
    expect(screen.getByText('1.23km')).toBeInTheDocument()
    expect(walkApi.state).toHaveBeenCalledWith(42)
  })

  it('pauses from the distance alert screen', () => {
    window.history.replaceState({}, '', '/walk/distance-alert')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))

    expect(window.location.pathname).toBe('/walk/paused')
  })

  it('finishes a paused walk and saves the completed route', () => {
    window.history.replaceState({}, '', '/walk/paused')
    render(<App />)

    expect(screen.getByRole('button', { name: '패널 높이 조절' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '산책 종료' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '산책 종료 확인' })).getByRole('button', { name: '산책 종료 확정' }))
    expect(window.location.pathname).toBe('/walk/complete')
    expect(screen.getByRole('heading', { name: '산책을 마쳤어요!' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '코스 저장하기' }))
    expect(window.location.pathname).toBe('/home')
  })
})
