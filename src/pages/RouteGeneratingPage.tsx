import { useEffect } from 'react'
import '../styles/pages/journey-page.css'
import '../styles/pages/route-generating-page.css'

type RouteGeneratingPageProps = {
  duration?: number
  onComplete?: () => void
}

export function RouteGeneratingPage({ duration = 30, onComplete }: RouteGeneratingPageProps) {
  useEffect(() => {
    if (!onComplete) return
    const timer = window.setTimeout(onComplete, 1_400)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return (
    <main className="journey-page route-generating-page" aria-busy="true">
      <div className="route-generating-page__status" role="status" aria-live="polite">
        <h1>{duration}분에 맞는 길을 찾고 있어요</h1>
        <p>그늘과 흙·잔디 구간을 함께 살펴보는 중이에요</p>
      </div>

      <img
        className="route-generating-page__visual"
        src="/assets/mascot/animated/03-route-search.gif"
        alt="코스를 찾는 중인 강아지"
      />

      <div className="route-generating-page__skeletons" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div className="route-generating-page__skeleton" data-testid="route-card-skeleton" key={index}>
            <span />
            <span />
          </div>
        ))}
      </div>
    </main>
  )
}
