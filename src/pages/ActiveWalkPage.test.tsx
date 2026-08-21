import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActiveWalkPage } from './ActiveWalkPage'
import { placeApiStub } from '../test/placeApiStub'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'

afterEach(() => vi.unstubAllGlobals())

describe('ActiveWalkPage', () => {
  it('explains watch notifications before requesting permission and keeps the in-app alert after later', () => {
    const requestPermission = vi.fn()
    vi.stubGlobal('Notification', class {
      static permission = 'default'
      static requestPermission = requestPermission
    })
    const onWatchSystemNotificationEnabledChange = vi.fn()
    render(
      <ActiveWalkPage
        sessionState="distance-alert"
        presenceMode="distance"
        presenceEnabled
        watchSystemNotificationEnabled
        onWatchSystemNotificationEnabledChange={onWatchSystemNotificationEnabledChange}
      />,
    )

    expect(screen.getByRole('dialog', { name: '워치에서도 알림을 받아볼까요?' })).toBeInTheDocument()
    expect(screen.getByText('알림을 허용하지 않아도 멍루트 앱 안의 거리두기 알림은 계속 표시돼요.')).toBeInTheDocument()
    expect(requestPermission).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '나중에 하기' }))
    expect(onWatchSystemNotificationEnabledChange).toHaveBeenCalledWith(false)
    expect(screen.getByRole('heading', { name: '주변 접근 알림' })).toBeInTheDocument()
  })

  it('requests system notification permission only after the watch button gesture', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('Notification', class {
      static permission = 'default'
      static requestPermission = requestPermission
    })
    const onWatchSystemNotificationEnabledChange = vi.fn()
    render(
      <ActiveWalkPage
        presenceMode="distance"
        presenceEnabled
        watchSystemNotificationEnabled
        onWatchSystemNotificationEnabledChange={onWatchSystemNotificationEnabledChange}
      />,
    )

    expect(requestPermission).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '워치 알림 받기' }))
    await waitFor(() => expect(requestPermission).toHaveBeenCalledOnce())
    expect(onWatchSystemNotificationEnabledChange).toHaveBeenCalledWith(true)
  })

  it('does not repeat the permission guide after permission was granted', () => {
    vi.stubGlobal('Notification', class {
      static permission = 'granted'
    })
    render(<ActiveWalkPage presenceMode="distance" presenceEnabled watchSystemNotificationEnabled />)
    expect(screen.queryByRole('dialog', { name: '워치에서도 알림을 받아볼까요?' })).not.toBeInTheDocument()
  })
  it('never exposes a meet profile or marker while distance mode is active', () => {
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() })),
    }
    render(
      <ActiveWalkPage
        presenceMode="distance"
        presenceEnabled
        map={{ adapter, scene: { center: { latitude: 37.564, longitude: 126.997 }, zoom: 17 } }}
        meetConnection={{
          requestId: 'request-1', lon: 126.997, lat: 37.564, updatedAt: '2026-08-20T10:00:00Z',
          profile: {
            dogName: '쿠키', breed: '푸들', ageYears: 2, profileImageUrl: '/cookie.jpg', temperamentTags: ['차분해요'],
            leashGreeting: 'LIKES', strangerResponse: 'NEUTRAL', touchTolerance: 'COMFORTABLE', barkingLevel: 'RARE', bitingLevel: 'NONE',
          },
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: '쿠키 프로필 보기' })).not.toBeInTheDocument()
    expect(vi.mocked(adapter.mount).mock.calls[0][1].markers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'meet-friend' }),
    ]))
  })

  it('draws the selected course and the walked trail in the fallback map', () => {
    const { container } = render(
      <ActiveWalkPage
        plannedRouteCoordinates={[
          { latitude: 37.56, longitude: 126.996 },
          { latitude: 37.559, longitude: 126.998 },
          { latitude: 37.558, longitude: 126.997 },
        ]}
        walkedCoordinates={[
          { latitude: 37.56, longitude: 126.996 },
          { latitude: 37.5595, longitude: 126.997 },
        ]}
      />,
    )

    expect(screen.getByTestId('walk-route-progress')).toBeInTheDocument()
    expect(container.querySelector('.active-walk-page__route-planned')).toBeInTheDocument()
    expect(container.querySelector('.active-walk-page__route-walked')).toBeInTheDocument()
  })

  it('lets meet mode control the actual friend search radius', () => {
    const onDistanceRadiusChange = vi.fn()
    render(
      <ActiveWalkPage
        presenceMode="meet"
        presenceEnabled
        distanceRadius={200}
        onDistanceRadiusChange={onDistanceRadiusChange}
      />,
    )

    const meetRange = screen.getByRole('slider', { name: '산책 친구 찾기 범위' })
    expect(meetRange).toHaveValue('200')
    expect(screen.getByText('산책 친구 찾기 범위')).toBeInTheDocument()
    fireEvent.change(meetRange, { target: { value: '350' } })
    expect(onDistanceRadiusChange).toHaveBeenCalledWith(350)
  })

  it('lets the user toggle navigation voice directly during a routed walk', () => {
    const onNavigationVoiceEnabledChange = vi.fn()
    render(
      <ActiveWalkPage
        plannedRouteCoordinates={[
          { latitude: 37.56, longitude: 126.996 },
          { latitude: 37.559, longitude: 126.998 },
        ]}
        navigationVoiceEnabled
        onNavigationVoiceEnabledChange={onNavigationVoiceEnabledChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '전체 경로 2D로 보기' }))
    const voiceToggle = screen.getByRole('button', { name: '내비게이션 음성 안내 끄기' })
    expect(voiceToggle).toHaveAttribute('aria-pressed', 'true')
    expect(voiceToggle).not.toHaveTextContent('음성 ON')
    expect(voiceToggle.querySelector('svg')).toBeInTheDocument()
    fireEvent.click(voiceToggle)
    expect(onNavigationVoiceEnabledChange).toHaveBeenCalledWith(false)
  })

  it('explains when the development TTS test is unsupported instead of failing silently', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    vi.stubGlobal('SpeechSynthesisUtterance', undefined)
    render(<ActiveWalkPage />)

    fireEvent.click(screen.getByRole('button', { name: '음성 안내 테스트' }))

    expect(screen.getByText('이 브라우저는 음성 안내를 지원하지 않아요.')).toHaveAttribute('role', 'status')
  })

  it('exposes the active walk controls and distance mode', () => {
    const onPause = vi.fn()
    const onStop = vi.fn()
    const onNavigationVoiceEnabledChange = vi.fn()
    const onDistanceModeChange = vi.fn()
    const onDistanceRadiusChange = vi.fn()
    render(
      <ActiveWalkPage
        onPause={onPause}
        onStop={onStop}
        navigationVoiceEnabled
        onNavigationVoiceEnabledChange={onNavigationVoiceEnabledChange}
        onDistanceModeChange={onDistanceModeChange}
        distanceRadius={150}
        onDistanceRadiusChange={onDistanceRadiusChange}
      />,
    )

    expect(screen.getByText('00:17:00')).toBeInTheDocument()
    const distanceRange = screen.getByRole('slider', { name: '거리두기 알림 범위' })
    expect(distanceRange).toHaveValue('150')
    fireEvent.change(distanceRange, { target: { value: '300' } })
    expect(onDistanceRadiusChange).toHaveBeenCalledWith(300)
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    fireEvent.click(screen.getByRole('button', { name: '산책 종료' }))
    const endDialog = screen.getByRole('dialog', { name: '산책 종료 확인' })
    expect(endDialog).toBeInTheDocument()
    expect(onStop).not.toHaveBeenCalled()
    fireEvent.click(within(endDialog).getByRole('button', { name: '산책 종료 확정' }))
    fireEvent.click(screen.getByRole('button', { name: '내비게이션 음성 안내 끄기' }))
    const distanceMode = screen.getByRole('switch', { name: '거리두기 알림 모드' })
    fireEvent.click(distanceMode)

    const distanceModeDialog = screen.getByRole('dialog', { name: '거리두기 알림 끄기 확인' })
    expect(distanceMode).toHaveAttribute('aria-checked', 'true')
    expect(onDistanceModeChange).not.toHaveBeenCalled()
    fireEvent.click(within(distanceModeDialog).getByRole('button', { name: '계속 사용' }))
    expect(onDistanceModeChange).not.toHaveBeenCalled()
    expect(distanceMode).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(distanceMode)
    fireEvent.click(within(screen.getByRole('dialog', { name: '거리두기 알림 끄기 확인' })).getByRole('button', { name: '거리두기 알림 끄기' }))

    expect(onPause).toHaveBeenCalledOnce()
    expect(onStop).toHaveBeenCalledOnce()
    expect(onNavigationVoiceEnabledChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('button', { name: '사진 촬영' })).not.toBeInTheDocument()
    expect(onDistanceModeChange).toHaveBeenCalledWith(false)
    expect(distanceMode).toHaveAttribute('aria-checked', 'true')
  })

  it('focuses the route start in its travel direction and overlays thermal colors with direction chevrons', () => {
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() })),
    }
    const scene: BaseMapScene = {
      center: { latitude: 37.564, longitude: 126.997 },
      zoom: 17,
    }
    const coordinates = [
      { latitude: 37.561, longitude: 126.994 },
      { latitude: 37.566, longitude: 127.001 },
    ]

    const { container } = render(
      <ActiveWalkPage
        map={{ adapter, scene }}
        plannedRouteCoordinates={coordinates}
        plannedRouteThermalSegments={[
          { lengthM: 500, temperatureGrade: 'LOW' },
          { lengthM: 500, temperatureGrade: 'VERY_HIGH' },
        ]}
      />,
    )

    expect(container.querySelector('.active-walk-page__sheet')).toHaveClass('ui-draggable-sheet')
    expect(screen.getByRole('button', { name: '패널 높이 조절' })).toBeInTheDocument()

    const mountedScene = vi.mocked(adapter.mount).mock.calls[0][1]
    expect(mountedScene).toEqual(expect.objectContaining({
      center: coordinates[0],
      zoom: 18,
      bearing: expect.any(Number),
      focusAnchorY: 0.68,
      focusBottomInset: 0,
      focusOffsetY: 0,
      viewFit: undefined,
    }))
    const thermalColors = new Set(mountedScene.routes
      ?.filter((route) => route.id.startsWith('planned-course-thermal-'))
      .map((route) => route.color))
    expect(thermalColors.size).toBeGreaterThan(1)
    expect(thermalColors.has('#9f9c97')).toBe(false)
    expect(mountedScene.routes?.some((route) => route.chevrons)).toBe(true)
  })

  it('removes the screen-positioned fallback route once the map provider is ready', async () => {
    const adapter: BaseMapAdapter = {
      mount: vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() })),
    }
    const { container } = render(
      <ActiveWalkPage
        map={{
          adapter,
          scene: { center: { latitude: 37.564, longitude: 126.997 }, zoom: 17 },
        }}
        plannedRouteCoordinates={[
          { latitude: 37.563, longitude: 126.996 },
          { latitude: 37.565, longitude: 126.999 },
        ]}
      />,
    )

    await waitFor(() => expect(container.querySelector('.base-map-viewport__fallback-overlay')).not.toBeInTheDocument())
  })

  it('moves the walk panel away while the selected place card expands', async () => {
    const { container } = render(<ActiveWalkPage placeApi={placeApiStub} />)

    fireEvent.click(screen.getByRole('button', { name: '전체 경로 2D로 보기' }))
    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    fireEvent.click(screen.getByRole('button', { name: '음식점' }))
    fireEvent.click(await screen.findByRole('button', { name: '도그라운지 성수, 620m' }))
    fireEvent.click(await screen.findByRole('button', { name: '자세히 보기' }))

    expect(screen.getByRole('dialog', { name: '도그라운지 성수 상세 정보' })).toBeInTheDocument()
    expect(container.querySelector('.active-walk-page__sheet-motion')).toHaveAttribute('data-place-detail', 'open')

    fireEvent.click(within(screen.getByRole('dialog', { name: '도그라운지 성수 상세 정보' })).getByRole('button', { name: '닫기' }))
    expect(screen.getByRole('article', { name: '도그라운지 성수 장소 요약' })).toBeInTheDocument()
    expect(container.querySelector('.active-walk-page__sheet-motion')).toHaveAttribute('data-place-detail', 'closed')
  })

  it('anchors the place preview to the draggable walk sheet position', () => {
    render(<ActiveWalkPage />)

    fireEvent.click(screen.getByRole('button', { name: '전체 경로 2D로 보기' }))

    const searchRegion = screen.getByRole('region', { name: '지도 장소 검색' })
    expect(searchRegion.style.getPropertyValue('--place-preview-bottom'))
      .toContain('--map-sheet-top')
  })

  it('shows place search only in the 2D route overview and returns to navigation', () => {
    render(<ActiveWalkPage placeApi={placeApiStub} />)

    expect(screen.queryByRole('button', { name: '장소 검색 열기' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '전체 경로 2D로 보기' }))

    expect(screen.getByRole('button', { name: '장소 검색 열기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^내 위치로$/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^내 위치로$/ }))

    expect(screen.queryByRole('button', { name: '장소 검색 열기' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '전체 경로 2D로 보기' })).toBeInTheDocument()
  })
})
