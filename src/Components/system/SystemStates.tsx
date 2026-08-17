import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Check, Copy, Link2, MapPin, ShieldCheck, Square, Users, WifiOff } from 'lucide-react'
import type { LockedWalkPresenceMode } from '../../api/walks'
import type { CourseShareOption } from '../courses/course-data'
import { BaseMapViewport } from '../map'
import { BottomSheet, Button, TextField } from '../ui'
import '../../styles/components/system-states.css'

type CloseableProps = { onClose: () => void }

function Overlay({ children, onClose, label, sheet = false, className = '' }: CloseableProps & { children: ReactNode; label: string; sheet?: boolean; className?: string }) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = requestAnimationFrame(() => overlayRef.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', closeOnEscape)
      previouslyFocused?.focus()
    }
  }, [onClose])

  const surfaceClassName = `system-surface ${sheet ? 'system-surface--sheet' : 'system-surface--dialog'} ${className}`.trim()
  return (
    <div
      ref={overlayRef}
      className="system-overlay"
      tabIndex={-1}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const actions = [...(overlayRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled)') ?? [])]
        if (!actions.length) return
        const first = actions[0]
        const last = actions[actions.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === overlayRef.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }}
    >
      {sheet
        ? <BottomSheet className={surfaceClassName} role="dialog" aria-modal="true" aria-label={label}>{children}</BottomSheet>
        : <section className={surfaceClassName} role="dialog" aria-modal="true" aria-label={label}>{children}</section>}
    </div>
  )
}

export function LocationPermissionSheet({ onClose, onAllow = onClose }: CloseableProps & { onAllow?: () => void }) {
  return (
    <Overlay label="위치 권한 안내" sheet onClose={onClose}>
      <div className="system-icon system-icon--soft"><MapPin /></div>
      <h2>현재 위치를 사용해도 될까요?</h2>
      <p>가까운 산책 코스를 추천하고<br />출발 지점을 정확하게 찾을 수 있어요.</p>
      <Button onClick={onAllow}>위치 사용 허용</Button>
      <Button variant="ghost" onClick={onClose}>나중에 할게요</Button>
    </Overlay>
  )
}

export function WalkEndDialog({ onClose, onConfirm }: CloseableProps & { onConfirm: () => void }) {
  return (
    <Overlay label="산책 종료 확인" onClose={onClose}>
      <div className="system-icon system-icon--soft"><Square size={22} fill="currentColor" /></div>
      <h2>산책을 종료할까요?</h2>
      <p>지금까지의 경로와 시간은<br />기록에 저장돼요.</p>
      <Button aria-label="산책 종료 확정" onClick={onConfirm}>산책 종료</Button>
      <Button variant="ghost" onClick={onClose}>계속 걷기</Button>
    </Overlay>
  )
}

export function RepresentativeUnavailableDialog({ onClose }: CloseableProps) {
  return (
    <Overlay label="대표 코스 설정 불가" className="system-surface--compact" onClose={onClose}>
      <div className="system-icon system-icon--warning"><AlertTriangle size={25} /></div>
      <h2>대표 코스로 설정할 수 없어요</h2>
      <p>GPS 지점이 부족해요.<br />이 코스는 일반 코스로 저장할 수 있어요.</p>
      <Button onClick={onClose}>확인</Button>
    </Overlay>
  )
}

export function WalkProcessingAlertDialog({ message, onClose }: CloseableProps & { message: string }) {
  return (
    <Overlay label="산책 처리 안내" className="system-surface--compact" onClose={onClose}>
      <div className="system-icon system-icon--warning"><AlertTriangle size={25} /></div>
      <h2>{message}</h2>
      <p>현재 산책 완료 화면에서<br />코스 정보를 확인해 주세요.</p>
      <Button onClick={onClose}>확인</Button>
    </Overlay>
  )
}

export function CourseAlternativeUnavailableDialog({ message, onClose }: CloseableProps & { message: string }) {
  return (
    <Overlay label="추천 대안 생성 안내" className="system-surface--compact" onClose={onClose}>
      <div className="system-icon system-icon--warning"><AlertTriangle size={25} /></div>
      <h2>추천 대안을 만들지 못했어요</h2>
      <p>{message}<br />기존 코스는 그대로 이용할 수 있어요.</p>
      <Button onClick={onClose}>기존 코스 확인</Button>
    </Overlay>
  )
}

