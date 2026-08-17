import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PasswordResetPage } from './PasswordResetPage'

const { requestPasswordReset, verifyPasswordReset, confirmPasswordReset } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn().mockResolvedValue({
    message: '인증번호를 발급했습니다.',
    demoVerificationCode: '123456',
  }),
  verifyPasswordReset: vi.fn().mockResolvedValue({ resetToken: 'reset-token', expiresIn: 600 }),
  confirmPasswordReset: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../api/auth', () => ({
  authApi: { requestPasswordReset, verifyPasswordReset, confirmPasswordReset },
}))

describe('PasswordResetPage', () => {
  it('completes request, verification, and password change', async () => {
    const onComplete = vi.fn()
    render(<PasswordResetPage onBack={vi.fn()} onComplete={onComplete} />)

    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'mango@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    expect(await screen.findByText('로컬 인증번호: 123456')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '인증하기' }))
    expect(await screen.findByText('인증이 완료됐어요. 새 비밀번호를 입력해 주세요.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpass123' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    expect(confirmPasswordReset).toHaveBeenCalledWith('reset-token', 'newpass123')
  })
})
