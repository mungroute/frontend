import { WeeklyDistanceChart } from '../Components/profile/WeeklyDistanceChart'
import { Button, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-profile-pages.css'

const weeklyDistances = [
  { day: '월', value: 2.3 },
  { day: '화', value: 3.3 },
  { day: '수', value: 1.6 },
  { day: '목', value: 4.2 },
  { day: '금', value: 2.9 },
  { day: '토', value: 5, highlighted: true },
  { day: '일', value: 3.8 },
]

type WalkStatisticsPageProps = {
  onBack?: () => void
  onOpenRecords: () => void
}

export function WalkStatisticsPage({ onBack, onOpenRecords }: WalkStatisticsPageProps) {
  return (
    <main className="journey-page extended-profile-page walk-statistics-page">
      <ManagementPageHeader title="산책 통계" subtitle="이번 달 망고와 걸은 기록" onBack={onBack} />

      <section className="walk-statistics-page__summary" aria-label="8월 산책 요약">
        <strong>8월</strong>
        <b>18.7 km</b>
        <span>12회 · 5시간 18분</span>
      </section>

      <div className="walk-statistics-page__chart">
        <WeeklyDistanceChart data={weeklyDistances} />
      </div>

      <section className="walk-statistics-page__favorite">
        <span>가장 자주 걷는 코스</span>
        <strong>저녁 남산길</strong>
        <small>5회 · 평균 31분</small>
      </section>

      <Button className="walk-statistics-page__records" variant="secondary" onClick={onOpenRecords}>기록 전체 보기</Button>
    </main>
  )
}
