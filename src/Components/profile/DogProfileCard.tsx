import '../../styles/components/profile-controls.css'

export type DogProfileSummary = {
  id: string
  name: string
  detail: string
  profileImageSrc?: string
}

export const DEFAULT_DOG_PROFILE_IMAGE = '/assets/shared/dog-profile-default.svg'

export function DogAvatar({ name, src, size = 'medium' }: { name: string; src?: string; size?: 'medium' | 'large' }) {
  return (
    <span className={`dog-avatar dog-avatar--${size}`}>
      <img src={src || DEFAULT_DOG_PROFILE_IMAGE} alt={`${name} 프로필`} />
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
