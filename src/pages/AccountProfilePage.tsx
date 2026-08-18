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
  onSave?: (value: { nickname: string; profileImageUrl: string | null }) => Promise<void>
  onDeactivate?: () => Promise<void>
}

export function AccountProfilePage({ nickname, email, profileImageSrc, onBack, onSave, onDeactivate }: AccountProfilePageProps) {
  const [name, setName] = useState(nickname)
  const [image, setImage] = useState(profileImageSrc ?? '')
  const [saving, setSaving] = useState(false)

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
      <div className="account-profile-page__nickname"><TextField label="닉네임" value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div className="account-profile-page__email"><TextField label="이메일" value={email} disabled /></div>
      <Button className="account-profile-page__save" loading={saving} disabled={name.trim().length < 2} onClick={() => {
        if (!onSave) return
        setSaving(true)
        void onSave({ nickname: name.trim(), profileImageUrl: image || null }).finally(() => setSaving(false))
      }}>변경 내용 저장</Button>
      {onDeactivate && <button className="account-profile-page__deactivate" type="button" onClick={() => {
        if (window.confirm('정말 멍루트 계정을 탈퇴할까요? 이 작업은 되돌릴 수 없어요.')) void onDeactivate()
      }}>회원 탈퇴</button>}
    </main>
  )
}
