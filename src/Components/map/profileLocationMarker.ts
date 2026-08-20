import type { MapMarker } from './types'

const DEFAULT_PROFILE_IMAGE = '/assets/shared/dog-profile-default.svg'

type ProfileLocationMarkerOptions = {
  interactive?: boolean
  onClick?: () => void
}

export function createProfileLocationMarkerElement(
  marker: MapMarker,
  { interactive = false, onClick }: ProfileLocationMarkerOptions = {},
) {
  const element = document.createElement(interactive ? 'button' : 'div')
  element.className = `map-dog-location-marker${interactive ? ' map-dog-location-marker--interactive' : ''}`
  element.dataset.interactionId = marker.interactionId ?? marker.id
  element.dataset.latitude = String(marker.position.latitude)
  element.dataset.longitude = String(marker.position.longitude)

  if (element instanceof HTMLButtonElement) {
    element.type = 'button'
    element.setAttribute('aria-label', `${marker.label || '산책 친구'} 프로필 보기`)
    if (onClick) element.addEventListener('click', onClick)
  }

  const card = document.createElement('span')
  card.className = 'map-dog-location-marker__card'
  const image = document.createElement('img')
  image.className = 'map-dog-location-marker__avatar'
  image.src = marker.profileImageSrc || DEFAULT_PROFILE_IMAGE
  image.alt = ''
  image.addEventListener('error', () => {
    if (!image.src.endsWith(DEFAULT_PROFILE_IMAGE)) image.src = DEFAULT_PROFILE_IMAGE
  }, { once: true })
  const label = document.createElement('strong')
  label.textContent = marker.label || (interactive ? '산책 친구' : '내 위치')
  card.append(image, label)

  const pointer = document.createElement('span')
  pointer.className = 'map-dog-location-marker__pointer'
  const dot = document.createElement('span')
  dot.className = 'map-dog-location-marker__dot'
  element.append(card, pointer, dot)
  return element
}
