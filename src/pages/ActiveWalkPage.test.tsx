import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActiveWalkPage } from './ActiveWalkPage'
import { placeApiStub } from '../test/placeApiStub'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'

describe('ActiveWalkPage', () => {
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

  it('exposes the active walk controls and distance mode', () => {
    const onPause = vi.fn()
    const onStop = vi.fn()
    const onPhoto = vi.fn()
    const onDistanceModeChange = vi.fn()
    const onDistanceRadiusChange = vi.fn()
    render(
      <ActiveWalkPage
        onPause={onPause}
        onStop={onStop}
        onPhoto={onPhoto}
        onDistanceModeChange={onDistanceModeChange}
        distanceRadius={150}
        onDistanceRadiusChange={onDistanceRadiusChange}
      />,
    )

    expect(screen.getByText('00:17:00')).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: '거리두기 알림 범위' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '산책 패널 펼치기' }))
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
    const photoInput = screen.getByLabelText('산책 사진 선택')
    const photoPicker = vi.spyOn(photoInput, 'click')
    fireEvent.click(screen.getByRole('button', { name: '사진 촬영' }))
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
    expect(onPhoto).toHaveBeenCalledOnce()
    expect(photoPicker).toHaveBeenCalledOnce()
    expect(onDistanceModeChange).toHaveBeenCalledWith(false)
    expect(distanceMode).toHaveAttribute('aria-checked', 'true')
  })

  it('fits the full planned course and overlays thermal colors with direction chevrons', () => {
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

    render(
      <ActiveWalkPage
        map={{ adapter, scene }}
        plannedRouteCoordinates={coordinates}
        plannedRouteThermalSegments={[
          { lengthM: 500, temperatureGrade: 'LOW' },
          { lengthM: 500, temperatureGrade: 'VERY_HIGH' },
        ]}
      />,
    )

    const mountedScene = vi.mocked(adapter.mount).mock.calls[0][1]
    expect(mountedScene.viewFit).toEqual({
      coordinates,
      padding: [66, 20, 18, 20],
      maxZoom: 17,
    })
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

    fireEvent.click(screen.getByRole('button', { name: '장소 검색 열기' }))
    fireEvent.click(screen.getByRole('button', { name: '음식점' }))
    fireEvent.click(await screen.findByRole('button', { name: '도그라운지 성수, 620m' }))
    fireEvent.click(await screen.findByRole('button', { name: '자세히 보기' }))

    expect(screen.getByRole('dialog', { name: '도그라운지 성수 상세 정보' })).toBeInTheDocument()
    expect(container.querySelector('.walk-navigation-sheet')).toHaveClass('walk-navigation-sheet--hidden')

    fireEvent.click(screen.getByRole('button', { name: '장소 상세 닫기' }))
    expect(screen.getByRole('article', { name: '도그라운지 성수 장소 요약' })).toBeInTheDocument()
    expect(container.querySelector('.walk-navigation-sheet')).not.toHaveClass('walk-navigation-sheet--hidden')
  })
})
