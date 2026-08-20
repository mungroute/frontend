import { useEffect, useRef } from 'react'
import type { NearbyPresence } from '../../../api/walks'
import { shouldNotifyDistanceTransition, showDistanceSystemNotification } from './distance-notification'

export function useDistanceNotifications(alert: NearbyPresence | undefined, enabled: boolean) {
  const previousRef = useRef<NearbyPresence | undefined>(undefined)

  useEffect(() => {
    if (!alert) {
      previousRef.current = undefined
      return
    }
    const previous = previousRef.current
    previousRef.current = alert
    if (!enabled || !shouldNotifyDistanceTransition(previous, alert)) return
    void showDistanceSystemNotification(alert).catch(() => {
      // The in-app distance alert remains the primary channel if the OS channel fails.
    })
  }, [alert, enabled])
}
