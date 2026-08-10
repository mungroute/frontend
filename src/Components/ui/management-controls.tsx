import type { ReactNode } from 'react'
import '../../styles/components/management-controls.css'

export function ManagementPageHeader({ title, subtitle, onBack, trailing }: { title: string; subtitle?: string; onBack?: () => void; trailing?: ReactNode }) {
  return (
    <header className="management-header">
      <button className="management-header__back" type="button" aria-label="뒤로 가기" onClick={onBack}>‹</button>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {trailing && <div className="management-header__trailing">{trailing}</div>}
    </header>
  )
}

export function MetricGrid({ items, ariaLabel }: { items: Array<{ label: string; value: string }>; ariaLabel: string }) {
  return (
    <dl className="management-metrics" aria-label={ariaLabel}>
      {items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
    </dl>
  )
}

export function RouteSummaryCard({ onClick, title = '저녁 남산길' }: { onClick?: () => void; title?: string }) {
  return (
    <button className="route-summary-card" type="button" onClick={onClick}>
      <strong>{title}</strong>
      <span className="route-summary-card__meta">29분 · 1.8km</span>
      <span className="route-summary-card__badge">그늘 68%</span>
      <span className="route-summary-card__chevron" aria-hidden="true">›</span>
    </button>
  )
}

export function DetailRow({ title, description, onClick }: { title: string; description: string; onClick?: () => void }) {
  return (
    <button className="management-detail-row" type="button" onClick={onClick}>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span aria-hidden="true">›</span>
    </button>
  )
}
