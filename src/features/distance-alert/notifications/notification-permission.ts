export type ExternalNotificationPermission = NotificationPermission | 'unsupported'

export function getExternalNotificationPermission(): ExternalNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestExternalNotificationPermission(): Promise<ExternalNotificationPermission> {
  const current = getExternalNotificationPermission()
  if (current !== 'default') return current
  return Notification.requestPermission()
}
