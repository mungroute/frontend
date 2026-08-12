import type { CSSProperties } from 'react'
import '../../styles/components/distance-range-control.css'

type DistanceRangeControlProps = {
  value: number
  onChange?: (value: number) => void
}

const MIN_DISTANCE = 50
const MAX_DISTANCE = 500
const STEP = 50

export function DistanceRangeControl({ value, onChange }: DistanceRangeControlProps) {
  const normalizedValue = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, value))
  const progress = ((normalizedValue - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)) * 100
  const style = { '--distance-range-progress': `${progress}%` } as CSSProperties

  return (
    <section className="distance-range-control" aria-labelledby="distance-range-title">
      <div className="distance-range-control__heading">
        <span id="distance-range-title">주변 친구 알림 범위</span>
        <strong>{normalizedValue}m</strong>
      </div>
      <input
        className="distance-range-control__slider"
        type="range"
        min={MIN_DISTANCE}
        max={MAX_DISTANCE}
        step={STEP}
        value={normalizedValue}
        aria-label="거리두기 알림 범위"
        aria-valuetext={`${normalizedValue}미터`}
        style={style}
        onChange={(event) => onChange?.(Number(event.target.value))}
      />
      <div className="distance-range-control__limits" aria-hidden="true"><span>50m</span><span>500m</span></div>
    </section>
  )
}
