import { useState } from 'react'
import { FilterChip, HomeBottomNavigation, ManagementPageHeader } from '../Components/ui'
import type { WalkRecordSummary } from '../api/walks'
import '../styles/pages/journey-page.css'
import '../styles/pages/management-pages.css'

const fallbackRecords = [
  { id: 'august-7-evening', month: '이번 달', title: '8월 7일 저녁 산책', metrics: '31분 · 2.1km', detail: '망고 · 거리두기 1회', image: '/assets/r01/route-orange.svg' },
  { id: 'august-5-morning', month: '이번 달', title: '8월 5일 아침 산책', metrics: '22분 · 1.4km', detail: '망고 · 맑음', image: '/assets/r01/route-green.svg' },
  { id: 'august-2-park', month: '이번 달', title: '8월 2일 공원 산책', metrics: '48분 · 3.2km', detail: '망고, 쿠키 · 그늘 72%', image: '/assets/r01/route-green.svg' },
]

type WalkRecordsPageProps = {
  records?: WalkRecordSummary[]
  onBack?: () => void
  onOpenRecord?: (id: string | number) => void
}

const formatDuration = (durationSec: number) => `${Math.max(1, Math.round(durationSec / 60))}분`
const formatDistance = (distanceM: number) => `${(distanceM / 1000).toFixed(1)}km`

export function WalkRecordsPage({ records, onBack, onOpenRecord }: WalkRecordsPageProps) {
  const [month, setMonth] = useState('이번 달')
  const visibleRecords = records === undefined
    ? fallbackRecords.filter((record) => record.month === month)
    : records.map((record) => ({
      id: record.sessionId,
      title: record.courseName,
      metrics: `${formatDuration(record.durationSec)} · ${formatDistance(record.distanceM)}`,
      detail: record.representative ? '대표 코스' : new Date(record.endedAt).toLocaleDateString('ko-KR'),
      image: '/assets/r01/route-orange.svg',
    }))

  return (
    <main className="journey-page management-page walk-records-page">
      <ManagementPageHeader title="산책 기록" subtitle="망고와 걸은 시간을 모아봤어요" onBack={onBack} />

      <div className="management-page__chips ui-chip-row" aria-label="기록 월 필터">
        {['이번 달', '7월', '6월'].map((label) => (
          <FilterChip key={label} selected={month === label} variant="soft" onClick={() => setMonth(label)}>{label}</FilterChip>
        ))}
      </div>

      <div className="walk-records-page__list">
        {visibleRecords.map((record) => (
          <button className="walk-record-card" type="button" onClick={() => onOpenRecord?.(record.id)} key={record.id}>
            <span className="walk-record-card__preview"><img src={record.image} alt="" /></span>
            <span className="walk-record-card__copy"><strong>{record.title}</strong><span>{record.metrics}</span><small>{record.detail}</small></span>
            <span className="walk-record-card__chevron" aria-hidden="true">›</span>
          </button>
        ))}
        {visibleRecords.length === 0 && <p className="walk-records-page__empty">{month} 산책 기록이 아직 없어요.</p>}
      </div>

      <HomeBottomNavigation active="records" />
    </main>
  )
}
