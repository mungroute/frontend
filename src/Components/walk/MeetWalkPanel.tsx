import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { MeetCandidate, MeetConnection, MeetProfile, MeetProfilePreview, MeetRequest } from '../../api/meet'
import { DEFAULT_DOG_PROFILE_IMAGE } from '../profile/DogProfileCard'
import { DOG_PERSONALITY_ITEMS } from '../../features/dogs/personality-options'
import '../../styles/components/meet-walk-panel.css'

export type MeetProfileSelection = {
  preview: MeetProfilePreview
  profile?: MeetProfile
}

type Props = {
  searching?: boolean
  candidates: MeetCandidate[]
  requests: MeetRequest[]
  connection?: MeetConnection
  onRequest: (candidateRef: string) => void
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
  onCancel: (requestId: string) => void
  onEnd: (requestId: string) => void
  onBlock: (requestId: string) => void
  onProfileSelect?: (selection: MeetProfileSelection) => void
}

const bandLabel: Record<MeetCandidate['distanceBand'], string> = {
  VERY_CLOSE: '아주 가까이', BAND_30_50: '가까운 거리', BAND_50_100: '조금 가까이', BAND_100_500: '주변',
}

function PreviewButton({ preview, label, onClick }: { preview: MeetProfilePreview; label: string; onClick: () => void }) {
  return (
    <button type="button" className="meet-walk-panel__profile" aria-label={label} onClick={onClick}>
      <img src={preview.profileImageUrl || DEFAULT_DOG_PROFILE_IMAGE} alt="" />
      <span><strong>프로필 보기</strong><small>사진과 성격을 먼저 확인할 수 있어요</small></span>
      <b aria-hidden="true">›</b>
    </button>
  )
}

