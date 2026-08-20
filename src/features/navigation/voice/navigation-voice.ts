import type { NavigationManeuver } from '../utils/maneuver'

export type NavigationAnnouncementStage = 'far' | 'near' | 'immediate'

export const NAVIGATION_VOICE_THRESHOLDS_M = {
  far: 100,
  near: 30,
  immediate: 12,
} as const

const directionPhrases: Record<NavigationManeuver['kind'], string> = {
  STRAIGHT: '직진하세요',
  SLIGHT_LEFT: '왼쪽 완만한 방향으로 이동하세요',
  LEFT: '왼쪽으로 이동하세요',
  SHARP_LEFT: '왼쪽으로 크게 돌아 이동하세요',
  SLIGHT_RIGHT: '오른쪽 완만한 방향으로 이동하세요',
  RIGHT: '오른쪽으로 이동하세요',
  SHARP_RIGHT: '오른쪽으로 크게 돌아 이동하세요',
}

export function navigationAnnouncementStage(distanceM: number): NavigationAnnouncementStage | undefined {
  if (distanceM <= NAVIGATION_VOICE_THRESHOLDS_M.immediate) return 'immediate'
  if (distanceM <= NAVIGATION_VOICE_THRESHOLDS_M.near) return 'near'
  if (distanceM <= NAVIGATION_VOICE_THRESHOLDS_M.far) return 'far'
  return undefined
}

const spokenDistance = (distanceM: number) => Math.max(10, Math.round(distanceM / 10) * 10)

export function navigationAnnouncementText(
  maneuver: NavigationManeuver,
  stage: NavigationAnnouncementStage,
) {
  const direction = directionPhrases[maneuver.kind]
  if (stage === 'immediate') return `곧 ${direction}`
  return `${spokenDistance(maneuver.distanceM)}미터 앞에서 ${direction}`
}

export function speakNavigation(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    return false
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ko-KR'
  utterance.rate = 1
  window.speechSynthesis.speak(utterance)
  return true
}
