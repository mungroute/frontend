import { useEffect, useRef } from 'react'
import type { NavigationManeuver } from '../utils/maneuver'
import { cancelNavigationSpeech, navigationAnnouncementStage, navigationAnnouncementText, speakNavigation } from './navigation-voice'
import type { NavigationAnnouncementStage } from './navigation-voice'

export function useNavigationVoice({
  routeKey,
  maneuver,
  offRoute,
  enabled,
  paused,
}: {
  routeKey?: string
  maneuver?: NavigationManeuver
  offRoute?: boolean
  enabled: boolean
  paused: boolean
}) {
  const announcedRef = useRef(new Map<string, Set<NavigationAnnouncementStage>>())
  const offRouteAnnouncedRef = useRef(false)

  useEffect(() => {
    announcedRef.current.clear()
    offRouteAnnouncedRef.current = false
  }, [routeKey])

  useEffect(() => {
    if (!enabled || paused) {
      cancelNavigationSpeech()
      return
    }
    if (offRoute) {
      if (!offRouteAnnouncedRef.current) {
        speakNavigation('산책 경로에서 벗어났어요. 지도에서 경로를 확인해 주세요.')
        offRouteAnnouncedRef.current = true
      }
      return
    }
    offRouteAnnouncedRef.current = false
    if (!maneuver) return
    const stage = navigationAnnouncementStage(maneuver.distanceM)
    if (!stage) return
    const announced = announcedRef.current.get(maneuver.id) ?? new Set<NavigationAnnouncementStage>()
    if (announced.has(stage)) return
    announced.add(stage)
    announcedRef.current.set(maneuver.id, announced)
    speakNavigation(navigationAnnouncementText(maneuver, stage))
  }, [enabled, maneuver, offRoute, paused])

  useEffect(() => () => cancelNavigationSpeech(), [])
}
