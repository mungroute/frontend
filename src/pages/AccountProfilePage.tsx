import { useState } from 'react'
import { Button, ManagementPageHeader, TextField } from '../Components/ui'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../Components/profile/DogProfileCard'
import '../styles/pages/journey-page.css'
import '../styles/pages/account-profile-page.css'

type AccountProfilePageProps = {
  nickname: string
  email: string
  profileImageSrc?: string | null
  onBack?: () => void
  onCheckNickname?: (nickname: string) => boolean | Promise<boolean>
  onSave?: (value: { nickname: string; profileImageUrl: string | null }) => Promise<void>
  onDeactivate?: () => Promise<void>
}

type Availability = 'idle' | 'checking' | 'available' | 'taken'

export function AccountProfilePage({ nickname, email, profileImageSrc, onBack, onCheckNickname = () => true, onSave, onDeactivate }: AccountProfilePageProps) {
  const [name, setName] = useState(nickname)
  const [image, setImage] = useState(profileImageSrc ?? '')
  const [saving, setSaving] = useState(false)
  const [availability, setAvailability] = useState<Availability>('idle')
  const [checkedNickname, setCheckedNickname] = useState('')
  const [formError, setFormError] = useState<string>()
  const normalizedName = name.trim()
  const nicknameIsValid = normalizedName.length >= 2 && normalizedName.length <= 50
  const currentAvailability = checkedNickname === normalizedName ? availability : 'idle'
  const canSave = nicknameIsValid && currentAvailability === 'available' && !saving

  const checkNickname = async () => {
    if (!nicknameIsValid || availability === 'checking') return
    const candidate = normalizedName
    setCheckedNickname(candidate)
    setAvailability('checking')
    setFormError(undefined)
    try {
      setAvailability(await onCheckNickname(candidate) ? 'available' : 'taken')
    } catch (reason) {
      setAvailability('idle')
      setFormError(reason instanceof Error ? reason.message : '닉네임 중복 확인에 실패했습니다.')
    }
  }

  const save = async () => {
    if (!onSave || !canSave) return
    setSaving(true)
    setFormError(undefined)
    try {
      await onSave({ nickname: normalizedName, profileImageUrl: image || null })
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : '계정 정보를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="journey-page account-profile-page">
      <ManagementPageHeader title="계정 관리" subtitle="내 정보와 계정 상태를 관리해요" onBack={onBack} />
      <img className="account-profile-page__photo" src={image || DEFAULT_DOG_PROFILE_IMAGE} alt="사용자 프로필" />
      <label className="account-profile-page__photo-action">사진 변경<input className="sr-only" type="file" accept="image/*" onChange={(event) => {
        const file = event.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setImage(String(reader.result))
        reader.readAsDataURL(file)
      }} /></label>
      <div className="account-profile-page__nickname"><TextField
        label="닉네임"
        value={name}
        maxLength={50}
        error={currentAvailability === 'taken' ? '이미 사용 중인 닉네임이에요.' : undefined}
        success={currentAvailability === 'available' ? '사용 가능한 닉네임이에요.' : undefined}
        onChange={(event) => {
          setName(event.target.value)
          setCheckedNickname('')
          setAvailability('idle')
        }}
        action={<button
          className="account-profile-page__duplicate"
          type="button"
          aria-label="닉네임 중복 확인"
          disabled={!nicknameIsValid || availability === 'checking'}
          onClick={() => void checkNickname()}
        >{availability === 'checking' ? '확인 중' : currentAvailability === 'available' ? '확인 완료' : '중복 확인'}</button>}
      /></div>
      <div className="account-profile-page__email"><TextField label="이메일" value={email} hint="로그인 아이디로 사용되어 변경할 수 없어요." disabled /></div>
      {formError && <p className="account-profile-page__error" role="alert">{formError}</p>}
      <Button className="account-profile-page__save" loading={saving} disabled={!canSave} onClick={() => void save()}>변경 내용 저장</Button>
      {onDeactivate && <button className="account-profile-page__deactivate" type="button" onClick={() => {
        if (window.confirm('정말 멍루트 계정을 탈퇴할까요? 이 작업은 되돌릴 수 없어요.')) void onDeactivate()
      }}>회원 탈퇴</button>}
    </main>
  )
}