export function PresenceModeConfirmDialog({ mode, nextEnabled, onClose, onConfirm }: CloseableProps & { mode: LockedWalkPresenceMode; nextEnabled: boolean; onConfirm: () => void }) {
  const isDistance = mode === 'distance'
  const modeLabel = isDistance ? '거리두기 알림' : '산책 친구 만나기'
  const modeLabelWithParticle = isDistance ? '거리두기 알림을' : '산책 친구 만나기를'
  const action = nextEnabled ? '켜기' : '끄기'
  return (
    <Overlay label={`${modeLabel} ${action} 확인`} className={`system-surface--presence system-surface--presence-${mode}`} onClose={onClose}>
      <span className="system-presence-kicker">LOCKED · {isDistance ? 'DISTANCE' : 'MEET'}</span>
      <div className="system-icon system-icon--soft">{isDistance ? <ShieldCheck size={25} /> : <Users size={25} />}</div>
      <h2>{modeLabelWithParticle}<br />{nextEnabled ? '켤까요?' : '끌까요?'}</h2>
      <p>{nextEnabled
        ? isDistance
          ? <>현재 위치를 최대 30초 동안 임시로 사용해<br />주변 접근 방향만 익명으로 알려드려요.</>
          : <>서로 동의한 산책 친구에게만<br />제한된 위치와 프로필을 공개해요.</>
        : isDistance
          ? <>접근 알림이 중단되고<br />임시 위치정보가 즉시 삭제돼요.</>
          : <>진행 중인 만남 연결이 종료되고<br />임시 위치정보가 즉시 삭제돼요.</>}</p>
      <Button onClick={onConfirm}>{nextEnabled ? '동의하고 켜기' : `${modeLabel} 끄기`}</Button>
      <Button variant="ghost" onClick={onClose}>{nextEnabled ? '취소' : '계속 사용'}</Button>
    </Overlay>
  )
}

export function DistanceModeConfirmDialog({ nextChecked, onClose, onConfirm }: CloseableProps & { nextChecked: boolean; onConfirm: () => void }) {
  return <PresenceModeConfirmDialog mode="distance" nextEnabled={nextChecked} onClose={onClose} onConfirm={onConfirm} />
}

export function RecordMoreSheet({ onClose, onDelete, onRename, onShare }: CloseableProps & { onDelete: () => void; onRename?: () => void; onShare?: () => void }) {
  return (
    <Overlay label="기록 더보기" sheet className="system-surface--record-more" onClose={onClose}>
      <h2 className="system-surface__left-title">기록 더보기</h2>
      <div className="system-action-list">
        <button type="button" disabled={!onRename} onClick={onRename}><span>코스 이름 변경</span><b aria-hidden="true">›</b></button>
        <button type="button" disabled={!onShare} onClick={onShare}><span>그룹에 코스 공유</span><b aria-hidden="true">›</b></button>
        <button className="system-action-list__danger" type="button" onClick={onDelete}><span><strong>산책 기록 삭제</strong><small>되돌릴 수 없어요</small></span><b aria-hidden="true">›</b></button>
      </div>
      <Button variant="ghost" onClick={onClose}>닫기</Button>
    </Overlay>
  )
}

export function DeleteRecordDialog({ onClose, onConfirm }: CloseableProps & { onConfirm: () => void }) {
  return (
    <Overlay label="기록 삭제 확인" onClose={onClose}>
      <div className="system-icon system-icon--warning"><AlertTriangle /></div>
      <h2>이 기록을 삭제할까요?</h2>
      <p>삭제한 산책 기록은<br />복구할 수 없어요.</p>
      <div className="system-dialog-actions">
        <Button className="system-button--danger" onClick={onConfirm}>삭제</Button>
        <Button variant="secondary" onClick={onClose}>취소</Button>
      </div>
    </Overlay>
  )
}

export function RecordInfoDialog({ title, description, onClose }: CloseableProps & { title: string; description: ReactNode }) {
  return (
    <Overlay label={`${title} 상세`} onClose={onClose}>
      <h2>{title}</h2>
      <div className="system-record-info">{description}</div>
      <Button onClick={onClose}>확인</Button>
    </Overlay>
  )
}

export function RenameCourseDialog({ initialName, onClose, onConfirm }: CloseableProps & { initialName: string; onConfirm: (name: string) => void }) {
  const [name, setName] = useState(initialName)
  const trimmedName = name.trim()
  return (
    <Overlay label="코스 이름 변경" sheet className="system-surface--rename" onClose={onClose}>
      <h2 className="system-surface__left-title">코스 이름 변경</h2>
      <p className="system-surface__left-copy">기록에서 알아보기 쉬운 이름으로 바꿔보세요.</p>
      <TextField label="코스 이름" value={name} maxLength={20} onChange={(event) => setName(event.target.value)} />
      <div className="system-dialog-actions system-dialog-actions--rename">
        <Button variant="secondary" onClick={onClose}>취소</Button>
        <Button disabled={!trimmedName} onClick={() => onConfirm(trimmedName)}>변경 완료</Button>
      </div>
    </Overlay>
  )
}

export function InviteShareSheet({ onClose, onShareInvite }: CloseableProps & { onShareInvite: () => void }) {
  const [copied, setCopied] = useState(false)
  const copyCode = () => {
    setCopied(true)
    void navigator.clipboard?.writeText('MUNG24').catch(() => undefined)
  }
  return (
    <Overlay label="그룹 초대 공유" sheet className="system-surface--invite" onClose={onClose}>
      <h2 className="system-surface__left-title">친구를 그룹에 초대해요</h2>
      <p className="system-surface__left-copy">초대 링크는 7일 동안 사용할 수 있어요.</p>
      <div className="system-invite-code"><strong>MUNG24</strong><span>초대 코드</span></div>
      <Button onClick={onShareInvite}><Link2 size={20} /> 초대 링크 공유</Button>
      <Button variant="secondary" onClick={copyCode}>{copied ? <Check size={20} /> : <Copy size={20} />}{copied ? '복사했어요' : '코드 복사'}</Button>
      <Button variant="ghost" onClick={onClose}>닫기</Button>
    </Overlay>
  )
}

