import '../../styles/components/profile-controls.css'

export type DogProfileSummary = {
  id: string
  name: string
  detail: string
  profileImageSrc?: string
}

export function DogAvatar({ name, src, size = 'medium' }: { name: string; src?: string; size?: 'medium' | 'large' }) {
  return (
    <span className={`dog-avatar dog-avatar--${size}`}>
      {src ? <img src={src} alt={`${name} 프로필`} /> : <><img src="/assets/my01/dog-avatar-base.svg" alt="" /><span aria-hidden="true">🐾</span><span className="sr-only">{name} 프로필</span></>}
    </span>
  )
}

export function DogProfileCard({ dog, actionLabel, onAction, large = false }: { dog: DogProfileSummary; actionLabel?: string; onAction?: () => void; large?: boolean }) {
  return (
    <article className={`dog-profile-card${large ? ' dog-profile-card--large' : ''}`}>
      <DogAvatar name={dog.name} src={dog.profileImageSrc} size={large ? 'large' : 'medium'} />
      <span className="dog-profile-card__copy"><strong>{dog.name}</strong><small>{dog.detail}</small></span>
      {actionLabel && <button type="button" aria-label={`${dog.name} ${actionLabel}`} onClick={onAction}>{actionLabel}</button>}
    </article>
  )
}
