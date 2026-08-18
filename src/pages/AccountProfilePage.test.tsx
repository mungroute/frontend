import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountProfilePage } from './AccountProfilePage'

describe('AccountProfilePage', () => {
  it('keeps the email read-only and saves only after nickname availability is confirmed', async () => {
    const onCheckNickname = vi.fn().mockResolvedValue(true)
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <AccountProfilePage
        nickname="망고 보호자"
        email="mango@example.com"
        onCheckNickname={onCheckNickname}
        onSave={onSave}
      />,
    )

    expect(screen.getByLabelText('이메일')).toBeDisabled()
    expect(screen.getByRole('button', { name: '변경 내용 저장' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '닉네임 중복 확인' }))
    expect(await screen.findByText('사용 가능한 닉네임이에요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '변경 내용 저장' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: '변경 내용 저장' }))
    expect(onCheckNickname).toHaveBeenCalledWith('망고 보호자')
    expect(onSave).toHaveBeenCalledWith({ nickname: '망고 보호자', profileImageUrl: null })
  })

  it('invalidates the previous availability check when the nickname changes', async () => {
    render(
      <AccountProfilePage
        nickname="망고 보호자"
        email="mango@example.com"
        onCheckNickname={() => true}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '닉네임 중복 확인' }))
    expect(await screen.findByText('사용 가능한 닉네임이에요.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('닉네임'), { target: { value: '새 닉네임' } })

    expect(screen.queryByText('사용 가능한 닉네임이에요.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '변경 내용 저장' })).toBeDisabled()
  })
})
