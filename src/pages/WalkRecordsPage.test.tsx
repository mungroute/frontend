import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WalkRecordSummary } from '../api/walks'
import { WalkRecordsPage } from './WalkRecordsPage'

const record = (sessionId: number, endedAt: string, name: string): WalkRecordSummary => ({
  sessionId,
  courseName: name,
  startedAt: endedAt,
  endedAt,
  distanceM: 2100,
  durationSec: 1860,
  representative: sessionId === 1,
  loop: true,
  matchStatus: 'MATCHED',
  dogNames: ['망고'],
  distanceAlertCount: 1,
  averageSpeedKmh: 4.1,
  routePreviewGeoJson: { type: 'LineString', coordinates: [[126.98, 37.56], [126.985, 37.565], [126.99, 37.56]] },
})

describe('WalkRecordsPage', () => {
  it('filters real records by month and opens the selected record', () => {
    const onOpenRecord = vi.fn()
    const now = new Date()
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const currentIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-07T20:00:00+09:00`
    const previousIso = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-21T08:00:00+09:00`
    const previousLabel = `${previous.getMonth() + 1}월`
    render(<WalkRecordsPage records={[
      record(1, currentIso, '이번 달 저녁 산책'),
      record(2, previousIso, '지난달 아침 산책'),
    ]} onOpenRecord={onOpenRecord} />)

    expect(screen.getByRole('heading', { name: '산책 기록' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '기록' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: /이번 달 저녁 산책/ }))
    expect(onOpenRecord).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: previousLabel }))
    expect(screen.getByRole('button', { name: previousLabel })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /지난달 아침 산책/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /이번 달 저녁 산책/ })).not.toBeInTheDocument()
  })
})
