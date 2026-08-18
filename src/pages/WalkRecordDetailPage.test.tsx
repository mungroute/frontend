import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WalkRecordDetail } from '../api/walks'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'
import { WalkRecordDetailPage } from './WalkRecordDetailPage'

const detail: WalkRecordDetail = {
  sessionId: 27,
  courseName: '저녁 남산길',
  startedAt: '2026-08-07T19:00:00+09:00',
  endedAt: '2026-08-07T19:31:00+09:00',
  distanceM: 2100,
  durationSec: 1860,
  representative: false,
  loop: true,
  matchStatus: 'MATCHED',
  dogNames: ['망고'],
  distanceAlertCount: 2,
  averageSpeedKmh: 4.1,
  routePreviewGeoJson: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
  matchFailureReason: null,
  matchedSegmentIds: [1, 2],
  pointCount: 42,
  usablePointCount: 40,
  trackGeoJson: { type: 'LineString', coordinates: [[126.98, 37.56], [126.99, 37.57]] },
  dogs: [{ dogId: 1, name: '망고', breed: '골든 리트리버' }],
}

describe('WalkRecordDetailPage', () => {
  it('shows the recorded route and actual detail values', () => {
    const onOpenDistanceAlerts = vi.fn()
    const onOpenDogs = vi.fn()
    render(<WalkRecordDetailPage record={detail} onOpenDistanceAlerts={onOpenDistanceAlerts} onOpenDogs={onOpenDogs} />)

    expect(screen.getByRole('heading', { name: '산책 기록 상세' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /8월 7일 금요일 산책 경로 지도/ })).toBeInTheDocument()
    expect(screen.getByText('4.1km/h')).toBeInTheDocument()
    expect(screen.getByText('접근 방향 알림 2회')).toBeInTheDocument()

    const representative = screen.getByRole('switch', { name: '대표 코스로 설정' })
    fireEvent.click(representative)
    expect(representative).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: /거리두기 알림/ }))
    fireEvent.click(screen.getByRole('button', { name: /함께한 반려견/ }))
    expect(onOpenDistanceAlerts).toHaveBeenCalledOnce()
    expect(onOpenDogs).toHaveBeenCalledOnce()
  })

  it('centers the map on the stored walk route instead of the current location', () => {
    const mount = vi.fn((container: HTMLElement, scene: BaseMapScene) => {
      void container
      void scene
      return { ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() }
    })
    const adapter: BaseMapAdapter = { mount }
    const currentLocationScene: BaseMapScene = {
      center: { latitude: 35.1796, longitude: 129.0756 },
      zoom: 17,
      markers: [{
        id: 'current-location',
        position: { latitude: 35.1796, longitude: 129.0756 },
        kind: 'current-location',
        label: '망고',
      }],
    }

    render(<WalkRecordDetailPage record={detail} map={{ adapter, scene: currentLocationScene }} />)

    const renderedScene = mount.mock.calls[0][1]
    expect(renderedScene.center).toEqual({ latitude: 37.565, longitude: 126.985 })
    expect(renderedScene.zoom).toBeGreaterThan(11)
    expect(renderedScene.markers).toEqual([
      expect.objectContaining({ id: 'walk-record-start', kind: 'start' }),
      expect.objectContaining({ id: 'walk-record-finish', kind: 'finish' }),
    ])
    expect(renderedScene.routes).toEqual([
      expect.objectContaining({ id: 'walk-record-route', coordinates: [
        { latitude: 37.56, longitude: 126.98 },
        { latitude: 37.57, longitude: 126.99 },
      ] }),
    ])
  })

  it('opens the more sheet and confirms record deletion', () => {
    const onDelete = vi.fn()
    render(<WalkRecordDetailPage record={detail} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: '기록 더보기' }))
    fireEvent.click(screen.getByRole('button', { name: /산책 기록 삭제/ }))
    const dialog = screen.getByRole('dialog', { name: '기록 삭제 확인' })
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('opens course sharing from the record more sheet', () => {
    render(<WalkRecordDetailPage record={detail} />)
    fireEvent.click(screen.getByRole('button', { name: '기록 더보기' }))
    fireEvent.click(screen.getByRole('button', { name: '그룹에 코스 공유' }))
    const shareDialog = screen.getByRole('dialog', { name: '코스 공유' })
    fireEvent.click(within(shareDialog).getByRole('button', { name: '뒤로 가기' }))
    expect(screen.getByRole('dialog', { name: '기록 더보기' })).toBeInTheDocument()
  })

  it('persists a changed course name', async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)
    render(<WalkRecordDetailPage record={detail} onRename={onRename} />)
    fireEvent.click(screen.getByRole('button', { name: '기록 더보기' }))
    fireEvent.click(screen.getByRole('button', { name: '코스 이름 변경' }))
    fireEvent.change(screen.getByRole('textbox', { name: '코스 이름' }), { target: { value: '망고 저녁 산책길' } })
    fireEvent.click(screen.getByRole('button', { name: '변경 완료' }))

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('망고 저녁 산책길'))
    expect(await screen.findByText(/망고 저녁 산책길/)).toBeInTheDocument()
  })
})
