import '../../styles/components/profile-controls.css'

export type DogProfileSummary = {
  id: string
  name: string
  detail: string
  profileImageSrc?: string
  temperamentTags?: string[]
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
  const tags = dog.temperamentTags ?? []
  const visibleTags = large ? tags.slice(0, 1) : tags
  return (
    <article className={`dog-profile-card${large ? ' dog-profile-card--large' : ''}`}>
      <DogAvatar name={dog.name} src={dog.profileImageSrc} size={large ? 'large' : 'medium'} />
      <span className="dog-profile-card__copy">
        <strong>{dog.name}</strong>
        <small>{dog.detail}</small>
        {tags.length > 0 && (
          <span className="dog-profile-card__tags" aria-label={`${dog.name} 특징`}>
            {visibleTags.map((tag) => <em key={tag}>#{tag.replace(/^#/, '')}</em>)}
            {large && tags.length > visibleTags.length && <em className="dog-profile-card__tag-count">+{tags.length - visibleTags.length}</em>}
          </span>
        )}
      </span>
      {actionLabel && <button type="button" aria-label={`${dog.name} ${actionLabel}`} onClick={onAction}>{actionLabel}</button>}
    </article>
  )
}
