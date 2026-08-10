import type { CSSProperties } from 'react'
import '../../styles/components/profile-controls.css'

export type WeeklyDistance = {
  day: string
  value: number
  highlighted?: boolean
}

type WeeklyDistanceChartProps = {
  data: WeeklyDistance[]
}

export function WeeklyDistanceChart({ data }: WeeklyDistanceChartProps) {
  const maximum = Math.max(...data.map((item) => item.value), 1)

  return (
    <figure className="weekly-distance-chart" role="img" aria-label="요일별 주간 거리">
      <figcaption>주간 거리</figcaption>
      <div className="weekly-distance-chart__plot">
        {data.map((item) => (
          <div className="weekly-distance-chart__column" key={item.day}>
            <span
              className={`weekly-distance-chart__bar${item.highlighted ? ' weekly-distance-chart__bar--highlighted' : ''}`}
              style={{ '--bar-ratio': item.value / maximum } as CSSProperties}
              title={`${item.day}요일 ${item.value}km`}
            />
            <span className="weekly-distance-chart__day">{item.day}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}
