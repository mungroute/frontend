import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotificationSettingsPage } from './NotificationSettingsPage'

describe('NotificationSettingsPage', () => {
  it.each([
    ['거리두기 접근 알림', 'true'],
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
})
