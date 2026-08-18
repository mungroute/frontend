import { useEffect, useMemo, useState } from 'react'
import { WeeklyDistanceChart } from '../Components/profile/WeeklyDistanceChart'
import { WalkContributionCalendar } from '../Components/profile/WalkContributionCalendar'
import { Button, FilterChip, ManagementPageHeader } from '../Components/ui'
import { walkApi } from '../api/walks'
import type { WalkContributions, WalkStatistics } from '../api/walks'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-profile-pages.css'

type WalkStatisticsPageProps = {
  statistics?: WalkStatistics
  contributions?: WalkContributions
  dogs?: { id: number; name: string }[]
  onBack?: () => void
  onOpenRecords: () => void
  onOpenRecord?: (sessionId: number) => void
}

const dayNames = ['월', '화', '수', '목', '금', '토', '일']
const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`
}
const formatRecentWalk = (iso: string | null) => iso
  ? `최근 산책 ${new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(iso))}`
  : '이번 달 산책 기록 없음'

export function WalkStatisticsPage({ statistics, contributions, dogs = [], onBack, onOpenRecords, onOpenRecord = () => undefined }: WalkStatisticsPageProps) {
  const currentMonth = useMemo(() => toMonthKey(new Date()), [])
  const [month, setMonth] = useState(currentMonth)
  const [dogId, setDogId] = useState<number>()
  const [data, setData] = useState<WalkStatistics | undefined>(statistics)
  const [loading, setLoading] = useState(statistics === undefined)
  const [error, setError] = useState<string>()
  const [contributionData, setContributionData] = useState<WalkContributions | undefined>(contributions)
  const [contributionError, setContributionError] = useState<string>()

  useEffect(() => {
    if (statistics) return
    let active = true
    void walkApi.statistics(month, dogId)
      .then((result) => active && setData(result))
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [statistics, month, dogId])

  useEffect(() => {
    if (contributions) return
    let active = true
    void walkApi.contributions(Number(month.slice(0, 4)), dogId)
      .then((result) => { if (active) setContributionData(result) })
      .catch((reason: Error) => { if (active) setContributionError(reason.message) })
    return () => { active = false }
  }, [contributions, month, dogId])

  const changeMonth = (offset: number) => {
    const [year, value] = month.split('-').map(Number)
    setLoading(true)
    setError(undefined)
    setContributionError(undefined)
    setMonth(toMonthKey(new Date(year, value - 1 + offset, 1)))
  }
  const changeDog = (value?: number) => {
    setLoading(true)
    setError(undefined)
    setContributionError(undefined)
    setDogId(value)
  }
  const viewData = statistics ?? data
  const selectedDogName = dogs.find((dog) => dog.id === dogId)?.name
  const statisticsSubtitle = selectedDogName
    ? `${selectedDogName}와 함께한 산책`
    : '모든 반려견과 함께한 산책'
  const selectedMonthNumber = Number(month.slice(5, 7))
  const distanceByDay = new Map(viewData?.weekdayDistances.map((item) => [item.dayOfWeek, item.distanceM / 1000]) ?? [])
  const weeklyDistances = dayNames.map((day, index) => ({
    day,
    value: distanceByDay.get(index + 1) ?? 0,
    highlighted: (distanceByDay.get(index + 1) ?? 0) === Math.max(...distanceByDay.values(), -1),
  }))

  return (
    <main className="journey-page extended-profile-page walk-statistics-page">
      <ManagementPageHeader title="산책 통계" subtitle={statisticsSubtitle} onBack={onBack} />

      <div className="walk-statistics-page__filters">
        <div className="walk-statistics-page__month" aria-label="통계 월 선택">
          <button type="button" aria-label="이전 달" onClick={() => changeMonth(-1)}>‹</button>
          <strong>{month.slice(0, 4)}년 {selectedMonthNumber}월</strong>
          <button type="button" aria-label="다음 달" disabled={month >= currentMonth} onClick={() => changeMonth(1)}>›</button>
        </div>
        {dogs.length > 1 && <div className="ui-chip-row" aria-label="통계 반려견 필터">
          <FilterChip selected={dogId === undefined} variant="soft" onClick={() => changeDog(undefined)}>전체</FilterChip>
          {dogs.map((dog) => <FilterChip key={dog.id} selected={dogId === dog.id} variant="soft" onClick={() => changeDog(dog.id)}>{dog.name}</FilterChip>)}
        </div>}
      </div>

      {loading && !viewData && <p className="walk-statistics-page__state">통계를 불러오는 중이에요…</p>}
      {error && <p className="walk-statistics-page__state" role="alert">통계를 불러오지 못했어요. {error}</p>}
      {viewData && <>
        <section className="walk-statistics-page__summary" aria-label={`${selectedMonthNumber}월 산책 요약`}>
          <strong>{selectedMonthNumber}월 누적</strong>
          <b>{(viewData.totalDistanceM / 1000).toFixed(1)} km</b>
          <span>{viewData.walkCount}회 · {formatDuration(viewData.totalDurationSec)}</span>
          <small>한 번에 평균 {(viewData.averageDistanceM / 1000).toFixed(1)}km · {formatDuration(viewData.averageDurationSec)}</small>
          <small>{formatRecentWalk(viewData.lastWalkedAt)}</small>
        </section>

        {contributionData && <WalkContributionCalendar contributions={contributionData} onOpenRecord={onOpenRecord} />}
        {contributionError && <p className="walk-statistics-page__contribution-error" role="alert">산책 발자국을 불러오지 못했어요.</p>}

        <div className="walk-statistics-page__chart">
          <WeeklyDistanceChart data={weeklyDistances} title="요일별 누적 거리" />
        </div>

        <section className="walk-statistics-page__favorite">
          <span>가장 자주 걷는 코스</span>
          {viewData.favoriteCourse
            ? <><strong>{viewData.favoriteCourse.courseName}</strong><small>{viewData.favoriteCourse.walkCount}회 · 평균 {formatDuration(viewData.favoriteCourse.averageDurationSec)}</small></>
            : <><strong>아직 기록이 없어요</strong><small>산책을 저장하면 자주 걷는 코스를 알려드려요.</small></>}
        </section>
      </>}

      <Button className="walk-statistics-page__records" variant="secondary" onClick={onOpenRecords}>기록 전체 보기</Button>
    </main>
  )
}
