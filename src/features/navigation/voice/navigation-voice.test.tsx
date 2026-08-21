import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { navigationAnnouncementText, speakNavigation } from './navigation-voice'
import { useNavigationVoice } from './useNavigationVoice'
import type { NavigationManeuver } from '../utils/maneuver'

class TestUtterance {
  text: string
  lang = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(text: string) { this.text = text }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('navigation voice', () => {
  it('creates short Korean walking directions without invented road names', () => {
    const maneuver: NavigationManeuver = { id: 'turn-1', kind: 'RIGHT', distanceM: 82 }
    expect(navigationAnnouncementText(maneuver, 'far')).toBe('80미터 앞에서 오른쪽으로 이동하세요')
    expect(navigationAnnouncementText({ ...maneuver, distanceM: 9 }, 'immediate')).toBe('곧 오른쪽으로 이동하세요')
  })

  it('announces each stage once and announces a new maneuver separately', () => {
    const speechSynthesis = { cancel: vi.fn(), speak: vi.fn() }
    vi.stubGlobal('speechSynthesis', speechSynthesis)
    vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance)
    const initialProps = {
      routeKey: 'route-1',
      maneuver: { id: 'turn-1', kind: 'RIGHT', distanceM: 82 } as NavigationManeuver,
      offRoute: false,
      enabled: true,
      paused: false,
    }
    const { rerender } = renderHook((props) => useNavigationVoice(props), { initialProps })

    expect(speechSynthesis.speak).toHaveBeenCalledOnce()
    rerender({ ...initialProps, maneuver: { ...initialProps.maneuver, distanceM: 75 } })
    expect(speechSynthesis.speak).toHaveBeenCalledOnce()
    rerender({ ...initialProps, maneuver: { ...initialProps.maneuver, distanceM: 28 } })
    expect(speechSynthesis.speak).toHaveBeenCalledTimes(2)
    rerender({ ...initialProps, maneuver: { id: 'turn-2', kind: 'LEFT', distanceM: 90 } })
    expect(speechSynthesis.speak).toHaveBeenCalledTimes(3)
  })

  it('does not speak when voice guidance is disabled', () => {
    const speechSynthesis = { cancel: vi.fn(), speak: vi.fn() }
    vi.stubGlobal('speechSynthesis', speechSynthesis)
    vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance)
    renderHook(() => useNavigationVoice({
      routeKey: 'route-1',
      maneuver: { id: 'turn-1', kind: 'RIGHT', distanceM: 20 },
      enabled: false,
      paused: false,
    }))
    expect(speechSynthesis.speak).not.toHaveBeenCalled()
  })

  it('waits for Chromium cancellation, resumes the engine and selects a Korean voice', () => {
    vi.useFakeTimers()
    const koreanVoice = { lang: 'ko-KR' } as SpeechSynthesisVoice
    const speechSynthesis = {
      cancel: vi.fn(),
      resume: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => [koreanVoice]),
    }
    vi.stubGlobal('speechSynthesis', speechSynthesis)
    vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance)

    expect(speakNavigation('테스트 안내입니다.')).toBe(true)
    expect(speechSynthesis.speak).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60)

    expect(speechSynthesis.resume).toHaveBeenCalledOnce()
    expect(speechSynthesis.speak).toHaveBeenCalledOnce()
    expect(speechSynthesis.speak.mock.calls[0][0]).toMatchObject({ lang: 'ko-KR', voice: koreanVoice })
  })

  it('reports unsupported browsers instead of failing silently', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    vi.stubGlobal('SpeechSynthesisUtterance', undefined)
    const onError = vi.fn()

    expect(speakNavigation('테스트 안내입니다.', { onError })).toBe(false)
    expect(onError).toHaveBeenCalledWith('unsupported')
  })
})
