import { useState } from 'react'
import { Clock3 } from 'lucide-react'
import { BaseMapViewport } from '../Components/map'
import type { BaseMapBinding } from '../Components/map'
import { BottomSheet, TimePicker } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/walk-duration-page.css'

type WalkDurationPageProps = {
  initialDuration?: number
  initialDepartureDialogOpen?: boolean
  map?: BaseMapBinding
  onBack?: () => void
  onContinue?: (duration: number, departureAt: string) => void
  onSelectDepartureTime?: () => void
}

const padTimePart = (value: number) => String(value).padStart(2, '0')

function formatKoreanTime(value: string) {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  const period = hours >= 12 ? '오후' : '오전'
  const displayHours = hours % 12 || 12
  return `${period} ${padTimePart(displayHours)}:${padTimePart(minutes)}`
}

function resolveDepartureAt(value: string | null, now = new Date()) {
  if (!value) return now.toISOString()
  const [hours, minutes] = value.split(':').map(Number)
  const departureAt = new Date(now)
  departureAt.setHours(hours, minutes, 0, 0)
  if (departureAt.getTime() < now.getTime() - 60_000) departureAt.setDate(departureAt.getDate() + 1)
  return departureAt.toISOString()
}

export function WalkDurationPage({
  initialDuration = 30,
  initialDepartureDialogOpen = false,
  map,
  onBack = () => window.history.back(),
  onContinue = () => undefined,
  onSelectDepartureTime = () => undefined,
}: WalkDurationPageProps) {
  const [duration, setDuration] = useState(initialDuration)
  const [departureTime, setDepartureTime] = useState<string | null>(null)
  const [draftPeriod, setDraftPeriod] = useState<'am' | 'pm'>(initialDepartureDialogOpen ? 'pm' : 'am')
  const [draftHourInput, setDraftHourInput] = useState(initialDepartureDialogOpen ? '6' : '')
  const [draftMinuteInput, setDraftMinuteInput] = useState(initialDepartureDialogOpen ? '30' : '')
  const [isDepartureDialogOpen, setIsDepartureDialogOpen] = useState(initialDepartureDialogOpen)
  const draftHours = Number(draftHourInput)
  const draftMinutes = Number(draftMinuteInput)
  const hasValidDraftTime = draftHourInput !== ''
    && draftMinuteInput !== ''
    && Number.isInteger(draftHours)
    && Number.isInteger(draftMinutes)
    && draftHours >= 1
    && draftHours <= 12
    && draftMinutes >= 0
    && draftMinutes <= 59
  const draftDepartureTime = hasValidDraftTime
    ? `${padTimePart((draftHours % 12) + (draftPeriod === 'pm' ? 12 : 0))}:${padTimePart(draftMinutes)}`
    : ''

  const setDraftFromTime = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    setDraftPeriod(hours >= 12 ? 'pm' : 'am')
    setDraftHourInput(String(hours % 12 || 12))
    setDraftMinuteInput(padTimePart(minutes))
  }

  const openDepartureDialog = () => {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setDraftFromTime(departureTime ?? currentTime)
    setIsDepartureDialogOpen(true)
    onSelectDepartureTime()
  }

  const closeDepartureDialog = () => setIsDepartureDialogOpen(false)

  const confirmDepartureTime = () => {
    if (!draftDepartureTime) return
    setDepartureTime(draftDepartureTime)
    closeDepartureDialog()
  }

  return (
    <main className="journey-page walk-duration-page">
      <header className="walk-duration-page__header">
        <button className="journey-page__back" type="button" aria-label="뒤로 가기" onClick={onBack}>‹</button>
        <h1>오늘 몇 분 걸을까요?</h1>
      </header>

      <section className="walk-duration-page__time-card" aria-labelledby="duration-card-title">
        <h2 id="duration-card-title">얼마나 걸을까요?</h2>
        <TimePicker value={duration} onChange={setDuration} variant="compact" />
        <p>5분 단위로 스크롤해 선택</p>
      </section>

      <section className="walk-duration-page__departure" aria-labelledby="departure-title">
        <h2 id="departure-title">출발 시간</h2>
        <div>
          <span>{departureTime ?? '지금'}</span>
          <button type="button" onClick={openDepartureDialog}>{departureTime ? '시간 변경' : '시간 선택'} <span aria-hidden="true">›</span></button>
        </div>
      </section>

      <BaseMapViewport
        className="walk-duration-page__map"
        ariaLabel="출발 지점 미리보기 지도"
        map={map}
        fallback={{ src: '/assets/s03/map-preview.jpg' }}
      />

      <button
        className="journey-page__primary-action walk-duration-page__continue"
        type="button"
        onClick={() => onContinue(duration, resolveDepartureAt(departureTime))}
      >
        {duration}분 코스 보기
      </button>

      {isDepartureDialogOpen && (
        <div
          className="walk-duration-page__dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="departure-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDepartureDialog()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeDepartureDialog()
          }}
        >
          <BottomSheet>
            <div className="walk-duration-page__dialog-header">
              <h2 id="departure-dialog-title">출발 시간 선택</h2>
              <button type="button" aria-label="출발 시간 선택 닫기" onClick={closeDepartureDialog}>×</button>
            </div>
            <p className="walk-duration-page__dialog-description">산책을 시작할 시각을 선택해 주세요.</p>
            <div className="walk-duration-page__time-composer">
              <div className="walk-duration-page__period-toggle" role="group" aria-label="오전 오후 선택">
                <button
                  type="button"
                  aria-label="오전 선택"
                  aria-pressed={draftPeriod === 'am'}
                  onClick={() => setDraftPeriod('am')}
                >
                  오전
                </button>
                <button
                  type="button"
                  aria-label="오후 선택"
                  aria-pressed={draftPeriod === 'pm'}
                  onClick={() => setDraftPeriod('pm')}
                >
                  오후
                </button>
              </div>
              <label className="walk-duration-page__time-number">
                <span>시</span>
                <input
                  type="number"
                  aria-label="출발 시"
                  min="1"
                  max="12"
                  value={draftHourInput}
                  onChange={(event) => setDraftHourInput(event.target.value)}
                  autoFocus
                />
              </label>
              <span className="walk-duration-page__time-colon" aria-hidden="true">:</span>
              <label className="walk-duration-page__time-number">
                <span>분</span>
                <input
                  type="number"
                  aria-label="출발 분"
                  min="0"
                  max="59"
                  value={draftMinuteInput}
                  onChange={(event) => setDraftMinuteInput(event.target.value)}
                />
              </label>
            </div>
            <div className="walk-duration-page__time-preview" aria-live="polite">
              <span>선택한 시간</span>
              <strong>{hasValidDraftTime ? formatKoreanTime(draftDepartureTime) : '시간을 입력해 주세요'}</strong>
              <Clock3 size={24} aria-hidden="true" />
            </div>
            <div className="walk-duration-page__dialog-actions">
              <button type="button" onClick={closeDepartureDialog}>취소</button>
              <button type="button" onClick={confirmDepartureTime} disabled={!hasValidDraftTime}>선택 완료</button>
            </div>
          </BottomSheet>
        </div>
      )}
    </main>
  )
}
