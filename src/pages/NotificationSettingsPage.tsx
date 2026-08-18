import { useEffect, useState } from 'react'
import type { NotificationSettings } from '../api/profile'
import { ManagementPageHeader, Switch } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

const initialSettings: NotificationSettings = {
  distanceEnabled: true,
  serviceEnabled: true,
  meetEnabled: true,
  groupEnabled: false,
}

const notificationOptions = [
  { key: 'distanceEnabled', label: '거리두기 접근 알림', description: '산책 중 방향·거리 범위 알림' },
  { key: 'meetEnabled', label: '만나기 요청 알림', description: '주변 산책 친구의 요청과 응답' },
  { key: 'groupEnabled', label: '그룹 활동', description: '새 코스와 초대 소식' },
  { key: 'serviceEnabled', label: '서비스 알림', description: 'GPS 상태와 중요한 이용 안내', separated: true },
] as const

type NotificationSettingsPageProps = {
  onBack?: () => void
  value?: NotificationSettings
  onChange?: (settings: NotificationSettings) => void | Promise<void>
}

export function NotificationSettingsPage({ onBack, value, onChange }: NotificationSettingsPageProps) {
  const [settings, setSettings] = useState(value ?? initialSettings)
  useEffect(() => { if (value) setSettings(value) }, [value])
  const update = (key: keyof NotificationSettings, checked: boolean) => {
    const next = { ...settings, [key]: checked }
    setSettings(next)
    void onChange?.(next)
  }

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
