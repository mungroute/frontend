import type { NavigationManeuver } from '../utils/maneuver'

const maneuverLabels: Record<NavigationManeuver['kind'], { icon: string; label: string }> = {
  STRAIGHT: { icon: '↑', label: '직진' },
  SLIGHT_LEFT: { icon: '↖', label: '완만한 좌회전' },
  LEFT: { icon: '←', label: '좌회전' },
  SHARP_LEFT: { icon: '↰', label: '급좌회전' },
  SLIGHT_RIGHT: { icon: '↗', label: '완만한 우회전' },
  RIGHT: { icon: '→', label: '우회전' },
  SHARP_RIGHT: { icon: '↱', label: '급우회전' },
}

const distanceLabel = (distanceM: number) => distanceM >= 1_000
  ? `${(distanceM / 1_000).toFixed(1)}km`
  : `${Math.max(10, Math.round(distanceM / 10) * 10)}m`

export function NavigationHUD({ maneuver, routeName, offRoute }: { maneuver?: NavigationManeuver; routeName?: string; offRoute?: boolean }) {
  const resolved = maneuver ? maneuverLabels[maneuver.kind] : undefined
  return (
    <section className={`navigation-hud${offRoute ? ' navigation-hud--off-route' : ''}`} aria-live="polite">
      <span className="navigation-hud__icon" aria-hidden="true">{offRoute ? '!' : resolved?.icon ?? '↑'}</span>
      <div>
        <strong>{offRoute ? '경로에서 벗어났어요' : maneuver ? `${distanceLabel(maneuver.distanceM)} 뒤 ${resolved?.label}` : '경로를 따라 이동'}</strong>
        <span>{offRoute ? '지도에서 경로를 확인해 주세요' : routeName ?? '자유 산책 중'}</span>
      </div>
    </section>
  )
}

