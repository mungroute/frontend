import { useEffect, useMemo, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, InputHTMLAttributes, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Check, Minus, Pause, Play, Plus, Square } from 'lucide-react'
import '../../styles/components/ui.css'

export { HomeBottomNavigation, HomeWalkStartAction } from './home-controls'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean }
export function Button({ variant = 'primary', loading = false, disabled, className = '', children, ...props }: ButtonProps) {
  return <button className={`ui-button ui-button--${variant} ${className}`.trim()} disabled={disabled || loading} aria-busy={loading} {...props}>{loading && <span className="ui-spinner" aria-hidden="true" />}{children}</button>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ui-card ${className}`}>{children}</div>
}

export function SelectionCard({ selected, title, description, onClick }: { selected: boolean; title: string; description?: string; onClick: () => void }) {
  return <button type="button" className="ui-card ui-select-card" aria-pressed={selected} onClick={onClick}><span className="ui-select-card__content"><span className="ui-select-card__title">{title}</span>{description && <span className="ui-select-card__description">{description}</span>}</span>{selected && <span className="ui-select-card__check" aria-hidden="true"><Check size={18} strokeWidth={3} /></span>}</button>
}

export function Switch({ checked, onChange, label, description, ariaLabel }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string; ariaLabel?: string }) {
  return <button type="button" role="switch" className="ui-switch-row" aria-label={ariaLabel} aria-checked={checked} onClick={() => onChange(!checked)}><span className="ui-switch-copy"><span className="ui-switch-title">{label}</span>{description && <span className="ui-switch-description">{description}</span>}</span><span className="ui-switch" aria-hidden="true"><span className="ui-switch__thumb" /></span></button>
}

export function FilterChip({ selected, children, onClick, variant = 'solid' }: { selected: boolean; children: ReactNode; onClick: () => void; variant?: 'solid' | 'soft' }) {
  return <button type="button" className={`ui-chip ui-chip--${variant}`} aria-pressed={selected} onClick={onClick}>{children}</button>
}

export { DetailRow, ManagementPageHeader, MetricGrid, RouteSummaryCard } from './management-controls'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; success?: string; action?: ReactNode }
export function TextField({ label, hint, error, success, action, id, ...props }: TextFieldProps) {
  const inputId = id ?? `field-${label.replace(/\s/g, '-')}`
  const messageId = `${inputId}-message`
  const message = error ?? success ?? hint
  return <div className="ui-field"><label className="ui-field__label" htmlFor={inputId}>{label}</label><div className="ui-field__control"><input className="ui-field__input" id={inputId} aria-invalid={Boolean(error)} aria-describedby={message ? messageId : undefined} {...props} />{action}</div>{message && <p id={messageId} className={`ui-field__message ${error ? 'ui-field__message--error' : success ? 'ui-field__message--success' : ''}`}>{message}</p>}</div>
}

type WalkControlKind = 'start' | 'pause' | 'resume' | 'stop'
export function WalkControl({ kind, onClick }: { kind: WalkControlKind; onClick?: () => void }) {
  const config = { start: { label: '산책 시작', icon: Play }, pause: { label: '일시정지', icon: Pause }, resume: { label: '산책 재개', icon: Play }, stop: { label: '산책 종료', icon: Square } }[kind]
  const Icon = config.icon
  return <button type="button" className={`ui-walk-control ui-walk-control--${kind === 'resume' ? 'pause' : kind}`} aria-label={config.label} onClick={onClick}><span className="ui-walk-control__circle"><Icon size={32} fill="currentColor" aria-hidden="true" /></span><span className="ui-walk-control__label">{config.label}</span></button>
}

type TimePickerProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  variant?: 'default' | 'compact'
}

export function TimePicker({ value, onChange, min = 10, max = 60, step = 5, variant = 'default' }: TimePickerProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const positionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isPositioningRef = useRef(false)
  const wheelAccumulatorRef = useRef(0)
  const wheelLastEventAtRef = useRef(0)
  const wheelLastStepAtRef = useRef(Number.NEGATIVE_INFINITY)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollPreview, setScrollPreview] = useState(value)
  const rowHeight = variant === 'compact' ? 36 : 52
  const values = useMemo(
    () => Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => min + index * step),
    [max, min, step],
  )
  const previewValue = isScrolling ? scrollPreview : value
  const change = (next: number) => onChange(Math.min(max, Math.max(min, next)))

  useEffect(() => {
    const selectedIndex = values.indexOf(value)
    if (selectedIndex >= 0) {
      isPositioningRef.current = true
      wheelRef.current?.scrollTo?.({ top: selectedIndex * rowHeight, behavior: 'auto' })
      clearTimeout(positionTimerRef.current)
      positionTimerRef.current = setTimeout(() => {
        isPositioningRef.current = false
      }, 0)
    }
  }, [rowHeight, value, values])

  useEffect(() => () => {
    clearTimeout(scrollTimerRef.current)
    clearTimeout(positionTimerRef.current)
  }, [])

  const handleScroll = () => {
    if (isPositioningRef.current) return

    const selectedIndex = Math.round((wheelRef.current?.scrollTop ?? 0) / rowHeight)
    const nextValue = values[Math.min(values.length - 1, Math.max(0, selectedIndex))]
    setIsScrolling(true)
    setScrollPreview(nextValue)

    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      if (nextValue !== value) {
        onChange(nextValue)
        navigator.vibrate?.(8)
      }
      setIsScrolling(false)
    }, 120)
  }

  useEffect(() => {
    const wheel = wheelRef.current
    if (!wheel) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.deltaY === 0) return

      const now = performance.now()
      if (now - wheelLastEventAtRef.current > 220 || Math.sign(wheelAccumulatorRef.current) !== Math.sign(event.deltaY)) {
        wheelAccumulatorRef.current = 0
      }
      wheelLastEventAtRef.current = now
      const normalizedDelta = event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2 ? event.deltaY * wheel.clientHeight : event.deltaY
      wheelAccumulatorRef.current += normalizedDelta

      const wheelStepThreshold = 48
      if (Math.abs(wheelAccumulatorRef.current) < wheelStepThreshold || now - wheelLastStepAtRef.current < 120) return

      const direction = Math.sign(wheelAccumulatorRef.current)
      const currentIndex = Math.round(wheel.scrollTop / rowHeight)
      const nextIndex = Math.min(values.length - 1, Math.max(0, currentIndex + direction))
      wheelAccumulatorRef.current = 0
      wheelLastStepAtRef.current = now
      wheel.scrollTo?.({ top: nextIndex * rowHeight, behavior: 'smooth' })
    }
    wheel.addEventListener('wheel', handleWheel, { passive: false })
    return () => wheel.removeEventListener('wheel', handleWheel)
  }, [rowHeight, values])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      change(value - step)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      change(value + step)
    }
  }

  return (
    <div className={`ui-time-picker ui-time-picker--${variant}`} aria-label="목표 산책 시간">
      {variant === 'default' && (
        <button type="button" className="ui-time-picker__step" aria-label={`${step}분 줄이기`} disabled={value <= min} onClick={() => change(value - step)}>
          <Minus size={20} />
        </button>
      )}
      <div className="ui-time-picker__wheel-frame">
        <div className="ui-time-picker__selection-band" aria-hidden="true" />
        <div
          ref={wheelRef}
          className="ui-time-picker__wheel"
          role="spinbutton"
          tabIndex={0}
          aria-label="목표 산책 시간"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={previewValue}
          aria-valuetext={`${previewValue}분`}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          <div className="ui-time-picker__list">
            {values.map((option) => {
              const distance = Math.abs(values.indexOf(option) - values.indexOf(previewValue))
              return (
                <div
                  key={option}
                  className={`ui-time-picker__option ${option === previewValue ? 'ui-time-picker__option--selected' : ''}`}
                  data-distance={Math.min(distance, 3)}
                  aria-hidden={option !== previewValue}
                  onClick={() => change(option)}
                >
                  {option}분
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {variant === 'default' && (
        <button type="button" className="ui-time-picker__step" aria-label={`${step}분 늘리기`} disabled={value >= max} onClick={() => change(value + step)}>
          <Plus size={20} />
        </button>
      )}
    </div>
  )
}

type DraggableSheetProps = ComponentPropsWithoutRef<'section'> & {
  allowUpwardDrag?: boolean
  collapsedHeight?: number
  upwardDragTop?: number
  upwardDragBoundarySelector?: string
  upwardDragBoundarySpacing?: number
}

const containerScaleY = (container: HTMLElement, rect = container.getBoundingClientRect()) => (
  container.clientHeight > 0 && rect.height > 0 ? rect.height / container.clientHeight : 1
)

export function DraggableSheet({
  children,
  className = '',
  allowUpwardDrag = true,
  collapsedHeight = 104,
  upwardDragTop = 20,
  upwardDragBoundarySelector,
  upwardDragBoundarySpacing = 0,
  ...props
}: DraggableSheetProps) {
  const sheetRef = useRef<HTMLElement>(null)
  const dragRef = useRef({ pointerId: -1, startY: 0, startOffset: 0 })
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const sheet = sheetRef.current
    const container = sheet?.closest<HTMLElement>('.journey-page, .representative-home-page, .no-course-home-page') ?? sheet?.parentElement
    const syncMapControl = () => {
      if (!sheet || !container) return
      const containerRect = container.getBoundingClientRect()
      const sheetTop = (sheet.getBoundingClientRect().top - containerRect.top) / containerScaleY(container, containerRect)
      container.style.setProperty('--map-sheet-top', `${sheetTop}px`)
    }
    let frame = 0
    const scheduleMapControlSync = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        syncMapControl()
      })
    }
    scheduleMapControlSync()
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleMapControlSync)
      : undefined
    if (sheet) resizeObserver?.observe(sheet)
    const positionObserver = typeof MutationObserver === 'function'
      ? new MutationObserver(scheduleMapControlSync)
      : undefined
    let observedElement: HTMLElement | null | undefined = sheet
    while (observedElement && observedElement !== container) {
      positionObserver?.observe(observedElement, { attributes: true, attributeFilter: ['class', 'style'] })
      observedElement = observedElement.parentElement
    }
    const handleResize = () => scheduleMapControlSync()
    window.addEventListener('resize', handleResize)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      positionObserver?.disconnect()
      window.removeEventListener('resize', handleResize)
      container?.style.removeProperty('--map-sheet-top')
    }
  }, [])

  const moveTo = (nextOffset: number) => {
    const sheet = sheetRef.current
    const container = sheet?.closest<HTMLElement>('.journey-page, .representative-home-page, .no-course-home-page') ?? sheet?.parentElement
    if (!sheet || !container) return
    const containerRect = container.getBoundingClientRect()
    const scaleY = containerScaleY(container, containerRect)
    const baseTop = (sheet.getBoundingClientRect().top - containerRect.top) / scaleY - offset
    const topLimit = upwardDragTop - baseTop
    const boundary = upwardDragBoundarySelector
      ? sheet.querySelector<HTMLElement>(upwardDragBoundarySelector)
      : undefined
    const baseBoundaryBottom = boundary
      ? (boundary.getBoundingClientRect().bottom - containerRect.top) / scaleY - offset
      : undefined
    const contentLimit = upwardDragBoundarySelector
      ? (baseBoundaryBottom === undefined
          ? 0
          : Math.min(0, container.clientHeight - baseBoundaryBottom - upwardDragBoundarySpacing))
      : topLimit
    const minOffset = allowUpwardDrag
      ? Math.max(topLimit, contentLimit)
      : 0
    const maxOffset = Math.max(minOffset, container.clientHeight - collapsedHeight - baseTop)
    const bounded = Math.min(maxOffset, Math.max(minOffset, nextOffset))
    setOffset(bounded)
    container.style.setProperty('--map-sheet-top', `${baseTop + bounded}px`)
  }

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startOffset: offset }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const drag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return
    const sheet = sheetRef.current
    const container = sheet?.closest<HTMLElement>('.journey-page, .representative-home-page, .no-course-home-page') ?? sheet?.parentElement
    const scaleY = container ? containerScaleY(container) : 1
    moveTo(dragRef.current.startOffset + (event.clientY - dragRef.current.startY) / scaleY)
  }

  const stopDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return
    dragRef.current.pointerId = -1
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <section ref={sheetRef} className={`ui-draggable-sheet ${className}`.trim()} style={{ transform: `translateY(${offset}px)` }} {...props}>
      <button
        type="button"
        className="ui-draggable-sheet__handle"
        aria-label="패널 높이 조절"
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') { event.preventDefault(); moveTo(offset - 48) }
          if (event.key === 'ArrowDown') { event.preventDefault(); moveTo(offset + 48) }
        }}
      ><span aria-hidden="true" /></button>
      {children}
      <div className="ui-draggable-sheet__tail" aria-hidden="true" />
    </section>
  )
}

export function BottomSheet({ children, className = '', ...props }: ComponentPropsWithoutRef<'section'>) {
  return <DraggableSheet className={`ui-sheet ${className}`.trim()} {...props}>{children}</DraggableSheet>
}
