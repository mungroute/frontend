import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotificationSettingsPage } from './NotificationSettingsPage'

describe('NotificationSettingsPage', () => {
  it.each([
    ['만나기 요청 알림', 'true'],
    ['그룹 활동', 'false'],
    ['서비스 알림', 'true'],
  ])('lets %s be changed', (label, initialValue) => {
    render(<NotificationSettingsPage />)

    const setting = screen.getByRole('switch', { name: label })
    expect(setting).toHaveAttribute('aria-checked', initialValue)
    fireEvent.click(setting)
    expect(setting).toHaveAttribute('aria-checked', initialValue === 'true' ? 'false' : 'true')
  })

  it('keeps navigation voice and watch system notifications as separate settings', () => {
    render(<NotificationSettingsPage />)

    expect(screen.getByRole('switch', { name: '내비게이션 음성 안내' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: '워치 · 시스템 알림' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('이 환경에서는 앱 안의 거리두기 알림만 사용해요')).toBeInTheDocument()
    expect(screen.getByText('거리두기 앱 내 안내')).toBeInTheDocument()
    expect(screen.getByText('기본 사용')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: '거리두기 앱 내 안내' })).not.toBeInTheDocument()
  })
})
