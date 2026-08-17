import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MyPage } from './MyPage'

describe('MyPage', () => {
  it('shows the saved profile and opens dog management', () => {
    const onOpenDogs = vi.fn()
    const onOpenGroups = vi.fn()
    render(<MyPage onOpenDogs={onOpenDogs} onOpenGroups={onOpenGroups} profileImageSrc="/registered/mango.jpg" />)

    expect(screen.getByRole('heading', { name: '마이' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '망고 프로필' })).toHaveAttribute('src', '/registered/mango.jpg')
    expect(screen.getByRole('link', { name: '마이' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: /반려견 관리/ }))
    expect(onOpenDogs).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /그룹 관리/ }))
    expect(onOpenGroups).toHaveBeenCalledOnce()
  })

  it('opens walk statistics from the summary row', () => {
    const onOpenStats = vi.fn()
    render(<MyPage onOpenStats={onOpenStats} />)

    fireEvent.click(screen.getByRole('button', { name: /산책 통계/ }))
    expect(onOpenStats).toHaveBeenCalledOnce()
  })

  it('keeps the welcome copy and logout action in the page header', () => {
    const onLogout = vi.fn()
    render(<MyPage userNickname="aaaa" onLogout={onLogout} />)

    expect(screen.getByText('aaaa님')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(onLogout).toHaveBeenCalledOnce()
  })
})
