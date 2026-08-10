import { Navigation, ShieldCheck } from 'lucide-react'
import { Button, Card } from '../Components/ui'
import '../styles/pages/location-permission-page.css'

type LocationPermissionPageProps = {
  onRequestPermission: () => void
}

export function LocationPermissionPage({ onRequestPermission }: LocationPermissionPageProps) {
  return (
    <main className="location-permission-page" aria-labelledby="location-permission-title">
      <header className="location-permission-page__header">
        <span className="location-permission-page__brand-mark" aria-hidden="true">
          <Navigation size={18} fill="currentColor" />
        </span>
        <span>멍루트</span>
      </header>

      <section className="location-permission-page__content">
        <div className="location-permission-page__visual" aria-hidden="true">
          <img src="/assets/mascot/animated/02-walk-start.gif" alt="" />
        </div>

        <div className="location-permission-page__copy">
          <span className="location-permission-page__eyebrow">현재 위치 확인</span>
          <h1 id="location-permission-title" aria-label="산책 시작 위치를 알려주세요">산책 시작 위치를<br />알려주세요</h1>
          <p>현재 위치를 확인하면 지금 시간과 날씨에 맞는 산책 코스를 찾아드릴 수 있어요.</p>
        </div>

        <Card className="location-permission-page__privacy">
          <span className="location-permission-page__privacy-icon" aria-hidden="true">
            <ShieldCheck size={21} />
          </span>
          <div>
            <strong>위치는 산책 기능을 사용할 때만 확인해요</strong>
            <p>다른 사용자에게 정확한 위치를 보여주지 않아요.</p>
          </div>
        </Card>
      </section>

      <footer className="location-permission-page__footer">
        <Button onClick={onRequestPermission}>위치 권한 확인</Button>
      </footer>
    </main>
  )
}
