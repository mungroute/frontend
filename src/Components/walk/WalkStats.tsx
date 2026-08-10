import '../../styles/components/walk-stats.css'

type WalkStatsProps = {
  time: string
  distance: string
  compact?: boolean
}

export function WalkStats({ time, distance, compact = false }: WalkStatsProps) {
  return (
    <div className={`walk-stats${compact ? ' walk-stats--compact' : ''}`}>
      <div><strong>{time}</strong><span>산책 시간</span></div>
      <div><strong>{distance}</strong><span>이동 거리</span></div>
    </div>
  )
}
