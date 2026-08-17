import { useState } from 'react'
import { AuthShell } from '../Components/auth/AuthShell'
import { Button, TextField } from '../Components/ui'

export type LoginFormValue = {
  email: string
  password: string
}

type LoginPageProps = {
  onLogin: (value: LoginFormValue) => void | Promise<void>
  onSignUp: () => void
  onForgotPassword?: () => void
}

export function LoginPage({ onLogin, onSignUp, onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const canSubmit = email.includes('@') && password.length >= 8

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(undefined)
    try {
      await onLogin({ email: email.trim(), password })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '로그인에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="로그인"
      description="오늘도 즐거운 산책을 시작해 볼까요?"
      variant="login"
      footer={<p>아직 계정이 없나요? <button type="button" onClick={onSignUp}>회원가입</button></p>}
    >
      <form onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}>
        <TextField label="이메일" type="email" inputMode="email" autoComplete="email" placeholder="mango@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <TextField label="비밀번호" type="password" autoComplete="current-password" placeholder="8자 이상 입력해 주세요" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="auth-page__forgot" type="button" onClick={onForgotPassword}>비밀번호를 잊으셨나요?</button>
        {error && <p className="auth-page__api-error" role="alert">{error}</p>}
        <Button type="submit" disabled={!canSubmit || submitting}>{submitting ? '로그인 중…' : '로그인'}</Button>
      </form>
    </AuthShell>
  )
}