export function CourseShareSheet({ courses, initialSelectedId = courses[0]?.id ?? '', onBack, onClose, onConfirm }: CloseableProps & { courses: CourseShareOption[]; initialSelectedId?: string; onBack?: () => void; onConfirm: (id: string) => void }) {
  const [selected, setSelected] = useState(initialSelectedId)
  return (
    <Overlay label="코스 공유" sheet className="system-surface--course-share" onClose={onClose}>
      <div className="system-sheet-titlebar">
        {onBack && <button type="button" aria-label="뒤로 가기" onClick={onBack}>‹</button>}
        <h2 className="system-surface__left-title">그룹에 공유할 코스</h2>
      </div>
      <p className="system-surface__left-copy">공유하면 그룹 지도에 코스만 표시돼요.</p>
      <div className="system-course-list">
        {courses.map((course) => (
          <button key={course.id} type="button" aria-pressed={selected === course.id} onClick={() => setSelected(course.id)}>
            <span><strong>{course.title}</strong><small>{course.meta}</small></span>
            <i aria-hidden="true">›</i>
          </button>
        ))}
      </div>
      <Button disabled={!selected} onClick={() => onConfirm(selected)}>선택한 코스 공유</Button>
    </Overlay>
  )
}

export function GpsErrorDialog({ onClose, onRetry = onClose }: CloseableProps & { onRetry?: () => void }) {
  return (
    <Overlay label="GPS 오류" className="system-surface--gps-error" onClose={onClose}>
      <img className="system-mascot system-mascot--error" src="/assets/mascot/animated/07-error-confused.gif" alt="당황한 멍루트 마스코트" />
      <h2>GPS 신호를 찾지 못했어요</h2>
      <p>하늘이 잘 보이는 곳으로 이동한 뒤<br />GPS를 다시 확인해 주세요.</p>
      <Button onClick={onRetry}>GPS 다시 확인</Button>
      <Button variant="ghost" onClick={onClose}>홈으로 돌아가기</Button>
    </Overlay>
  )
}

export function NetworkOfflineState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="system-map-state">
      <BaseMapViewport className="system-map-state__map" ariaLabel="오프라인 상태의 산책 지도" fallback={{ src: '/assets/s07/map.jpg' }} />
      <div className="system-network-banner" role="alert"><WifiOff /><span><strong>인터넷 연결을 확인해주세요</strong><small>연결되면 자동으로 다시 시도해요.</small></span></div>
      <BottomSheet className="system-network-sheet">
        <h1>산책 기록은 기기에<br />임시 저장 중이에요.</h1>
        <p>연결이 돌아오면 안전하게 동기화합니다.</p>
        <Button onClick={onRetry}>다시 시도</Button>
      </BottomSheet>
    </div>
  )
}

export function CourseNotFoundState({ onRetryWith35, onReset }: { onRetryWith35: () => void; onReset: () => void }) {
  return (
    <main className="system-full-state">
      <h1 className="system-full-state__header">추천 코스</h1>
      <img className="system-mascot" src="/assets/mascot/animated/07-error-confused.gif" alt="고개를 갸웃하는 멍루트 마스코트" />
      <h2>조건에 맞는 코스를<br />못 찾았어요</h2>
      <p>시간을 5분 늘리거나 출발 지점을 조금 옮겨<br />다시 찾아보세요.</p>
      <div className="system-full-state__actions"><Button onClick={onRetryWith35}>35분으로 다시 찾기</Button><Button variant="secondary" onClick={onReset}>조건 다시 설정</Button></div>
    </main>
  )
}

function SkeletonCard({ record = false }: { record?: boolean }) {
  return <div className={`system-skeleton ${record ? 'system-skeleton--record' : ''}`} aria-hidden="true"><i /><i /><i /></div>
}

export function GpsCheckingState() {
  return (
    <main className="system-full-state system-loading-state">
      <h1>현재 위치를 확인하고 있어요</h1><p>망고가 출발 지점을 찾는 중이에요.</p>
      <img className="system-mascot" src="/assets/mascot/animated/01-walk-loop.gif" alt="걷고 있는 멍루트 마스코트" />
      <SkeletonCard /><div className="system-progress"><i /></div>
    </main>
  )
}

export function RecordSavingState() {
  return (
    <main className="system-full-state system-loading-state">
      <h1>산책 기록을 저장하고 있어요</h1><p>경로와 사진을 안전하게 정리하는 중이에요.</p>
      <img className="system-mascot" src="/assets/mascot/animated/06-walk-complete.gif" alt="산책을 마친 멍루트 마스코트" />
      <SkeletonCard record /><strong className="system-loading-state__wait">잠시만 기다려주세요</strong>
    </main>
  )
}
