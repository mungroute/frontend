import { useCallback, useEffect, useRef, useState } from 'react'
import '../styles/pages/journey-page.css'
import '../styles/pages/route-generating-page.css'

type RouteGeneratingPageProps = {
  duration?: number
  onComplete?: () => void
  onGenerate?: () => Promise<void>
}

export function RouteGeneratingPage({ duration = 30, onComplete, onGenerate }: RouteGeneratingPageProps) {
  const started = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [retryCount, setRetryCount] = useState(0)

  const generate = useCallback(async () => {
    if (!onGenerate) return
    setErrorMessage(undefined)
    try {
      await onGenerate()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '추천 코스를 만들지 못했어요.')
    }
  }, [onGenerate])

  useEffect(() => {
    if (onGenerate) {
      if (started.current) return
      started.current = true
      void generate()
      return
    }
    if (!onComplete) return
    const timer = window.setTimeout(onComplete, 1_400)
    return () => window.clearTimeout(timer)
  }, [generate, onComplete, onGenerate, retryCount])

  const retry = () => {
    started.current = false
    setRetryCount((value) => value + 1)
  }

  return (
    <main className="journey-page route-generating-page" aria-busy={!errorMessage}>
      <div className="route-generating-page__status" role="status" aria-live="polite">
        <h1>{errorMessage ? '코스를 찾지 못했어요' : `${duration}분에 맞는 길을 찾고 있어요`}</h1>
        <p>{errorMessage ?? '그늘과 노면 온도를 함께 살펴보는 중이에요'}</p>
      </div>

      <img
        className="route-generating-page__visual"
        src="/assets/mascot/animated/03-route-search.gif"
        alt="코스를 찾는 중인 강아지"
      />

      {errorMessage ? (
        <button className="journey-page__primary-action route-generating-page__retry" type="button" onClick={retry}>다시 찾아보기</button>
      ) : (
        <div className="route-generating-page__skeletons" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div className="route-generating-page__skeleton" data-testid="route-card-skeleton" key={index}>
              <span />
              <span />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
