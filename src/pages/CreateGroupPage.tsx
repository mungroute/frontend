import { useState } from 'react'
import { Button, ManagementPageHeader } from '../Components/ui'
import type { GroupJoinPolicy, GroupVisibility } from '../api/groups'
import '../styles/pages/journey-page.css'
import '../styles/pages/profile-group-pages.css'

type CreateGroupPageProps = {
  onBack?: () => void
  onCreate?: (group: { name: string; description: string; visibility: GroupVisibility; joinPolicy: GroupJoinPolicy }) => void | Promise<void>
}

export function CreateGroupPage({ onBack, onCreate }: CreateGroupPageProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<GroupVisibility>('PRIVATE')
  const [joinPolicy, setJoinPolicy] = useState<GroupJoinPolicy>('INVITE_ONLY')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  return (
    <main className="journey-page profile-group-page create-group-page">
      <ManagementPageHeader title="그룹 만들기" onBack={onBack} />
      <form onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim() || submitting || !onCreate) return
        setSubmitting(true)
        setError(undefined)
        void Promise.resolve(onCreate({ name: name.trim(), description: description.trim(), visibility, joinPolicy: visibility === 'PRIVATE' ? 'INVITE_ONLY' : joinPolicy }))
          .catch((reason: Error) => setError(reason.message))
          .finally(() => setSubmitting(false))
      }}>
        <label className="create-group-page__name">그룹 이름<input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 남산 댕댕이 산책단" /></label>
        <label className="create-group-page__description">그룹 소개<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="함께 걸을 시간과 코스를 소개해주세요." /></label>
        <fieldset className="create-group-page__visibility">
          <legend>그룹 공개 범위</legend>
          <p>공개 그룹은 다른 사용자가 둘러볼 수 있어요.</p>
          <div>
            <button type="button" aria-pressed={visibility === 'PUBLIC'} onClick={() => setVisibility('PUBLIC')}><strong>공개</strong><small>그룹 탐색에 표시</small></button>
            <button type="button" aria-pressed={visibility === 'PRIVATE'} onClick={() => { setVisibility('PRIVATE'); setJoinPolicy('INVITE_ONLY') }}><strong>비공개</strong><small>초대 코드로만 참여</small></button>
          </div>
        </fieldset>
        {visibility === 'PUBLIC' && <fieldset className="create-group-page__join-policy">
          <legend>참여 방식</legend>
          <div>
            <button type="button" aria-pressed={joinPolicy === 'OPEN'} onClick={() => setJoinPolicy('OPEN')}>누구나 바로 참여</button>
            <button type="button" aria-pressed={joinPolicy === 'INVITE_ONLY'} onClick={() => setJoinPolicy('INVITE_ONLY')}>초대 코드 필요</button>
          </div>
        </fieldset>}
        {error && <p className="create-group-page__error" role="alert">{error}</p>}
        <Button className="create-group-page__submit" type="submit" disabled={!name.trim() || submitting}>{submitting ? '만드는 중…' : '그룹 만들기'}</Button>
      </form>
    </main>
  )
}
