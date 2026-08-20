import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'

export type WalkSheetState = 'collapsed' | 'expanded'

type WalkNavigationSheetProps = {
  time: string
  distance: string
  modeSummary: string
  paused?: boolean
  onPause?: () => void
  onResume?: () => void
  children: ReactNode
  onStateChange?: (state: WalkSheetState) => void
  onHeightChange?: (height: number) => void
  defaultState?: WalkSheetState
  hidden?: boolean
  shifted?: boolean
}

export function WalkNavigationSheet({ time, distance, modeSummary, paused = false, onPause, onResume, children, onStateChange, onHeightChange, defaultState = 'collapsed', hidden = false, shifted = false }: WalkNavigationSheetProps) {
  const [state, setState] = useState<WalkSheetState>(defaultState)
  const sheetRef = useRef<HTMLElement>(null)
  const dragRef = useRef({ pointerId: -1, startY: 0 })
  const suppressClickRef = useRef(false)
  const expanded = state === 'expanded'
  const settle = (next: WalkSheetState) => {
    setState(next)
    onStateChange?.(next)
  }
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const stopDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return
    const delta = event.clientY - dragRef.current.startY
    if (Math.abs(delta) >= 28) {
      suppressClickRef.current = true
      settle(delta < 0 ? 'expanded' : 'collapsed')
    }
    dragRef.current.pointerId = -1
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !onHeightChange) return
    const report = () => {
      const height = sheet.getBoundingClientRect().height
      if (height > 0) onHeightChange(height)
    }
    report()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(report) : undefined
    observer?.observe(sheet)
    return () => observer?.disconnect()
  }, [onHeightChange, state])

  return (
    <section ref={sheetRef} className={`walk-navigation-sheet walk-navigation-sheet--${state}${hidden ? ' walk-navigation-sheet--hidden' : shifted ? ' walk-navigation-sheet--shifted' : ''}`} aria-label="산책 정보 패널">
      <button
        type="button"
        className="walk-navigation-sheet__handle"
        aria-label={expanded ? '산책 패널 접기' : '산책 패널 펼치기'}
        aria-expanded={expanded}
        onClick={() => {
          if (suppressClickRef.current) { suppressClickRef.current = false; return }
          settle(expanded ? 'collapsed' : 'expanded')
        }}
        onPointerDown={startDrag}
        onPointerUp={stopDrag}
        onPointerCancel={() => { dragRef.current.pointerId = -1 }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') { event.preventDefault(); settle('expanded') }
          if (event.key === 'ArrowDown') { event.preventDefault(); settle('collapsed') }
        }}
      ><span aria-hidden="true" /></button>
      <div className={`walk-navigation-sheet__summary${expanded ? ' walk-navigation-sheet__summary--expanded' : ''}`}>
        <div><strong>{time}</strong><span>산책 시간</span></div>
        <div><strong>{distance}</strong><span>이동 거리</span></div>
        {!expanded && (
          <button type="button" className="walk-navigation-sheet__primary-control" onClick={paused ? onResume : onPause} aria-label={paused ? '산책 재개' : '일시정지'}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        )}
      </div>
      <p className="walk-navigation-sheet__mode">{modeSummary}</p>
      <div className="walk-navigation-sheet__expanded" aria-hidden={!expanded}>
        {children}
      </div>
    </section>
  )
}
