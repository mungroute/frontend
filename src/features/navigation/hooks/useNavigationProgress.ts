import { useEffect, useMemo, useRef, useState } from 'react'
import type { NavigationPositionFix, WalkNavigationRoute } from '../types'
import { buildRouteProgress, prepareRoute, projectOnRoute } from '../utils/route-progress'
import type { RouteProgressGeometry } from '../utils/route-progress'

export function useNavigationProgress(route: WalkNavigationRoute | null, position?: NavigationPositionFix, paused = false) {
  const prepared = useMemo(
    () => route?.navigationPolyline ? prepareRoute(route.navigationPolyline) : undefined,
    [route],
  )
  const progressRef = useRef<number | undefined>(undefined)
  const [progressState, setProgressState] = useState<{ routeKey?: string; progress?: RouteProgressGeometry }>({})
  const progress = progressState.routeKey === route?.routeKey ? progressState.progress : undefined

  useEffect(() => {
    progressRef.current = undefined
  }, [route?.routeKey])

  useEffect(() => {
    if (!prepared || !position || paused) return
    const frame = requestAnimationFrame(() => {
      const projection = projectOnRoute(position.coordinate, prepared, progressRef.current)
      progressRef.current = projection.progressM
      setProgressState({ routeKey: route?.routeKey, progress: buildRouteProgress(prepared, projection) })
    })
    return () => cancelAnimationFrame(frame)
  }, [paused, position, prepared, route?.routeKey])

  return { prepared, progress }
}
