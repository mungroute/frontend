import { useEffect, useMemo, useState } from 'react'
import { FilterChip, HomeBottomNavigation, ManagementPageHeader } from '../Components/ui'
import { walkApi } from '../api/walks'
import type { GeoJsonLineString, WalkRecordSummary } from '../api/walks'
import '../styles/pages/journey-page.css'
import '../styles/pages/management-pages.css'

type WalkRecordsPageProps = {
  records?: WalkRecordSummary[]
  dogs?: { id: number; name: string }[]
  onBack?: () => void
  onOpenRecord?: (id: string | number) => void
}

const PAGE_SIZE = 20
const EMPTY_DOGS: { id: number; name: string }[] = []
const formatDuration = (durationSec: number) => `${Math.max(1, Math.round(durationSec / 60))}분`
const formatDistance = (distanceM: number) => `${(distanceM / 1000).toFixed(1)}km`
const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const monthKeyOf = (iso: string) => toMonthKey(new Date(iso))

const monthRange = (month: string) => {
  const [year, value] = month.split('-').map(Number)
  const next = new Date(year, value, 1)
  return { from: `${month}-01T00:00:00+09:00`, to: `${toMonthKey(next)}-01T00:00:00+09:00` }
}

const buildMonthOptions = () => {
  const now = new Date()
  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    return { value: toMonthKey(date), label: index === 0 ? '이번 달' : `${date.getMonth() + 1}월` }
  })
}

function RouteMiniPreview({ route }: { route: GeoJsonLineString | null }) {
  const points = useMemo(() => {
    if (!route || route.coordinates.length < 2) return ''
    const xs = route.coordinates.map(([x]) => x)
    const ys = route.coordinates.map(([, y]) => y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const width = Math.max(maxX - minX, 0.000001)
    const height = Math.max(maxY - minY, 0.000001)
    return route.coordinates.map(([x, y]) => {
      const px = 12 + ((x - minX) / width) * 76
      const py = 88 - ((y - minY) / height) * 76
      return `${px.toFixed(1)},${py.toFixed(1)}`
    }).join(' ')
  }, [route])

  return (
    <span className="walk-record-card__preview" aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <path d="M8 25 C28 5 68 8 91 30 M5 68 C30 48 61 58 96 44 M23 98 C34 75 49 62 70 1" />
        {points
          ? <polyline points={points} />
          : <path className="walk-record-card__empty-route" d="M18 78 C31 60 36 38 55 43 S75 62 84 20" />}
      </svg>
    </span>
  )
}

export function WalkRecordsPage({ records, dogs = EMPTY_DOGS, onBack, onOpenRecord }: WalkRecordsPageProps) {
  const months = useMemo(() => buildMonthOptions(), [])
  const [month, setMonth] = useState(months[0].value)
  const [dogId, setDogId] = useState<number>()
  const [loadedRecords, setLoadedRecords] = useState<WalkRecordSummary[]>(records ?? [])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(records === undefined)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (records !== undefined) return
    let active = true
    void walkApi.list(0, PAGE_SIZE, { ...monthRange(month), dogId })
      .then((result) => {
        if (!active) return
        setLoadedRecords(result)
        setPage(0)
        setHasMore(result.length === PAGE_SIZE)
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [records, month, dogId])

  const visibleRecords = records === undefined
    ? loadedRecords
    : records.filter((record) => {
      const dogName = dogs.find((dog) => dog.id === dogId)?.name
      return monthKeyOf(record.endedAt) === month && (!dogName || record.dogNames.includes(dogName))
    })

  const selectMonth = (value: string) => {
    if (records === undefined) {
      setLoading(true)
      setError(undefined)
    }
    setMonth(value)
  }

  const selectDog = (value?: number) => {
    if (records === undefined) {
      setLoading(true)
      setError(undefined)
    }
    setDogId(value)
  }

  const loadMore = () => {
    const nextPage = page + 1
    setLoading(true)
    void walkApi.list(nextPage, PAGE_SIZE, { ...monthRange(month), dogId })
      .then((result) => {
        setLoadedRecords((current) => [...current, ...result])
        setPage(nextPage)
        setHasMore(result.length === PAGE_SIZE)
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }

  return (
    <main className="journey-page management-page walk-records-page">
      <ManagementPageHeader title="산책 기록" subtitle="함께 걸은 시간을 모아봤어요" onBack={onBack} />

      <div className="management-page__chips walk-records-page__filters" aria-label="기록 필터">
        <div className="ui-chip-row" aria-label="기록 월 필터">
          {months.map((option) => (
            <FilterChip key={option.value} selected={month === option.value} variant="soft" onClick={() => selectMonth(option.value)}>{option.label}</FilterChip>
          ))}
        </div>
        {dogs.length > 1 && (
          <div className="ui-chip-row walk-records-page__dog-filter" aria-label="반려견 필터">
            <FilterChip selected={dogId === undefined} variant="soft" onClick={() => selectDog(undefined)}>전체</FilterChip>
            {dogs.map((dog) => <FilterChip key={dog.id} selected={dogId === dog.id} variant="soft" onClick={() => selectDog(dog.id)}>{dog.name}</FilterChip>)}
          </div>
        )}
      </div>

      <div className="walk-records-page__list" aria-busy={loading}>
        {visibleRecords.map((record) => (
          <button className="walk-record-card" type="button" onClick={() => onOpenRecord?.(record.sessionId)} key={record.sessionId}>
            <RouteMiniPreview route={record.routePreviewGeoJson} />
            <span className="walk-record-card__copy">
              <strong>{record.courseName}</strong>
              <span>{formatDuration(record.durationSec)} · {formatDistance(record.distanceM)}</span>
              <small>{record.dogNames.join(', ') || '함께한 반려견 없음'} · {new Date(record.endedAt).toLocaleDateString('ko-KR')}</small>
              {record.representative && <em>대표 코스</em>}
            </span>
            <span className="walk-record-card__chevron" aria-hidden="true">›</span>
          </button>
        ))}
        {!loading && !error && visibleRecords.length === 0 && <p className="walk-records-page__empty">선택한 달의 산책 기록이 아직 없어요.</p>}
        {error && <p className="walk-records-page__empty" role="alert">기록을 불러오지 못했어요. {error}</p>}
        {loading && <p className="walk-records-page__state">기록을 불러오는 중이에요…</p>}
        {hasMore && !loading && <button className="walk-records-page__more" type="button" onClick={loadMore}>기록 더 보기</button>}
      </div>

      <HomeBottomNavigation active="records" />
    </main>
  )
}
