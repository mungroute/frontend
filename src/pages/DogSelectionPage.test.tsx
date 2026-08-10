import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DogSelectionPage } from './DogSelectionPage'

describe('DogSelectionPage', () => {
  it('selects multiple dogs, configures distance mode, and confirms', () => {
    const onConfirm = vi.fn()
    render(<DogSelectionPage onConfirm={onConfirm} />)

    expect(screen.getByRole('button', { name: /망고 선택/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /쿠키 선택/ }))
    expect(screen.getByRole('button', { name: /망고 선택/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /쿠키 선택/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('switch', { name: '거리두기 모드' }))
    fireEvent.click(screen.getByRole('button', { name: '선택 완료' }))

    expect(onConfirm).toHaveBeenCalledWith({ dogIds: ['mango', 'cookie'], distanceMode: false })
  })

  it('renders the profile image saved with a registered dog', () => {
    render(
      <DogSelectionPage
        dogs={[{ id: 'mango', name: '망고', detail: '골든리트리버 · 3살', profileImageSrc: '/registered/mango.jpg' }]}
      />,
    )

    expect(screen.getByRole('img', { name: '망고 프로필' })).toHaveAttribute('src', '/registered/mango.jpg')
  })

  it('keeps at least one dog selected', () => {
    render(<DogSelectionPage />)

    fireEvent.click(screen.getByRole('button', { name: /망고 선택/ }))
    expect(screen.getByRole('button', { name: /망고 선택/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('exposes dog registration', () => {
    const onRegisterDog = vi.fn()
    render(<DogSelectionPage onRegisterDog={onRegisterDog} />)

    fireEvent.click(screen.getByRole('button', { name: '반려견 등록하기' }))
    expect(onRegisterDog).toHaveBeenCalledOnce()
  })
})
