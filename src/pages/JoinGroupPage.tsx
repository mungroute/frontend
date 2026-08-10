import { useState } from 'react'
import { Button, ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-management-pages.css'

type JoinGroupPageProps = {
  defaultCode?: string
  onBack?: () => void
  onConfirm?: (code: string) => void
}

const normalizeInviteCode = (value: string) => value.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()

const extractInviteCode = (value: string) => {
  try {
    const url = new URL(value)
    const pathCode = url.pathname.split('/').filter(Boolean).at(-1) ?? ''
    return normalizeInviteCode(url.searchParams.get('code') ?? pathCode)
  } catch {
    return normalizeInviteCode(value)
  }
}

export function JoinGroupPage({ defaultCode = 'MUNG24', onBack, onConfirm }: JoinGroupPageProps) {
  const [code, setCode] = useState(() => normalizeInviteCode(defaultCode))

  return (
    <main className="journey-page extended-management-page join-group-page">
      <ManagementPageHeader title="그룹 참여" onBack={onBack} />
      <section className="join-group-page__intro">
        <h2>초대 코드를 입력해주세요</h2>
        <p>친구에게 받은 6자리 코드를 사용해요.</p>
      </section>
      <label className="join-group-page__code">
        <span className="sr-only">초대 코드</span>
        <input aria-label="초대 코드" value={code} inputMode="text" autoCapitalize="characters" onChange={(event) => setCode(extractInviteCode(event.target.value))} />
      </label>
      <p className="join-group-page__hint">초대 링크를 붙여넣어도 자동으로 확인돼요.</p>
      <Button className="join-group-page__confirm" disabled={code.length !== 6} onClick={() => onConfirm?.(code)}>그룹 확인하기</Button>
    </main>
  )
}
