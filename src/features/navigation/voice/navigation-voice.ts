import type { NavigationManeuver } from '../utils/maneuver'

export type NavigationAnnouncementStage = 'far' | 'near' | 'immediate'

export const NAVIGATION_VOICE_THRESHOLDS_M = {
  far: 100,
  near: 30,
  immediate: 12,
} as const

const directionPhrases: Record<NavigationManeuver['kind'], string> = {
  STRAIGHT: '직진하세요',
  SLIGHT_LEFT: '완만하게 좌회전하세요',
  LEFT: '좌회전하세요',
  SHARP_LEFT: '급좌회전하세요',
  SLIGHT_RIGHT: '완만하게 우회전하세요',
  RIGHT: '우회전하세요',
  SHARP_RIGHT: '급우회전하세요',
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

export type NavigationSpeechCallbacks = {
  onStart?: () => void
  onEnd?: () => void
  onError?: (reason: string) => void
}

let scheduledSpeech: number | undefined
let pendingVoiceListener: (() => void) | undefined
let pendingVoiceSynthesis: SpeechSynthesis | undefined
let speechRequestId = 0

const clearScheduledSpeech = () => {
  if (scheduledSpeech !== undefined) window.clearTimeout(scheduledSpeech)
  scheduledSpeech = undefined
  if (pendingVoiceListener && pendingVoiceSynthesis) {
    pendingVoiceSynthesis.removeEventListener('voiceschanged', pendingVoiceListener)
  }
  pendingVoiceListener = undefined
  pendingVoiceSynthesis = undefined
}

export function cancelNavigationSpeech() {
  speechRequestId += 1
  if (typeof window === 'undefined') return
  clearScheduledSpeech()
  window.speechSynthesis?.cancel()
}

export function speakNavigation(text: string, callbacks: NavigationSpeechCallbacks = {}) {
  const synthesis = typeof window === 'undefined' ? undefined : window.speechSynthesis
  const Utterance = typeof window === 'undefined' ? undefined : window.SpeechSynthesisUtterance
  if (!synthesis || typeof Utterance !== 'function') {
    callbacks.onError?.('unsupported')
    return false
  }

  cancelNavigationSpeech()
  const requestId = speechRequestId
  const utterance = new Utterance(text)
  utterance.lang = 'ko-KR'
  utterance.rate = 1
  utterance.onstart = () => callbacks.onStart?.()
  utterance.onend = () => callbacks.onEnd?.()
  utterance.onerror = (event) => callbacks.onError?.(event.error)

  const start = () => {
    if (requestId !== speechRequestId) return
    clearScheduledSpeech()
    const voices = typeof synthesis.getVoices === 'function' ? synthesis.getVoices() : []
    const koreanVoice = voices.find((voice) => voice.lang.toLowerCase() === 'ko-kr')
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('ko'))
    if (koreanVoice) utterance.voice = koreanVoice
    try {
      synthesis.resume?.()
      synthesis.speak(utterance)
    } catch {
      callbacks.onError?.('synthesis-failed')
    }
  }

  const voices = typeof synthesis.getVoices === 'function' ? synthesis.getVoices() : undefined
  if (voices?.length === 0 && typeof synthesis.addEventListener === 'function') {
    pendingVoiceSynthesis = synthesis
    pendingVoiceListener = start
    synthesis.addEventListener('voiceschanged', start, { once: true })
    scheduledSpeech = window.setTimeout(start, 350)
  } else if (voices) {
    // Chromium can discard speech queued in the same task immediately after cancel().
    scheduledSpeech = window.setTimeout(start, 60)
  } else {
    start()
  }
  return true
}
