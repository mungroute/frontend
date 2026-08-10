import { useState } from 'react'
import { AuthShell } from '../Components/auth/AuthShell'
import { Button, TextField } from '../Components/ui'

export type SignupFormValue = {
  email: string
  password: string
  nickname: string
  phoneNumber: string
}

type SignupPageProps = {
  onBack: () => void
  onSignUp: (value: SignupFormValue) => void
  onCheckEmail?: (email: string) => boolean | Promise<boolean>
  onCheckNickname?: (nickname: string) => boolean | Promise<boolean>
}

type Availability = 'idle' | 'checking' | 'available' | 'taken'

export function SignupPage({ onBack, onSignUp, onCheckEmail = () => true, onCheckNickname = () => true }: SignupPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [emailAvailability, setEmailAvailability] = useState<Availability>('idle')
  const [nicknameAvailability, setNicknameAvailability] = useState<Availability>('idle')
  const phoneDigits = phoneNumber.replace(/\D/g, '')
  const emailIsValid = email.includes('@')
  const nicknameIsValid = nickname.trim().length >= 2
  const canSubmit = emailIsValid && emailAvailability === 'available' && password.length >= 8 && nicknameIsValid && nicknameAvailability === 'available' && phoneDigits.length >= 10 && phoneDigits.length <= 11 && agreed

  const checkEmail = async () => {
    if (!emailIsValid) return
    setEmailAvailability('checking')
    setEmailAvailability(await onCheckEmail(email.trim()) ? 'available' : 'taken')
  }

  const checkNickname = async () => {
    if (!nicknameIsValid) return
    setNicknameAvailability('checking')
    setNicknameAvailability(await onCheckNickname(nickname.trim()) ? 'available' : 'taken')
  }

  return (
    <AuthShell
      title="회원가입"
      description="멍루트와 함께 우리 아이의 산책을 기록해요."
      variant="signup"
      onBack={onBack}
      footer={<p>이미 계정이 있나요? <button type="button" onClick={onBack}>로그인</button></p>}
    >
      <form onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) onSignUp({ email: email.trim(), password, nickname: nickname.trim(), phoneNumber: phoneDigits })
      }}>
        <TextField
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="mango@example.com"
          value={email}
          error={emailAvailability === 'taken' ? '이미 사용 중인 이메일이에요.' : undefined}
          success={emailAvailability === 'available' ? '사용 가능한 이메일이에요.' : undefined}
          onChange={(event) => { setEmail(event.target.value); setEmailAvailability('idle') }}
          action={<button className="auth-page__duplicate" type="button" aria-label="이메일 중복 확인" disabled={!emailIsValid || emailAvailability === 'checking'} onClick={checkEmail}>{emailAvailability === 'checking' ? '확인 중' : emailAvailability === 'available' ? '확인 완료' : '중복 확인'}</button>}
        />
        <TextField label="비밀번호" type="password" autoComplete="new-password" hint="영문과 숫자를 포함해 8자 이상 입력해 주세요." placeholder="8자 이상 입력해 주세요" value={password} onChange={(event) => setPassword(event.target.value)} />
        <TextField
          label="닉네임"
          autoComplete="nickname"
          placeholder="어떻게 불러드릴까요?"
          value={nickname}
          error={nicknameAvailability === 'taken' ? '이미 사용 중인 닉네임이에요.' : undefined}
          success={nicknameAvailability === 'available' ? '사용 가능한 닉네임이에요.' : undefined}
          onChange={(event) => { setNickname(event.target.value); setNicknameAvailability('idle') }}
          action={<button className="auth-page__duplicate" type="button" aria-label="닉네임 중복 확인" disabled={!nicknameIsValid || nicknameAvailability === 'checking'} onClick={checkNickname}>{nicknameAvailability === 'checking' ? '확인 중' : nicknameAvailability === 'available' ? '확인 완료' : '중복 확인'}</button>}
        />
        <TextField label="전화번호" type="tel" inputMode="tel" autoComplete="tel" hint="숫자만 입력해 주세요." placeholder="01012345678" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
        <label className="auth-page__agreement">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span><strong>이용약관 및 개인정보 처리방침</strong>에 동의합니다.</span>
        </label>
        <Button type="submit" disabled={!canSubmit}>가입하기</Button>
      </form>
    </AuthShell>
  )
}
