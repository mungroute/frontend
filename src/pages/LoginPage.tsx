import { useState } from 'react'
import { AuthShell } from '../Components/auth/AuthShell'
import { Button, TextField } from '../Components/ui'

export type LoginFormValue = {
  email: string
  password: string
}

type LoginPageProps = {
  onLogin: (value: LoginFormValue) => void
  onSignUp: () => void
}

export function LoginPage({ onLogin, onSignUp }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const canSubmit = email.includes('@') && password.length >= 8

  return (
    <AuthShell
      title="로그인"
      description="오늘도 즐거운 산책을 시작해 볼까요?"
      variant="login"
      footer={<p>아직 계정이 없나요? <button type="button" onClick={onSignUp}>회원가입</button></p>}
    >
      <form onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) onLogin({ email: email.trim(), password })
      }}>
        <TextField label="이메일" type="email" inputMode="email" autoComplete="email" placeholder="mango@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <TextField label="비밀번호" type="password" autoComplete="current-password" placeholder="8자 이상 입력해 주세요" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="auth-page__forgot" type="button">비밀번호를 잊으셨나요?</button>
        <Button type="submit" disabled={!canSubmit}>로그인</Button>
      </form>
    </AuthShell>
  )
}
