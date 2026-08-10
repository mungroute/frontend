import { Button } from '../ui'
import '../../styles/components/error-status-page.css'

type ErrorStatusPageProps = {
  code: string
  leadingDigit: string
  trailingDigit: string
  title: string
  description: string
  actionLabel: string
  mascotAlt: string
  onAction: () => void
}

export function ErrorStatusPage({
  code,
  leadingDigit,
  trailingDigit,
  title,
  description,
  actionLabel,
  mascotAlt,
  onAction,
}: ErrorStatusPageProps) {
  return (
    <main className="error-status-page">
      <div className="error-status-page__code" aria-label={`${code} 오류`}>
        <span aria-hidden="true">{leadingDigit}</span>
        <img src="/assets/mascot/animated/07-error-confused.gif" alt={mascotAlt} />
        <span aria-hidden="true">{trailingDigit}</span>
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
      <Button onClick={onAction}>{actionLabel}</Button>
    </main>
  )
}
