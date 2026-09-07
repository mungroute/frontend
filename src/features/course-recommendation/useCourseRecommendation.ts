import { useEffect, useState } from 'react'
import { recommendationApi } from '../../api/recommendations'
import type { CourseRecommendation } from '../../api/recommendations'

type RecommendationLoadError = {
  requestId: string
  reloadKey: number
  message: string
}

export function useCourseRecommendation(search: string) {
  const requestId = new URLSearchParams(search).get('recommendationId')
  const [recommendation, setRecommendation] = useState<CourseRecommendation>()
  const [loadError, setLoadError] = useState<RecommendationLoadError>()
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!requestId || recommendation?.requestId === requestId) return
    let active = true
    void recommendationApi.get(requestId)
      .then((response) => { if (active) setRecommendation(response) })
      .catch((error: Error) => {
        if (active) setLoadError({ requestId, reloadKey, message: error.message })
      })
    return () => { active = false }
  }, [recommendation?.requestId, reloadKey, requestId])

  return {
    recommendationRequestId: requestId,
    courseRecommendation: recommendation,
    setCourseRecommendation: setRecommendation,
    recommendationLoadError: loadError,
    recommendationReloadKey: reloadKey,
    retryRecommendation: () => setReloadKey((value) => value + 1),
  }
}
