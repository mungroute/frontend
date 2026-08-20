import { useState } from 'react'
import type { NotificationSettings } from '../api/profile'
import { ManagementPageHeader, Switch } from '../Components/ui'
import { getExternalNotificationPermission, requestExternalNotificationPermission } from '../features/distance-alert/notifications/notification-permission'
import type { ExternalNotificationPermission } from '../features/distance-alert/notifications/notification-permission'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

const initialSettings: NotificationSettings = {
  distanceEnabled: true,
  serviceEnabled: true,
  meetEnabled: true,
  groupEnabled: false,
}

const notificationOptions = [
  { key: 'meetEnabled', label: '만나기 요청 알림', description: '주변 산책 친구의 요청과 응답' },
  { key: 'groupEnabled', label: '그룹 활동', description: '새 코스와 초대 소식' },
  { key: 'serviceEnabled', label: '서비스 알림', description: 'GPS 상태와 중요한 이용 안내', separated: true },
] as const

type NotificationSettingsPageProps = {
  onBack?: () => void
  value?: NotificationSettings
  onChange?: (settings: NotificationSettings) => void | Promise<void>
  navigationVoiceEnabled?: boolean
  watchSystemNotificationEnabled?: boolean
  onNavigationVoiceEnabledChange?: (enabled: boolean) => void
  onWatchSystemNotificationEnabledChange?: (enabled: boolean) => void
}

const permissionDescription = (permission: ExternalNotificationPermission) => {
  if (permission === 'granted') return '연결된 기기에서도 거리두기 알림을 받을 수 있어요'
  if (permission === 'denied') return '꺼짐 · 앱 안의 거리두기 알림은 정상 표시돼요'
  if (permission === 'unsupported') return '이 환경에서는 앱 안의 거리두기 알림만 사용해요'
  return '켜면 시스템 권한을 확인해요'
}

export function NotificationSettingsPage({
  onBack,
  value,
  onChange,
  navigationVoiceEnabled,
  watchSystemNotificationEnabled,
  onNavigationVoiceEnabledChange,
  onWatchSystemNotificationEnabledChange,
}: NotificationSettingsPageProps) {
  const [localSettings, setLocalSettings] = useState(initialSettings)
  const [localVoiceEnabled, setLocalVoiceEnabled] = useState(true)
  const [localWatchEnabled, setLocalWatchEnabled] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState(getExternalNotificationPermission)
  const settings = value ?? localSettings
  const voiceEnabled = navigationVoiceEnabled ?? localVoiceEnabled
  const watchEnabled = watchSystemNotificationEnabled ?? localWatchEnabled
  const update = (key: keyof NotificationSettings, checked: boolean) => {
    const next = { ...settings, [key]: checked }
    setLocalSettings(next)
    void onChange?.(next)
  }
  const updateVoice = (checked: boolean) => {
    setLocalVoiceEnabled(checked)
    onNavigationVoiceEnabledChange?.(checked)
  }
  const updateWatch = async (checked: boolean) => {
    setLocalWatchEnabled(checked)
    onWatchSystemNotificationEnabledChange?.(checked)
    if (checked && notificationPermission === 'default') {
      setNotificationPermission(await requestExternalNotificationPermission())
    }
  }

  return (
    <main className="journey-page extended-management-page notification-settings-page">
      <ManagementPageHeader title="알림 설정" subtitle="필요한 순간에만 차분하게 알려드려요" onBack={onBack} />
      <div className="notification-settings-page__list">
        <h2>알림 및 안내</h2>
        <div className="notification-settings-page__item">
          <Switch checked={voiceEnabled} onChange={updateVoice} label="내비게이션 음성 안내" description="경로의 회전 시점을 한국어 음성으로 알려드려요" ariaLabel="내비게이션 음성 안내" />
        </div>
        <div className="notification-settings-page__item">
          <Switch checked={watchEnabled} onChange={(checked) => void updateWatch(checked)} label="워치 · 시스템 알림" description={permissionDescription(notificationPermission)} ariaLabel="워치 · 시스템 알림" />
        </div>
        {notificationPermission === 'denied' && <p className="notification-settings-page__permission-help">워치에서도 알림을 받으려면 기기 또는 브라우저 설정에서 멍루트 알림을 허용해 주세요.</p>}
        <div className="notification-settings-page__core-info" role="status">
          <span><strong>거리두기 앱 내 안내</strong><small>거리두기 모드 활성 시 방향·거리·접근 상태를 기본 표시</small></span>
          <b>기본 사용</b>
        </div>
        <h2>앱 활동 알림</h2>
        {notificationOptions.map((option) => (
          <div className={'separated' in option && option.separated ? 'notification-settings-page__item notification-settings-page__item--separated' : 'notification-settings-page__item'} key={option.key}>
            <Switch checked={settings[option.key]} onChange={(checked) => update(option.key, checked)} label={option.label} description={option.description} ariaLabel={option.label} />
          </div>
        ))}
      </div>
      <p className="notification-settings-page__privacy">시스템 알림에는 상대방의 이름, 프로필, 정확한 위치를 표시하지 않아요.</p>
    </main>
  )
}
