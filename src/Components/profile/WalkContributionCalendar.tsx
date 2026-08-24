import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { WalkContributionDay, WalkContributionRecord, WalkContributions } from '../../api/walks'

type CalendarMode = 'flat' | 'skyline'

type WalkContributionCalendarProps = {
  contributions: WalkContributions
  focusMonth?: number
  onOpenRecord: (sessionId: number) => void
}

type CalendarCell = {
  date: string
  label: string
  month: number
  dayOfMonth: number
  week: number
  weekday: number
  contribution?: WalkContributionDay
}

const colorLevels = ['#d8d5d2', '#f5e3dc', '#e8b8a6', '#d7795b', '#d85a08']
const frontColorLevels = ['#c9c5c1', '#e8cec4', '#d99a83', '#bf5e40', '#bd4905']
const sideColorLevels = ['#b7b2ae', '#d8b8ac', '#c78168', '#a84c32', '#983a04']
const MIN_SKYLINE_ZOOM = 0.72
const MAX_SKYLINE_ZOOM = 2.2
const DEFAULT_SKYLINE_ZOOM = 1
const MORPH_DURATION_MS = 680
const clampSkylineZoom = (zoom: number) => Math.max(MIN_SKYLINE_ZOOM, Math.min(MAX_SKYLINE_ZOOM, zoom))
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const easeInOutCubic = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3
const distanceLevel = (distanceM: number) => distanceM <= 0 ? 0 : distanceM < 500 ? 1 : distanceM < 1500 ? 2 : distanceM < 3000 ? 3 : 4
const formatDistance = (distanceM: number) => distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM / 1000).toFixed(1)}km`
const formatDate = (date: string) => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${date}T12:00:00+09:00`))
const formatTime = (date: string) => new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(date))

const buildCalendar = (year: number, days: WalkContributionDay[]) => {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const first = new Date(Date.UTC(year, 0, 1))
  const last = new Date(Date.UTC(year, 11, 31))
  const cells: CalendarCell[] = []
  for (let cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10)
    const dayIndex = Math.round((cursor.getTime() - first.getTime()) / 86_400_000)
    cells.push({
      date,
      label: `${cursor.getUTCMonth() + 1}월 ${cursor.getUTCDate()}일`,
      month: cursor.getUTCMonth() + 1,
      dayOfMonth: cursor.getUTCDate(),
      week: Math.floor((dayIndex + first.getUTCDay()) / 7),
      weekday: cursor.getUTCDay(),
      contribution: byDate.get(date),
    })
  }
  return cells
}

const monthMarkers = (cells: CalendarCell[]) => cells.filter((cell) => cell.dayOfMonth === 1)

