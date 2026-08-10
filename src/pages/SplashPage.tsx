import { useEffect } from 'react'
import '../styles/pages/splash-page.css'

export function SplashPage({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    if (!onReady) return
    const timer = window.setTimeout(onReady, 1_000)
    return () => window.clearTimeout(timer)
  }, [onReady])

  return (
    <main className="splash-page" aria-labelledby="splash-title">
      <div className="splash-page__route splash-page__route--top" aria-hidden="true" />
      <div className="splash-page__route splash-page__route--bottom" aria-hidden="true" />

      <section className="splash-page__brand">
        <h1 className="sr-only" id="splash-title">멍루트</h1>
        <img className="splash-page__logo" src="/assets/brand/logo-stacked@2x.png" alt="" />
        <div className="splash-page__copy">
          <strong>산책은 길보다 시간이 먼저니까</strong>
          <p>오늘의 시간과 날씨에 맞는 길을 찾아요</p>
        </div>
      </section>

      <div className="splash-page__loading" role="status" aria-live="polite">
        <span className="splash-page__loading-track" aria-hidden="true">
          <span className="splash-page__loading-progress" />
        </span>
        <span className="sr-only">멍루트를 준비하고 있어요</span>
      </div>
    </main>
  )
}
