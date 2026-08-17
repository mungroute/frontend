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
  onSignUp: (value: SignupFormValue) => void | Promise<void>
  onCheckEmail?: (email: string) => boolean | Promise<boolean>
  onCheckNickname?: (nickname: string) => boolean | Promise<boolean>
  onVerifyPhone?: (phoneNumber: string) => boolean | Promise<boolean>
}

type Availability = 'idle' | 'checking' | 'available' | 'taken'

export function SignupPage({ onBack, onSignUp, onCheckEmail = () => true, onCheckNickname = () => true, onVerifyPhone = () => true }: SignupPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [emailAvailability, setEmailAvailability] = useState<Availability>('idle')
  const [nicknameAvailability, setNicknameAvailability] = useState<Availability>('idle')
  const [phoneAvailability, setPhoneAvailability] = useState<Availability>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string>()
  const phoneDigits = phoneNumber.replace(/\D/g, '')
  const emailIsValid = email.includes('@')
  const nicknameIsValid = nickname.trim().length >= 2
  const passwordIsValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
  const phoneIsValid = phoneDigits.length >= 10 && phoneDigits.length <= 11
  const canSubmit = emailIsValid && emailAvailability === 'available' && passwordIsValid && nicknameIsValid && nicknameAvailability === 'available' && phoneIsValid && phoneAvailability === 'available' && agreed

  const checkEmail = async () => {
    if (!emailIsValid) return
    setEmailAvailability('checking')
    try {
      setEmailAvailability(await onCheckEmail(email.trim()) ? 'available' : 'taken')
    } catch (reason) {
      setEmailAvailability('idle')
      setFormError(reason instanceof Error ? reason.message : '이메일 확인에 실패했습니다.')
    }
  }

  const checkNickname = async () => {
    if (!nicknameIsValid) return
    setNicknameAvailability('checking')
    try {
      setNicknameAvailability(await onCheckNickname(nickname.trim()) ? 'available' : 'taken')
    } catch (reason) {
      setNicknameAvailability('idle')
      setFormError(reason instanceof Error ? reason.message : '닉네임 확인에 실패했습니다.')
    }
  }

  const verifyPhone = async () => {
    if (!phoneIsValid) return
    setPhoneAvailability('checking')
    try {
      setPhoneAvailability(await onVerifyPhone(phoneDigits) ? 'available' : 'taken')
    } catch (reason) {
      setPhoneAvailability('idle')
      setFormError(reason instanceof Error ? reason.message : '전화번호 확인에 실패했습니다.')
    }
  }

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setFormError(undefined)
    try {
      await onSignUp({ email: email.trim(), password, nickname: nickname.trim(), phoneNumber: phoneDigits })
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : '회원가입에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
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
        void submit()
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
        <TextField
          label="전화번호"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="숫자만 입력해 주세요."
          placeholder="01012345678"
          value={phoneNumber}
          error={phoneAvailability === 'taken' ? '이미 사용 중인 전화번호예요.' : undefined}
          success={phoneAvailability === 'available' ? '전화번호 확인이 완료됐어요.' : undefined}
          onChange={(event) => { setPhoneNumber(event.target.value); setPhoneAvailability('idle') }}
          action={<button className="auth-page__duplicate" type="button" aria-label="전화번호 확인" disabled={!phoneIsValid || phoneAvailability === 'checking'} onClick={verifyPhone}>{phoneAvailability === 'checking' ? '확인 중' : phoneAvailability === 'available' ? '확인 완료' : '번호 확인'}</button>}
        />
        <label className="auth-page__agreement">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span><strong>이용약관 및 개인정보 처리방침</strong>에 동의합니다.</span>
        </label>
        {formError && <p className="auth-page__api-error" role="alert">{formError}</p>}
        <Button type="submit" disabled={!canSubmit || submitting}>{submitting ? '가입 중…' : '가입하기'}</Button>
      </form>
    </AuthShell>
  )
}
