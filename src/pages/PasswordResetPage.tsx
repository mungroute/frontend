import { useState } from 'react'
import { authApi } from '../api/auth'
import { AuthShell } from '../Components/auth/AuthShell'
import { Button, TextField } from '../Components/ui'

type PasswordResetPageProps = {
  onBack: () => void
  onComplete: () => void
}

type Step = 'request' | 'verify' | 'confirm'

export function PasswordResetPage({ onBack, onComplete }: PasswordResetPageProps) {
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const run = async (operation: () => Promise<void>) => {
    setSubmitting(true)
    setError(undefined)
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '비밀번호 재설정 요청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const requestCode = () => run(async () => {
    const response = await authApi.requestPasswordReset(email.trim())
    setMessage(response.demoVerificationCode
      ? `로컬 인증번호: ${response.demoVerificationCode}`
      : response.message)
    if (response.demoVerificationCode) setVerificationCode(response.demoVerificationCode)
    setStep('verify')
  })

  const verifyCode = () => run(async () => {
    const response = await authApi.verifyPasswordReset(email.trim(), verificationCode)
    setResetToken(response.resetToken)
    setMessage('인증이 완료됐어요. 새 비밀번호를 입력해 주세요.')
    setStep('confirm')
  })

  const confirmReset = () => run(async () => {
    await authApi.confirmPasswordReset(resetToken, newPassword)
    onComplete()
  })

  const passwordValid = newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword)

  return (
    <AuthShell
      title="비밀번호 재설정"
      description="가입한 이메일을 확인하고 새 비밀번호를 설정해요."
      variant="login"
      onBack={onBack}
      footer={<p>비밀번호가 기억났나요? <button type="button" onClick={onBack}>로그인</button></p>}
    >
      <form onSubmit={(event) => {
        event.preventDefault()
        if (step === 'request') void requestCode()
        if (step === 'verify') void verifyCode()
        if (step === 'confirm') void confirmReset()
      }}>
        <TextField
          label="이메일"
          type="email"
          autoComplete="email"
          value={email}
          disabled={step !== 'request'}
          onChange={(event) => setEmail(event.target.value)}
        />
        {step === 'verify' && <TextField
          label="인증번호"
          inputMode="numeric"
          value={verificationCode}
          maxLength={6}
          onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
        />}
        {step === 'confirm' && <>
          <TextField
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            hint="영문과 숫자를 포함해 8자 이상 입력해 주세요."
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <TextField
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            error={confirmPassword && confirmPassword !== newPassword ? '비밀번호가 일치하지 않습니다.' : undefined}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </>}
        {message && <p className="auth-page__api-message" role="status">{message}</p>}
        {error && <p className="auth-page__api-error" role="alert">{error}</p>}
        <Button
          type="submit"
          disabled={submitting
            || (step === 'request' && !email.includes('@'))
            || (step === 'verify' && verificationCode.length !== 6)
            || (step === 'confirm' && (!passwordValid || confirmPassword !== newPassword))}
        >
          {submitting ? '처리 중…' : step === 'request' ? '인증번호 받기' : step === 'verify' ? '인증하기' : '비밀번호 변경'}
        </Button>
      </form>
    </AuthShell>
  )
}
