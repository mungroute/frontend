import type { MeetCandidate, MeetConnection, MeetRequest } from '../../api/meet'
import '../../styles/components/meet-walk-panel.css'

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
}

const bandLabel: Record<MeetCandidate['distanceBand'], string> = {
  VERY_CLOSE: '아주 가까이', BAND_30_50: '가까운 거리', BAND_50_100: '조금 가까이', BAND_100_500: '주변',
}

export function MeetWalkPanel({ candidates, requests, connection, onRequest, onAccept, onReject, onCancel, onEnd, onBlock }: Props) {
  const pending = requests.find((request) => request.status === 'PENDING')
  if (connection) return (
    <section className="meet-walk-panel meet-walk-panel--connected" aria-label="연결된 산책 친구">
      <div><span className="meet-walk-panel__avatar">🐾</span><p><strong>{connection.profile.dogName}</strong><small>{connection.profile.breed}{connection.profile.ageYears !== null ? ` · ${connection.profile.ageYears}살` : ''}</small></p></div>
      {connection.profile.temperamentTags.length > 0 && <div className="meet-walk-panel__tags" aria-label={`${connection.profile.dogName} 특징`}>{connection.profile.temperamentTags.map((tag) => <span key={tag}>#{tag.replace(/^#/, '')}</span>)}</div>}
      <span className="meet-walk-panel__live">위치 공유 중</span>
      <div className="meet-walk-panel__actions"><button type="button" onClick={() => onEnd(connection.requestId)}>만남 종료</button><button type="button" onClick={() => onBlock(connection.requestId)}>차단</button></div>
    </section>
  )
  if (pending) return (
    <section className="meet-walk-panel" aria-label="만나기 요청">
      <p><strong>{pending.direction === 'INCOMING' ? '근처 산책 친구가 만나기를 요청했어요' : '상대방의 응답을 기다리고 있어요'}</strong><small>수락 전에는 서로의 위치와 프로필이 공개되지 않아요.</small></p>
      <div className="meet-walk-panel__actions">
        {pending.direction === 'INCOMING' ? <><button type="button" className="is-primary" onClick={() => onAccept(pending.requestId)}>수락</button><button type="button" onClick={() => onReject(pending.requestId)}>거절</button></> : <button type="button" onClick={() => onCancel(pending.requestId)}>요청 취소</button>}
      </div>
    </section>
  )
  const candidate = candidates[0]
  return (
    <section className="meet-walk-panel" aria-label="주변 산책 친구">
      <p><strong>{candidate ? `${bandLabel[candidate.distanceBand]} 산책 친구가 있어요` : '주변 산책 친구를 찾는 중이에요'}</strong><small>서로 수락해야만 위치와 반려견 프로필이 보여요.</small></p>
      {candidate && <button type="button" className="meet-walk-panel__request is-primary" onClick={() => onRequest(candidate.candidateRef)}>만나기 요청</button>}
    </section>
  )
}