function MeetActionConfirmDialog({ action, onClose, onConfirm }: {
  action: 'end' | 'block'
  onClose: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const isBlock = action === 'block'

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = requestAnimationFrame(() => dialogRef.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', closeOnEscape)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div className="meet-action-dialog" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={isBlock ? '산책 친구 차단 확인' : '만남 종료 확인'}>
        <button type="button" className="meet-action-dialog__close" aria-label="확인 창 닫기" onClick={onClose}><X size={19} /></button>
        <span className={`meet-action-dialog__icon${isBlock ? ' is-danger' : ''}`} aria-hidden="true">{isBlock ? '!' : '✓'}</span>
        <h2>{isBlock ? '이 산책 친구를 차단할까요?' : '만남을 종료할까요?'}</h2>
        <p>{isBlock
          ? <>위치 공유가 바로 종료되고<br />앞으로 서로의 만나기 후보에 표시되지 않아요.</>
          : <>상대방과의 위치 공유가 종료돼요.<br />다음 산책에서 다시 만날 수 있어요.</>}</p>
        <div className="meet-action-dialog__actions">
          <button type="button" className={isBlock ? 'is-danger' : 'is-primary'} onClick={onConfirm}>{isBlock ? '차단하기' : '만남 종료하기'}</button>
          <button type="button" onClick={onClose}>{isBlock ? '돌아가기' : '계속 만나기'}</button>
        </div>
      </section>
    </div>
  )
}

export function MeetProfileDialog({ selection, onClose }: { selection: MeetProfileSelection; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null)
  const { preview, profile } = selection

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = requestAnimationFrame(() => dialogRef.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', closeOnEscape)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div className="meet-profile-dialog" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={profile ? `${profile.dogName} 프로필` : '산책 친구 프로필 미리보기'}>
        <button type="button" className="meet-profile-dialog__close" aria-label="프로필 닫기" onClick={onClose}><X size={20} /></button>
        <img className="meet-profile-dialog__photo" src={preview.profileImageUrl || DEFAULT_DOG_PROFILE_IMAGE} alt={profile ? `${profile.dogName} 프로필 사진` : '강아지 프로필 사진'} />
        <div className="meet-profile-dialog__heading">
          <h2>{profile ? profile.dogName : '산책 친구 미리보기'}</h2>
          <p>{profile ? `${profile.breed}${profile.ageYears !== null ? ` · ${profile.ageYears}살` : ''}` : '서로 수락하기 전에는 사진과 성격만 보여요.'}</p>
        </div>
        <dl className="meet-profile-dialog__personality" aria-label="강아지 성격">
          {DOG_PERSONALITY_ITEMS.map((item) => {
            const value = preview[item.key]
            const label = item.options.find((option) => option.value === value)?.label ?? '정보 없음'
            return <div key={item.key}><dt>{item.label}</dt><dd>{label}</dd></div>
          })}
        </dl>
        {profile && profile.temperamentTags.length > 0 && (
          <div className="meet-profile-dialog__tags" aria-label={`${profile.dogName} 특징`}>
            {profile.temperamentTags.map((tag) => <span key={tag}>#{tag.replace(/^#/, '')}</span>)}
          </div>
        )}
        {!profile && <p className="meet-profile-dialog__privacy">이름, 나이, 견종, 특징은 만나기 요청을 수락한 뒤 공개돼요.</p>}
      </section>
    </div>
  )
}

export function MeetWalkPanel({ searching = false, candidates, requests, connection, onRequest, onAccept, onReject, onCancel, onEnd, onBlock, onProfileSelect }: Props) {
  const [pendingAction, setPendingAction] = useState<'end' | 'block'>()
  const pending = requests.find((request) => request.status === 'PENDING')
  const accepted = requests.find((request) => request.status === 'ACCEPTED' && request.profile)
  const connectedProfile = connection?.profile ?? accepted?.profile
  const connectedRequestId = connection?.requestId ?? accepted?.requestId
  if (connectedProfile && connectedRequestId) {
    const confirmAction = () => {
      if (pendingAction === 'end') onEnd(connectedRequestId)
      if (pendingAction === 'block') onBlock(connectedRequestId)
      setPendingAction(undefined)
    }
    const dialogRoot = document.querySelector('.journey-page') ?? document.body
    return (
      <>
        <section className="meet-walk-panel meet-walk-panel--connected" aria-label="연결된 산책 친구">
          <button type="button" className="meet-walk-panel__connected-profile" aria-label={`${connectedProfile.dogName} 프로필 보기`} onClick={() => onProfileSelect?.({ preview: connectedProfile, profile: connectedProfile })}>
            <img src={connectedProfile.profileImageUrl || DEFAULT_DOG_PROFILE_IMAGE} alt="" />
            <span><strong>{connectedProfile.dogName}</strong><small>{connectedProfile.breed}{connectedProfile.ageYears !== null ? ` · ${connectedProfile.ageYears}살` : ''}</small></span>
            <b aria-hidden="true">›</b>
          </button>
          {connectedProfile.temperamentTags.length > 0 && <div className="meet-walk-panel__tags" aria-label={`${connectedProfile.dogName} 특징`}>{connectedProfile.temperamentTags.map((tag) => <span key={tag}>#{tag.replace(/^#/, '')}</span>)}</div>}
          <span className={`meet-walk-panel__live${connection ? '' : ' is-connecting'}`}>{connection ? '위치 공유 중' : '위치 연결 중'}</span>
          <div className="meet-walk-panel__actions"><button type="button" onClick={() => setPendingAction('end')}>만남 종료</button><button type="button" onClick={() => setPendingAction('block')}>차단</button></div>
        </section>
        {pendingAction && createPortal(
          <MeetActionConfirmDialog action={pendingAction} onClose={() => setPendingAction(undefined)} onConfirm={confirmAction} />,
          dialogRoot,
        )}
      </>
    )
  }
  if (pending) return (
    <section className="meet-walk-panel" aria-label="만나기 요청">
      <p><strong>{pending.direction === 'INCOMING' ? '근처 산책 친구가 만나기를 요청했어요' : '상대방의 응답을 기다리고 있어요'}</strong><small>수락 전에는 이름과 위치를 공개하지 않아요.</small></p>
      {pending.preview && <PreviewButton preview={pending.preview} label="요청한 산책 친구 프로필 보기" onClick={() => onProfileSelect?.({ preview: pending.preview! })} />}
      <div className="meet-walk-panel__actions">
        {pending.direction === 'INCOMING' ? <><button type="button" className="is-primary" onClick={() => onAccept(pending.requestId)}>수락</button><button type="button" onClick={() => onReject(pending.requestId)}>거절</button></> : <button type="button" onClick={() => onCancel(pending.requestId)}>요청 취소</button>}
      </div>
    </section>
  )
  return (
    <section className="meet-walk-panel" aria-label="주변 산책 친구">
      <p><strong>{searching ? '설정한 범위에서 산책 친구를 찾고 있어요' : candidates.length ? `주변 산책 친구 ${candidates.length}마리를 찾았어요` : '주변 산책 친구를 찾는 중이에요'}</strong><small>{searching ? '새 검색 범위를 바로 적용하고 있어요.' : candidates.length > 1 ? '좌우로 넘겨 프로필을 확인해 보세요.' : '상세 정보와 위치는 서로 수락한 뒤 보여요.'}</small></p>
      {searching && <div className="meet-walk-panel__loading" role="status" aria-label="산책 친구 다시 검색 중"><span aria-hidden="true" /><i aria-hidden="true" /><b aria-hidden="true" /></div>}
      {!searching && candidates.length > 0 && (
        <div className="meet-walk-panel__candidate-list" role="region" aria-label="주변 산책 친구 프로필 목록">
          {candidates.map((candidate, index) => (
            <article className="meet-walk-panel__candidate" key={candidate.candidateRef}>
              <div className="meet-walk-panel__candidate-heading"><strong>{bandLabel[candidate.distanceBand]}</strong><span>{index + 1}/{candidates.length}</span></div>
              <PreviewButton preview={candidate.preview} label={`주변 산책 친구 ${index + 1} 프로필 보기`} onClick={() => onProfileSelect?.({ preview: candidate.preview })} />
              <button type="button" className="meet-walk-panel__request is-primary" aria-label={`주변 산책 친구 ${index + 1}에게 만나기 요청`} onClick={() => onRequest(candidate.candidateRef)}>만나기 요청</button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
