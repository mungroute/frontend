import { useState } from 'react'
import { ManagementPageHeader, Switch } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

const initialSettings = {
  distance: true,
  gps: true,
  group: false,
  marketing: false,
}

const notificationOptions = [
  { key: 'distance', label: '거리두기 접근 알림', description: '산책 중 방향·거리 범위 알림' },
  { key: 'gps', label: 'GPS 상태 알림', description: '기록이 불안정할 때 표시' },
  { key: 'group', label: '그룹 활동', description: '새 코스와 초대 소식' },
  { key: 'marketing', label: '마케팅 알림', description: '이벤트와 업데이트', separated: true },
] as const

export function NotificationSettingsPage({ onBack }: { onBack?: () => void }) {
  const [settings, setSettings] = useState(initialSettings)
  const update = (key: keyof typeof initialSettings, checked: boolean) => setSettings((current) => ({ ...current, [key]: checked }))

  return (
    <main className="journey-page extended-management-page notification-settings-page">
      <ManagementPageHeader title="알림 설정" subtitle="필요한 순간에만 차분하게 알려드려요" onBack={onBack} />
      <div className="notification-settings-page__list">
        {notificationOptions.map((option) => (
          <div className={'separated' in option && option.separated ? 'notification-settings-page__item notification-settings-page__item--separated' : 'notification-settings-page__item'} key={option.key}>
            <Switch checked={settings[option.key]} onChange={(checked) => update(option.key, checked)} label={option.label} description={option.description} ariaLabel={option.label} />
          </div>
        ))}
      </div>
      <p className="notification-settings-page__privacy">거리두기 알림은 상대방의 이름이나 위치를 저장하지 않아요.</p>
    </main>
  )
}