export function WalkContributionCalendar({ contributions, focusMonth, onOpenRecord }: WalkContributionCalendarProps) {
  const [mode, setMode] = useState<CalendarMode>('flat')
  const [morphProgress, setMorphProgress] = useState(0)
  const [isMorphing, setIsMorphing] = useState(false)
  const [selectedDay, setSelectedDay] = useState<WalkContributionDay>()
  const [recordChoices, setRecordChoices] = useState<WalkContributionRecord[]>()
  const [rotation, setRotation] = useState({ x: 58, z: 18 })
  const [zoom, setZoom] = useState(DEFAULT_SKYLINE_ZOOM)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number; rotationX: number; rotationZ: number; panX: number; panY: number; mode: 'orbit' | 'pan'; moved: boolean } | undefined>(undefined)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ distance: number; centerX: number; centerY: number; zoom: number; panX: number; panY: number } | undefined>(undefined)
  const gestureMovedRef = useRef(false)
  const morphFrameRef = useRef<number | undefined>(undefined)
  const cells = useMemo(() => buildCalendar(contributions.year, contributions.days), [contributions])
  const markers = useMemo(() => monthMarkers(cells), [cells])

  const centeredSkylinePanX = () => {
    const viewport = viewportRef.current
    if (!viewport || viewport.clientWidth <= 0) return 0
    return (viewport.scrollLeft + viewport.clientWidth / 2 - 450) / 2.5
  }

  const resetSkylineCamera = () => {
    setRotation({ x: 58, z: 18 })
    setZoom(DEFAULT_SKYLINE_ZOOM)
    setPanX(centeredSkylinePanX())
    setPanY(0)
  }

  useEffect(() => () => {
    if (morphFrameRef.current !== undefined) cancelAnimationFrame(morphFrameRef.current)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || mode !== 'flat' || !focusMonth || viewport.clientWidth <= 0) return
    const marker = markers.find((cell) => cell.month === focusMonth)
    if (!marker) return
    const sceneWidth = viewport.scrollWidth || 900
    const left = Math.max(0, Math.min(
      sceneWidth - viewport.clientWidth,
      marker.week * 17 - viewport.clientWidth * 0.35,
    ))
    if (typeof viewport.scrollTo === 'function') viewport.scrollTo({ left, behavior: 'smooth' })
    else viewport.scrollLeft = left
  }, [focusMonth, markers, mode])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || mode !== 'skyline') return
    const zoomWithWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault()
        setZoom((current) => clampSkylineZoom(current * Math.exp(-event.deltaY * 0.0025)))
        return
      }
      if (event.shiftKey) {
        event.preventDefault()
        const delta = event.deltaX || event.deltaY
        setPanX((current) => current - delta * 0.7)
      }
    }
    viewport.addEventListener('wheel', zoomWithWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', zoomWithWheel)
  }, [mode])

  const switchMode = (nextMode: CalendarMode) => {
    if (nextMode === mode) return
    setSelectedDay(undefined)
    setRecordChoices(undefined)
    if (nextMode === 'skyline') setPanX(centeredSkylinePanX())
    setMode(nextMode)
    const target = nextMode === 'skyline' ? 1 : 0
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMorphProgress(target)
      setIsMorphing(false)
      return
    }
    if (morphFrameRef.current !== undefined) cancelAnimationFrame(morphFrameRef.current)
    const start = morphProgress
    const startedAt = performance.now()
    setIsMorphing(true)
    const animateMorph = (now: number) => {
      const elapsed = clamp01((now - startedAt) / MORPH_DURATION_MS)
      const eased = easeInOutCubic(elapsed)
      setMorphProgress(start + (target - start) * eased)
      if (elapsed < 1) {
        morphFrameRef.current = requestAnimationFrame(animateMorph)
      } else {
        morphFrameRef.current = undefined
        setMorphProgress(target)
        setIsMorphing(false)
      }
    }
    morphFrameRef.current = requestAnimationFrame(animateMorph)
  }

  const openSkylineDay = (day: WalkContributionDay) => {
    if (gestureMovedRef.current) return
    if (day.records.length === 1) {
      onOpenRecord(day.records[0].sessionId)
      return
    }
    setRecordChoices(day.records)
    setSelectedDay(day)
  }

  const projectSkylinePoint = (x: number, y: number, z: number) => {
    const radiansZ = rotation.z * Math.PI / 180
    const radiansX = rotation.x * Math.PI / 180
    const centeredX = x - 449
    const centeredY = y - 58
    const rotatedX = centeredX * Math.cos(radiansZ) - centeredY * Math.sin(radiansZ)
    const rotatedY = centeredX * Math.sin(radiansZ) + centeredY * Math.cos(radiansZ)
    return {
      x: 450 + rotatedX * zoom + panX * 2.5,
      y: 235 + (rotatedY * Math.cos(radiansX) - z * Math.sin(radiansX)) * zoom + panY * 2.5,
    }
  }
  const projectFlatPoint = (x: number, y: number) => ({ x, y: 76 + y })
  const projectMorphPoint = (x: number, y: number, z: number) => {
    const flat = projectFlatPoint(x, y)
    const skyline = projectSkylinePoint(x, y, z)
    const gridProgress = easeInOutCubic(morphProgress)
    return {
      x: flat.x + (skyline.x - flat.x) * gridProgress,
      y: flat.y + (skyline.y - flat.y) * gridProgress,
    }
  }
  const projectMonthMarker = (x: number) => {
    const flat = projectFlatPoint(x, -16)
    const skyline = projectSkylinePoint(x, 132, 0)
    const markerProgress = easeInOutCubic(morphProgress)
    return {
      x: flat.x + (skyline.x - flat.x) * markerProgress,
      y: flat.y + (skyline.y + 12 - flat.y) * markerProgress,
    }
  }
  const barRiseProgress = (cell: CalendarCell) => {
    const staggerStart = 0.2 + cell.week * 0.006 + cell.weekday * 0.002
    return easeOutCubic(clamp01((morphProgress - staggerStart) / (1 - staggerStart)))
  }
  const polygonPoints = (points: Array<{ x: number; y: number }>) => points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')
  const activeSkylineCells = cells
    .filter((cell) => cell.contribution)
    .sort((left, right) => projectSkylinePoint(left.week * 17, left.weekday * 17, 0).y - projectSkylinePoint(right.week * 17, right.weekday * 17, 0).y)

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== 'skyline') return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    gestureMovedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    if (pointersRef.current.size === 1) {
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        rotationX: rotation.x,
        rotationZ: rotation.z,
        panX,
        panY,
        mode: event.shiftKey || event.button === 1 ? 'pan' : 'orbit',
        moved: false,
      }
      return
    }
    const [first, second] = Array.from(pointersRef.current.values())
    pinchRef.current = {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      centerX: (first.x + second.x) / 2,
      centerY: (first.y + second.y) / 2,
      zoom,
      panX,
      panY,
    }
    dragRef.current = undefined
  }

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values())
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      const pinch = pinchRef.current
      if (pinch && pinch.distance > 0) {
        if (Math.abs(distance - pinch.distance) > 3) gestureMovedRef.current = true
        setZoom(clampSkylineZoom(pinch.zoom * (distance / pinch.distance)))
        setPanX(pinch.panX + ((first.x + second.x) / 2 - pinch.centerX))
        setPanY(pinch.panY + ((first.y + second.y) / 2 - pinch.centerY))
      }
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.x
    const deltaY = event.clientY - drag.y
    if (Math.abs(deltaX) + Math.abs(deltaY) > 5) {
      drag.moved = true
      gestureMovedRef.current = true
    }
    if (drag.mode === 'pan') {
      setPanX(drag.panX + deltaX)
      setPanY(drag.panY + deltaY)
    } else {
      setRotation({
        x: Math.max(34, Math.min(76, drag.rotationX - deltaY * 0.16)),
        z: drag.rotationZ + deltaX * 0.2,
      })
    }
  }

  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    pointersRef.current.delete(event.pointerId)
    pinchRef.current = undefined
    const remaining = Array.from(pointersRef.current.entries())[0]
    if (remaining) {
      const [pointerId, position] = remaining
      dragRef.current = { pointerId, x: position.x, y: position.y, rotationX: rotation.x, rotationZ: rotation.z, panX, panY, mode: 'orbit', moved: true }
      return
    }
    window.setTimeout(() => {
      dragRef.current = undefined
      gestureMovedRef.current = false
    }, 0)
  }

  return (
    <section className="contribution-calendar" aria-labelledby="contribution-calendar-title">
      <div className="contribution-calendar__heading">
        <div>
          <span>DAILY WALK</span>
          <h2 id="contribution-calendar-title">매일 쌓이는 산책 발자국</h2>
          <p>{contributions.year}년, 걸은 만큼 더 짙어져요.</p>
        </div>
        <button
          className="contribution-calendar__mode"
          type="button"
          disabled={isMorphing}
          onClick={() => switchMode(mode === 'flat' ? 'skyline' : 'flat')}
        >{mode === 'flat' ? '3D로 보기' : '2D로 보기'} <span aria-hidden="true">↗</span></button>
      </div>

      <div className={`contribution-calendar__view contribution-calendar__view--${mode} ${isMorphing ? 'contribution-calendar__view--morphing' : ''}`}>
        <p className="contribution-calendar__drag-hint" aria-hidden={mode === 'flat'}><span>↔</span> 드래그 회전 · Shift+드래그/휠 이동 · Ctrl+휠 확대</p>
        <div
          ref={viewportRef}
          className="contribution-calendar__skyline-viewport"
          aria-busy={isMorphing}
          aria-label={mode === 'flat' ? '연간 산책 기록, 가로로 스크롤해 월별 기록 보기' : undefined}
          tabIndex={mode === 'flat' ? 0 : undefined}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <button
            className="contribution-calendar__camera-reset"
            type="button"
            aria-label="3D 보기 원위치로 되돌리기"
            tabIndex={mode === 'skyline' && !isMorphing ? 0 : -1}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              resetSkylineCamera()
            }}
          ><span aria-hidden="true">↺</span> 원위치</button>
          <div className="contribution-calendar__skyline-scene">
            <svg
              className="contribution-calendar__skyline"
              viewBox="0 0 900 370"
              preserveAspectRatio="xMidYMid meet"
              aria-label={`${contributions.year}년 일일 산책 거리 ${mode === 'flat' ? '2D' : '3D'} 보기`}
              style={{ '--rotate-x': `${rotation.x}deg`, '--rotate-z': `${rotation.z}deg`, '--skyline-zoom': zoom, '--skyline-pan-x': `${panX}px`, '--skyline-pan-y': `${panY}px`, '--morph-progress': morphProgress } as CSSProperties}
            >
              <g aria-hidden="true">
                {cells.map((cell) => {
                  const x0 = cell.week * 17
                  const y0 = cell.weekday * 17
                  return <polygon
                    key={`base-${cell.date}`}
                    className="contribution-calendar__skyline-base"
                    points={polygonPoints([
                      projectMorphPoint(x0, y0, 0),
                      projectMorphPoint(x0 + 14, y0, 0),
                      projectMorphPoint(x0 + 14, y0 + 14, 0),
                      projectMorphPoint(x0, y0 + 14, 0),
                    ])}
                  />
                })}
              </g>
              {activeSkylineCells.map((cell) => {
                const contribution = cell.contribution!
                const distance = contribution.totalDistanceM
                const level = distanceLevel(distance)
                const fullHeight = Math.min(204, 24 + Math.sqrt(distance / 1000) * 78)
                const height = fullHeight * barRiseProgress(cell)
                const x0 = cell.week * 17
                const y0 = cell.weekday * 17
                const x1 = x0 + 14
                const y1 = y0 + 14
                const isFlat = mode === 'flat'
                return <g
                  key={`column-${cell.date}`}
                  className="contribution-calendar__skyline-column"
                  role="button"
                  tabIndex={0}
                  aria-label={isFlat
                    ? `${cell.label}, ${formatDistance(distance)}, ${contribution.walkCount}회`
                    : `${cell.label} 산책 기록 열기, ${formatDistance(distance)}`}
                  aria-pressed={isFlat ? selectedDay?.date === cell.date : undefined}
                  onClick={() => isFlat ? setSelectedDay(contribution) : openSkylineDay(contribution)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      if (isFlat) setSelectedDay(contribution)
                      else openSkylineDay(contribution)
                    }
                  }}
                >
                  <polygon className="contribution-calendar__skyline-face" fill={frontColorLevels[level]} points={polygonPoints([
                    projectMorphPoint(x0, y1, 0), projectMorphPoint(x1, y1, 0),
                    projectMorphPoint(x1, y1, height), projectMorphPoint(x0, y1, height),
                  ])} />
                  <polygon className="contribution-calendar__skyline-face" fill={sideColorLevels[level]} points={polygonPoints([
                    projectMorphPoint(x1, y0, 0), projectMorphPoint(x1, y1, 0),
                    projectMorphPoint(x1, y1, height), projectMorphPoint(x1, y0, height),
                  ])} />
                  <polygon className="contribution-calendar__skyline-face contribution-calendar__skyline-face--top" fill={colorLevels[level]} points={polygonPoints([
                    projectMorphPoint(x0, y0, height), projectMorphPoint(x1, y0, height),
                    projectMorphPoint(x1, y1, height), projectMorphPoint(x0, y1, height),
                  ])} />
                </g>
              })}
              <g aria-hidden="true">
                {markers.map((cell) => {
                  const marker = projectMonthMarker(cell.week * 17 + 2)
                  return <text key={`month-${cell.date}`} className="contribution-calendar__skyline-month" x={marker.x} y={marker.y}>{cell.month}월</text>
                })}
              </g>
            </svg>
          </div>
        </div>
        <div className="contribution-calendar__flat-details" aria-hidden={mode === 'skyline'}>
          <div className="contribution-calendar__legend" aria-label="거리별 색상 범례">
            <span>적게</span>
            <span className="contribution-calendar__legend-steps" aria-hidden="true">
              {colorLevels.map((color) => <i key={color} style={{ '--legend-color': color } as CSSProperties} />)}
            </span>
            <span>많이</span>
          </div>
          <div className={`contribution-calendar__day-card ${selectedDay ? 'contribution-calendar__day-card--visible' : ''}`} aria-live="polite">
            {selectedDay
              ? <><span>{formatDate(selectedDay.date)}</span><strong>{formatDistance(selectedDay.totalDistanceM)}</strong><small>산책 완료 {selectedDay.walkCount}회</small></>
              : <p>날짜 블록을 누르면 그날의 산책을 볼 수 있어요.</p>}
          </div>
        </div>
      </div>

      {recordChoices && selectedDay && <div className="contribution-calendar__sheet-backdrop" role="presentation" onClick={() => setRecordChoices(undefined)}>
        <section className="contribution-calendar__record-sheet" role="dialog" aria-modal="true" aria-label={`${formatDate(selectedDay.date)} 산책 기록 선택`} onClick={(event) => event.stopPropagation()}>
          <span className="contribution-calendar__sheet-handle" aria-hidden="true" />
          <strong>{formatDate(selectedDay.date)}</strong>
          <p>{formatDistance(selectedDay.totalDistanceM)} · 산책 {selectedDay.walkCount}회</p>
          <div>
            {recordChoices.map((record) => <button type="button" key={record.sessionId} onClick={() => onOpenRecord(record.sessionId)}>
              <span><b>{record.courseName}</b><small>{formatTime(record.startedAt)} · {formatDistance(record.distanceM)}</small></span>
              <em>{record.hasRoute ? '경로 보기' : '기록 보기'} ›</em>
            </button>)}
          </div>
          <button className="contribution-calendar__sheet-close" type="button" onClick={() => setRecordChoices(undefined)}>닫기</button>
        </section>
      </div>}
    </section>
  )
}
