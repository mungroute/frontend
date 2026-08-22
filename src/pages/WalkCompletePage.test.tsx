import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalkCompletePage } from './WalkCompletePage'
import type { BaseMapAdapter, BaseMapScene } from '../Components/map'

describe('WalkCompletePage', () => {
  it('lets the walker name and save the completed route', () => {
    const onSave = vi.fn()
    render(<WalkCompletePage onSave={onSave} />)

    expect(screen.getByRole('heading', { name: '산책을 마쳤어요!' })).toBeInTheDocument()
    expect(screen.getByText('2.1km')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '코스 이름' }), { target: { value: '아침 공원길' } })
    fireEvent.click(screen.getByRole('button', { name: '대표 코스로 설정' }))
    fireEvent.click(screen.getByRole('button', { name: '코스 저장하기' }))

    expect(onSave).toHaveBeenCalledWith({ name: '아침 공원길', representative: false })
  })

  it('shows the final time and distance measured by the frontend tracker', () => {
    render(<WalkCompletePage time="00:17:42" distance="1.24km" />)

    expect(screen.getByText('00:17:42')).toBeInTheDocument()
    expect(screen.getByText('1.24km')).toBeInTheDocument()
    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument()
  })

  it('explains GPS eligibility only when the unavailable representative option is selected', () => {
    const onSave = vi.fn()
    render(<WalkCompletePage representativeEligible={false} matchStatus="INSUFFICIENT_POINTS" onSave={onSave} />)

    expect(screen.queryByText('GPS 지점이 부족해 대표 코스로는 설정할 수 없어요.')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '대표 코스 설정 불가' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '대표 코스로 설정' }))
    expect(screen.getByRole('dialog', { name: '대표 코스 설정 불가' })).toBeInTheDocument()
    expect(screen.getByText(/정확한 GPS 지점이 두 개 이상 필요해요/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    fireEvent.click(screen.getByRole('button', { name: '코스 저장하기' }))
    expect(onSave).toHaveBeenCalledWith({ name: '저녁 남산길', representative: false })
  })

  it('explains that a walk ended away from its start can still be saved normally', () => {
    render(<WalkCompletePage representativeEligible={false} representativeUnavailableReason="incomplete-route" />)

    fireEvent.click(screen.getByRole('button', { name: '대표 코스로 설정' }))

    expect(screen.getByRole('dialog', { name: '대표 코스 설정 불가' })).toHaveTextContent('출발 지점까지 돌아오지 않은 산책이에요')
    expect(screen.getByRole('dialog', { name: '대표 코스 설정 불가' })).toHaveTextContent('일반 산책 기록으로는 저장할 수 있어요')
  })

  it('draws and fits the actual completed GPS track on the map', () => {
    const scene: BaseMapScene = { center: { latitude: 37.56, longitude: 126.98 }, zoom: 14 }
    const adapter: BaseMapAdapter = { mount: vi.fn(() => ({ ready: Promise.resolve(), update: vi.fn(), destroy: vi.fn() })) }
    const coordinates: [number, number][] = [[126.98, 37.56], [126.985, 37.565], [126.99, 37.57]]

    render(<WalkCompletePage map={{ adapter, scene }} trackGeoJson={{ type: 'LineString', coordinates }} />)

    expect(adapter.mount).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      viewFit: expect.objectContaining({
        coordinates: coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      }),
      routes: [expect.objectContaining({ id: 'walk-complete-route' })],
      markers: expect.arrayContaining([
        expect.objectContaining({ id: 'walk-complete-start' }),
        expect.objectContaining({ id: 'walk-complete-finish' }),
      ]),
    }))
  })

  it('shows backend walk errors in a dismissible modal instead of inline copy', () => {
    render(<WalkCompletePage errorMessage="이미 종료된 산책입니다." />)

    const dialog = screen.getByRole('dialog', { name: '산책 처리 안내' })
    expect(dialog).toHaveTextContent('이미 종료된 산책입니다.')
    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    expect(screen.queryByRole('dialog', { name: '산책 처리 안내' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('can leave without saving a course', () => {
    const onExitWithoutSaving = vi.fn()
    const onSave = vi.fn()
    render(<WalkCompletePage onSave={onSave} onExitWithoutSaving={onExitWithoutSaving} />)

    fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 나가기' }))

    expect(onExitWithoutSaving).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })
})
