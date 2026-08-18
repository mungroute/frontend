import { useEffect, useMemo, useRef, useState } from 'react'
import { BaseMapViewport } from '../Components/map'
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
  api?: Pick<typeof walkApi, 'list'>
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

const thumbnailViewport = (coordinates: [number, number][]) => {
  const longitudes = coordinates.map(([longitude]) => longitude)
  const latitudes = coordinates.map(([, latitude]) => latitude)
  const west = Math.min(...longitudes)
  const east = Math.max(...longitudes)
  const south = Math.min(...latitudes)
  const north = Math.max(...latitudes)
  const longitudeSpan = Math.max(east - west, 0.00015)
  const latitudeSpan = Math.max(north - south, 0.00015)
  const longitudeZoom = Math.log2((360 * 0.72 * 92) / (256 * longitudeSpan))
  const latitudeZoom = Math.log2((360 * 0.72 * 100) / (256 * latitudeSpan))

  return {
    center: { latitude: (south + north) / 2, longitude: (west + east) / 2 },
    zoom: Math.max(11, Math.min(18, Math.min(longitudeZoom, latitudeZoom))),
  }
}

function RouteMiniPreview({ route, courseName }: { route: GeoJsonLineString | null; courseName: string }) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')
  const sceneOverlay = useMemo(() => {
    if (!route || route.coordinates.length < 2) return undefined
    const coordinates = route.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }))
    return {
      ...thumbnailViewport(route.coordinates),
      routes: [{
        id: `walk-record-thumbnail-${courseName}`,
        coordinates,
        color: '#f47a3a',
        width: 4,
        outlineColor: '#fffdf8',
        outlineWidth: 7,
        lineCap: 'round' as const,
      }],
    }
  }, [courseName, route])

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <span ref={containerRef} className="walk-record-card__preview" aria-hidden="true">
      {visible && sceneOverlay ? (
        <BaseMapViewport
          className="walk-record-card__preview-map"
          ariaLabel={`${courseName} 경로 썸네일 지도`}
          sceneOverlay={sceneOverlay}
          replaceBaseMarkers
          fallback={{ src: '/assets/s09/map.jpg' }}
        />
      ) : (
        <span className="walk-record-card__preview-placeholder">
          <img src="/assets/s09/map.jpg" alt="" />
          {!sceneOverlay && <span>경로 없음</span>}
        </span>
      )}
    </span>
  )
}

export function WalkRecordsPage({ records, dogs = EMPTY_DOGS, onBack, onOpenRecord, api = walkApi }: WalkRecordsPageProps) {
  const months = useMemo(() => buildMonthOptions(), [])
  const [month, setMonth] = useState(months[0].value)
  const [dogId, setDogId] = useState<number>()
  const [loadedRecords, setLoadedRecords] = useState<WalkRecordSummary[]>(records ?? [])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(records === undefined)
  const [error, setError] = useState<string>()
  const [retryRequest, setRetryRequest] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (records !== undefined) return
    let active = true
    void api.list(0, PAGE_SIZE, { ...monthRange(month), dogId })
      .then((result) => {
        if (!active) return
        setLoadedRecords(result)
        setPage(0)
        setHasMore(result.length === PAGE_SIZE)
        listRef.current?.scrollTo?.({ top: 0 })
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [api, records, month, dogId, retryRequest])

  const visibleRecords = records === undefined
    ? loadedRecords
    : records.filter((record) => {
      const dogName = dogs.find((dog) => dog.id === dogId)?.name
      return monthKeyOf(record.endedAt) === month && (!dogName || record.dogNames.includes(dogName))
    })

  const selectMonth = (value: string) => {
    listRef.current?.scrollTo?.({ top: 0 })
    if (records === undefined) {
      setLoading(true)
      setError(undefined)
    }
    setMonth(value)
  }

  const selectDog = (value?: number) => {
    listRef.current?.scrollTo?.({ top: 0 })
    if (records === undefined) {
      setLoading(true)
      setError(undefined)
    }
    setDogId(value)
  }

  const loadMore = () => {
    const nextPage = page + 1
    setLoading(true)
    void api.list(nextPage, PAGE_SIZE, { ...monthRange(month), dogId })
      .then((result) => {
        setLoadedRecords((current) => [...current, ...result])
        setPage(nextPage)
        setHasMore(result.length === PAGE_SIZE)
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }

  return (
    <main className={`journey-page management-page walk-records-page${dogs.length > 1 ? ' walk-records-page--with-dog-filter' : ''}`}>
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

      <div ref={listRef} className="walk-records-page__list" aria-busy={loading}>
        {visibleRecords.map((record) => (
          <article className="walk-record-card" key={record.sessionId}>
            <RouteMiniPreview route={record.routePreviewGeoJson} courseName={record.courseName} />
            <span className="walk-record-card__copy">
              <strong>{record.courseName}</strong>
              <span>{formatDuration(record.durationSec)} · {formatDistance(record.distanceM)}</span>
              <small>{record.dogNames.join(', ') || '함께한 반려견 없음'} · {new Date(record.endedAt).toLocaleDateString('ko-KR')}</small>
              {record.representative && <em>대표 코스</em>}
            </span>
            <span className="walk-record-card__chevron" aria-hidden="true">›</span>
            <button
              className="walk-record-card__open"
              type="button"
              aria-label={`${record.courseName} ${formatDuration(record.durationSec)} ${formatDistance(record.distanceM)}`}
              onClick={() => onOpenRecord?.(record.sessionId)}
            />
          </article>
        ))}
        {!loading && !error && visibleRecords.length === 0 && <p className="walk-records-page__empty">선택한 달의 산책 기록이 아직 없어요.</p>}
        {error && <div className="walk-records-page__empty" role="alert">
          <p>기록을 불러오지 못했어요. {error}</p>
          <button type="button" onClick={() => {
            setError(undefined)
            setLoading(true)
            setRetryRequest((request) => request + 1)
          }}>다시 시도</button>
        </div>}
        {loading && <p className="walk-records-page__state">기록을 불러오는 중이에요…</p>}
        {hasMore && !loading && <button className="walk-records-page__more" type="button" onClick={loadMore}>기록 더 보기</button>}
      </div>

      <HomeBottomNavigation active="records" />
    </main>
  )
}
