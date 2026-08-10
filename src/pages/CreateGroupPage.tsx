import { useState } from 'react'
import { Button, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type CreateGroupPageProps = {
  onBack?: () => void
  onCreate?: (group: { name: string; description: string }) => void
}

export function CreateGroupPage({ onBack, onCreate }: CreateGroupPageProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return (
    <main className="journey-page profile-group-page create-group-page">
      <ManagementPageHeader title="그룹 만들기" onBack={onBack} />
      <form onSubmit={(event) => { event.preventDefault(); if (name.trim()) onCreate?.({ name: name.trim(), description: description.trim() }) }}>
        <label className="create-group-page__name">그룹 이름<input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 남산 댕댕이 산책단" /></label>
        <label className="create-group-page__description">그룹 소개<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="함께 걸을 시간과 코스를 소개해주세요." /></label>
        <Button className="create-group-page__submit" type="submit">그룹 만들기</Button>
      </form>
    </main>
  )
}
