import { BellRing, Watch } from 'lucide-react'
import { Button } from '../../../Components/ui'

export function DistanceNotificationPermissionDialog({
  onAllow,
  onLater,
}: {
  onAllow: () => void | Promise<void>
  onLater: () => void
}) {
  return (
    <div className="distance-notification-permission__backdrop">
      <section className="distance-notification-permission" role="dialog" aria-modal="true" aria-labelledby="distance-notification-permission-title">
        <div className="distance-notification-permission__icons" aria-hidden="true"><Watch /><BellRing /></div>
        <h2 id="distance-notification-permission-title">워치에서도 알림을 받아볼까요?</h2>
        <p>다른 강아지가 가까워지면 멍루트 화면에서도 알려드리고, 시스템 알림을 허용하면 연결된 워치에서도 확인할 수 있어요.</p>
        <Button onClick={() => void onAllow()}>워치 알림 받기</Button>
        <button className="distance-notification-permission__later" type="button" onClick={onLater}>나중에 하기</button>
        <strong>알림을 허용하지 않아도 멍루트 앱 안의 거리두기 알림은 계속 표시돼요.</strong>
      </section>
    </div>
  )
}
