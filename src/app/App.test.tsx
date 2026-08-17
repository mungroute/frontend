import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { walkApi } from '../api/walks'
import { courseCatalogApi } from '../api/courses'
import type { CourseComparison, CourseDetail, CourseDiagnostics, CourseSummary } from '../api/courses'

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
  usualRoute: catalogDetail.route, alternativeRoute: catalogDetail.route,
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

describe('App location permission route', () => {
  beforeEach(() => {
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
    vi.spyOn(courseCatalogApi, 'list').mockResolvedValue([catalogCourse])
    vi.spyOn(courseCatalogApi, 'detail').mockResolvedValue(catalogDetail)
    vi.spyOn(courseCatalogApi, 'setRepresentative').mockResolvedValue(catalogDetail)
    vi.spyOn(courseCatalogApi, 'delete').mockResolvedValue(undefined)
    vi.spyOn(courseCatalogApi, 'comparison').mockResolvedValue(catalogComparison)
    vi.spyOn(courseCatalogApi, 'diagnostics').mockResolvedValue(catalogDiagnostics)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
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

  it('creates a mock account, opens home, and asks for location permission', async () => {
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

    await waitFor(() => expect(window.location.pathname).toBe('/home/no-course'))
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

  it('moves to the no-course home after location lookup succeeds', async () => {
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
    ['/groups/detail', '남산 댕댕이 산책단'],
    ['/groups/courses', '공유 코스'],
    ['/groups/new', '그룹 만들기'],
    ['/groups/join', '그룹 참여'],
    ['/groups/activity', '그룹 활동'],
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

  it('moves through profile, groups, and group creation without reloading', () => {
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
    expect(window.location.pathname).toBe('/groups/detail')
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

  it('opens dog editing, group activity, and service information from their management screens', () => {
    window.history.replaceState({}, '', '/profile/dogs')
    const dogView = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '망고 편집' }))
    expect(window.location.pathname).toBe('/profile/dogs/edit')
    expect(screen.getByRole('heading', { name: '반려견 정보' })).toBeInTheDocument()

    dogView.unmount()
    window.history.replaceState({}, '', '/groups/detail')
    const groupView = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '그룹 활동 보기' }))
    expect(window.location.pathname).toBe('/groups/activity')

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

  it('registers a dog during walk setup and returns to the selection screen after saving', () => {
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '반려견 등록하기' }))
    expect(window.location.pathname).toBe('/profile/dogs/edit')
    expect(window.location.search).toBe('?returnTo=%2Fwalk%2Fdogs')

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '망고' } })
    fireEvent.change(screen.getByLabelText('견종'), { target: { value: '골든리트리버' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }))
    expect(window.location.pathname).toBe('/walk/dogs')
  })

  it('opens walk statistics and then the full record list', () => {
    window.history.replaceState({}, '', '/profile')
    render(<App />)

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
    fireEvent.click(screen.getByRole('button', { name: /8월 7일 저녁 산책/ }))
    expect(window.location.pathname).toBe('/records/detail')
    expect(screen.getByRole('heading', { name: '산책 기록 상세' })).toBeInTheDocument()
  })

  it('opens course sharing and moves to shared courses after confirmation', async () => {
    window.history.replaceState({}, '', '/courses/detail?source=custom&id=42')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: '공유하기' }))
    const dialog = screen.getByRole('dialog', { name: '코스 공유' })
    fireEvent.click(within(dialog).getByRole('button', { name: '선택한 코스 공유' }))

    expect(window.location.pathname).toBe('/groups/courses')
  })

  it('opens record detail information instead of leaving dead rows', () => {
    window.history.replaceState({}, '', '/records/detail')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /거리두기 알림/ }))
    expect(screen.getByRole('dialog', { name: '거리두기 알림 상세' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    fireEvent.click(screen.getByRole('button', { name: /함께한 반려견/ }))
    expect(screen.getByRole('dialog', { name: '함께한 반려견 상세' })).toBeInTheDocument()
  })

  it('shares a saved record course into the group course list', () => {
    window.history.replaceState({}, '', '/records/detail')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '기록 더보기' }))
    fireEvent.click(screen.getByRole('button', { name: '그룹에 코스 공유' }))
    fireEvent.click(screen.getByRole('button', { name: '선택한 코스 공유' }))

    expect(window.location.pathname).toBe('/groups/courses')
  })

  it('opens a shared route detail from the group room and shared list', () => {
    window.history.replaceState({}, '', '/groups/detail')
    const view = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '민지님이 공유한 남산 코스 보기' }))
    expect(window.location.pathname).toBe('/courses/detail')
    expect(window.location.search).toContain('id=namsan')

    view.unmount()
    window.history.replaceState({}, '', '/groups/courses')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /저녁 남산길/ }))
    expect(window.location.pathname).toBe('/courses/detail')
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
    expect(window.location.search).toBe('?duration=35')
    expect(screen.getByRole('heading', { name: '35분에 맞는 길을 찾고 있어요' })).toBeInTheDocument()
  })

  it('moves from route generation to candidates with the duration preserved', () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/courses/loading?duration=35')

    render(<App />)
    act(() => vi.advanceTimersByTime(1_600))

    expect(window.location.pathname).toBe('/courses/candidates')
    expect(window.location.search).toBe('?duration=35')
    expect(screen.getByRole('heading', { name: '35분 안에 걸을 수 있는 코스예요' })).toBeInTheDocument()
  })

  it('reads the selected duration on the candidate route', () => {
    window.history.replaceState({}, '', '/courses/candidates?duration=35')

    render(<App />)

    expect(screen.getByRole('heading', { name: '35분 안에 걸을 수 있는 코스예요' })).toBeInTheDocument()
  })

  it('moves from route choice through dog selection into the active walk', async () => {
    window.history.replaceState({}, '', '/courses/candidates')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이 코스로 산책 시작' }))
    expect(window.location.pathname).toBe('/walk/dogs')
    expect(window.location.search).toContain('returnTo=%2Fcourses%2Fcandidates')

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))
    await waitFor(() => expect(window.location.pathname).toBe('/walk/active'))
    expect(window.location.search).toContain('courseSource=saved')
    expect(window.location.search).toContain('candidateId=saved-namsan-evening')
    expect(window.location.search).toContain('entry=time-candidates')
    expect(screen.getByRole('heading', { name: '산책 중' })).toBeInTheDocument()
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

  it('continues an existing active session and restores its mode', async () => {
    vi.mocked(walkApi.start).mockResolvedValueOnce({
      sessionId: 27,
      startedAt: '2026-08-14T14:15:00+09:00',
      mode: 'off',
      lockedMode: 'distance',
    })
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    const activeSwitch = await screen.findByRole('switch', { name: '거리두기 알림 모드' })
    expect(window.location.pathname).toBe('/walk/active')
    expect(activeSwitch).toHaveAttribute('aria-checked', 'false')
    expect(walkApi.start).toHaveBeenCalledWith('distance')
  })

  it('keeps the distance mode choice during a walk and changes it only after confirmation', async () => {
    window.history.replaceState({}, '', '/walk/dogs')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '이 설정으로 산책 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 켜기' }))

    const activeSwitch = await screen.findByRole('switch', { name: '거리두기 알림 모드' })
    expect(activeSwitch).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(activeSwitch)
    expect(activeSwitch).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(within(screen.getByRole('dialog', { name: '거리두기 알림 끄기 확인' })).getByRole('button', { name: '거리두기 알림 끄기' }))
    await waitFor(() => expect(activeSwitch).toHaveAttribute('aria-checked', 'false'))

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    expect(screen.getByRole('switch', { name: '거리두기 알림 모드' })).toHaveAttribute('aria-checked', 'false')
  })

  it('pauses and resumes the active walk without reloading the document', () => {
    window.history.replaceState({}, '', '/walk/active?candidateId=generated-namsan-loop-a&courseSource=generated')
    render(<App />)

    expect(screen.getByTestId('walk-route-progress')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    expect(window.location.pathname).toBe('/walk/paused')
    expect(window.location.search).toContain('candidateId=generated-namsan-loop-a')
    expect(screen.getByRole('heading', { name: '산책을 잠시 멈췄어요' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '산책 재개' }))
    expect(window.location.pathname).toBe('/walk/active')
    expect(window.location.search).toContain('candidateId=generated-namsan-loop-a')
    expect(screen.getByTestId('walk-route-progress')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '산책 중' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: '산책 종료' }))
    expect(window.location.pathname).toBe('/walk/complete')
    expect(screen.getByRole('heading', { name: '산책을 마쳤어요!' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '코스 저장하기' }))
    expect(window.location.pathname).toBe('/home')
  })
})
