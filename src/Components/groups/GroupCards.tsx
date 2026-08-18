import '../../styles/components/group-controls.css'

export type GroupCardData = {
  id: string
  name: string
  summary: string
  activity: string
  membersImageSrc: string
}

export function GroupCard({ group, onClick }: { group: GroupCardData; onClick?: () => void }) {
  return (
    <button className="group-card" type="button" onClick={onClick}>
      <strong>{group.name}</strong>
      <span>{group.summary}</span>
      <img src={group.membersImageSrc} alt="" />
      <small>{group.activity}</small>
      <b aria-hidden="true">›</b>
    </button>
  )
}

export function SharedRouteRow({ title, meta, onClick }: { title: string; meta: string; onClick?: () => void }) {
  return (
    <button className="shared-route-row" type="button" aria-label={`${title} 보기`} onClick={onClick}>
      <span><strong>{title}</strong><small>{meta}</small></span>
      <b>보기 ›</b>
    </button>
  )
}

export function SharedCourseCard({ title, author, distance, saves, routeImageSrc, onClick }: { title: string; author: string; distance: string; saves: number; routeImageSrc: string; onClick?: () => void }) {
  const content = <><img src={routeImageSrc} alt="" /><span><strong>{title}</strong><small>{author} · {distance}</small><b>저장 {saves}</b></span></>
  if (onClick) return <button className="shared-course-card" type="button" aria-label={`${title} 상세 보기`} onClick={onClick}>{content}</button>
  return (
    <article className="shared-course-card">{content}</article>
  )
}

export type GroupActivity = {
  id: string
  member: string
  message: string
  time: string
  avatarSrc: string
}

export function GroupActivityItem({ activity }: { activity: GroupActivity }) {
  return (
    <li className="group-activity-item">
      <img src={activity.avatarSrc} alt="" />
      <strong>{activity.member}</strong>
      <span>{activity.message}</span>
      <small>{activity.time}</small>
    </li>
  )
}
