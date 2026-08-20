import { useEffect, useRef } from 'react'
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

export function MeetWalkPanel({ candidates, requests, connection, onRequest, onAccept, onReject, onCancel, onEnd, onBlock, onProfileSelect }: Props) {
  const pending = requests.find((request) => request.status === 'PENDING')
  if (connection) return (
    <section className="meet-walk-panel meet-walk-panel--connected" aria-label="연결된 산책 친구">
      <button type="button" className="meet-walk-panel__connected-profile" aria-label={`${connection.profile.dogName} 프로필 보기`} onClick={() => onProfileSelect?.({ preview: connection.profile, profile: connection.profile })}>
        <img src={connection.profile.profileImageUrl || DEFAULT_DOG_PROFILE_IMAGE} alt="" />
        <span><strong>{connection.profile.dogName}</strong><small>{connection.profile.breed}{connection.profile.ageYears !== null ? ` · ${connection.profile.ageYears}살` : ''}</small></span>
        <b aria-hidden="true">›</b>
      </button>
      {connection.profile.temperamentTags.length > 0 && <div className="meet-walk-panel__tags" aria-label={`${connection.profile.dogName} 특징`}>{connection.profile.temperamentTags.map((tag) => <span key={tag}>#{tag.replace(/^#/, '')}</span>)}</div>}
      <span className="meet-walk-panel__live">위치 공유 중</span>
      <div className="meet-walk-panel__actions"><button type="button" onClick={() => onEnd(connection.requestId)}>만남 종료</button><button type="button" onClick={() => onBlock(connection.requestId)}>차단</button></div>
    </section>
  )
  if (pending) return (
    <section className="meet-walk-panel" aria-label="만나기 요청">
      <p><strong>{pending.direction === 'INCOMING' ? '근처 산책 친구가 만나기를 요청했어요' : '상대방의 응답을 기다리고 있어요'}</strong><small>수락 전에는 이름과 위치를 공개하지 않아요.</small></p>
      {pending.preview && <PreviewButton preview={pending.preview} label="요청한 산책 친구 프로필 보기" onClick={() => onProfileSelect?.({ preview: pending.preview! })} />}
      <div className="meet-walk-panel__actions">
        {pending.direction === 'INCOMING' ? <><button type="button" className="is-primary" onClick={() => onAccept(pending.requestId)}>수락</button><button type="button" onClick={() => onReject(pending.requestId)}>거절</button></> : <button type="button" onClick={() => onCancel(pending.requestId)}>요청 취소</button>}
      </div>
    </section>
  )
  const candidate = candidates[0]
  return (
    <section className="meet-walk-panel" aria-label="주변 산책 친구">
      <p><strong>{candidate ? `${bandLabel[candidate.distanceBand]} 산책 친구가 있어요` : '주변 산책 친구를 찾는 중이에요'}</strong><small>상세 정보와 위치는 서로 수락한 뒤 보여요.</small></p>
      {candidate && <><PreviewButton preview={candidate.preview} label="주변 산책 친구 프로필 보기" onClick={() => onProfileSelect?.({ preview: candidate.preview })} /><button type="button" className="meet-walk-panel__request is-primary" onClick={() => onRequest(candidate.candidateRef)}>만나기 요청</button></>}
    </section>
  )
}
