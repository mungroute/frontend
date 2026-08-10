import '../../styles/components/course-visuals.css'
import { initialCoursePoints, recommendedShadeHour } from './course-data'
import type { CoursePoint } from './course-data'

const shadeBars = [
  { hour: 15, height: 26 },
  { hour: 16, height: 48 },
  { hour: 17, height: 76 },
  { hour: recommendedShadeHour, height: 94 },
  { hour: 19, height: 68 },
  { hour: 20, height: 36 },
]

export function ShadeMapOverlay() {
  return (
    <div className="shade-map-overlay" aria-hidden="true">
      <img className="shade-map-overlay__route" src="/assets/c02/route-shade-timeline.svg" alt="" />
      <img className="shade-map-overlay__segment" src="/assets/c02/route-shaded-segment.svg" alt="" />
    </div>
  )
}

export function ShadeTimelineChart() {
  return (
    <section className="shade-timeline-chart" aria-labelledby="shade-timeline-title">
      <h2 id="shade-timeline-title">오늘의 그늘 변화</h2>
      <div className="shade-timeline-chart__bars" role="list" aria-label="15시부터 20시까지 시간별 그늘 지수">
        {shadeBars.map(({ hour, height }) => (
          <div className="shade-timeline-chart__bar-column" role="listitem" aria-label={`${hour}시, 그늘 지수 ${height}`} key={hour}>
            <span className={hour === recommendedShadeHour ? 'shade-timeline-chart__bar shade-timeline-chart__bar--recommended' : 'shade-timeline-chart__bar'} style={{ height }} />
            <small>{hour}</small>
          </div>
        ))}
      </div>
      <p>{recommendedShadeHour}시 전후가 가장 시원해요</p>
    </section>
  )
}

export function EditableCourseOverlay({ points }: { points: CoursePoint[] }) {
  const addedSegments = points.slice(initialCoursePoints.length).map((point, index) => {
    const from = points[initialCoursePoints.length + index - 1]
    return {
      key: `${from.x}-${from.y}-${point.x}-${point.y}`,
      from,
      to: point,
    }
  })

  return (
    <div className="editable-course-overlay" aria-hidden="true">
      <img className="editable-course-overlay__route" src="/assets/c04/route-editable-course.svg" alt="" />
      <svg className="editable-course-overlay__extensions" viewBox="0 0 100 100" preserveAspectRatio="none">
        {addedSegments.map(({ key, from, to }) => (
          <line key={key} x1={from.x} y1={from.y} x2={to.x} y2={to.y} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {points.map((point, index) => (
        <img
          className="editable-course-overlay__point"
          src="/assets/c04/marker-edit-point.svg"
          alt=""
          key={`${point.x}-${point.y}-${index}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />
      ))}
    </div>
  )
}
