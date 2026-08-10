import { useState } from 'react'
import {
  CourseNotFoundState,
  CourseShareSheet,
  DeleteRecordDialog,
  GpsCheckingState,
  GpsErrorDialog,
  InviteShareSheet,
  LocationPermissionSheet,
  NetworkOfflineState,
  RecordMoreSheet,
  RecordSavingState,
  RenameCourseDialog,
  WalkEndDialog,
} from '../Components/system'
import type { SystemStateCase } from '../Components/system'
import { systemStateCases } from '../Components/system'
import { courseShareOptions } from '../Components/courses/course-data'
import { BaseMapViewport } from '../Components/map'
import { WalkDurationPage } from './WalkDurationPage'
import '../styles/pages/journey-page.css'
import '../styles/pages/system-states-preview-page.css'

type SystemStatesPreviewPageProps = {
  selectedCase?: SystemStateCase
  onSelect: (selectedCase?: SystemStateCase) => void
}

function PreviewBackground() {
  return <div className="system-preview__background"><BaseMapViewport className="system-preview__map" ariaLabel="모달 배경 산책 지도" fallback={{ src: '/assets/s07/map.jpg' }} /><div><strong>00:17:00</strong><span>진행 중인 산책 화면</span></div></div>
}

async function shareInvite() {
  try {
    if (navigator.share) {
      await navigator.share({ title: '멍루트 그룹 초대', text: '초대 코드 MUNG24' })
      return
    }
    await navigator.clipboard?.writeText('MUNG24')
  } catch {
    try {
      await navigator.clipboard?.writeText('MUNG24')
    } catch {
      // The preview remains usable when system sharing and clipboard access are unavailable.
    }
  }
}

function RecordMorePreview({ onClose, onDelete }: { onClose: () => void; onDelete: () => void }) {
  const [view, setView] = useState<'more' | 'rename' | 'share'>('more')
  if (view === 'rename') return <RenameCourseDialog initialName="저녁 남산길" onClose={() => setView('more')} onConfirm={() => setView('more')} />
  if (view === 'share') return <CourseShareSheet courses={courseShareOptions} onBack={() => setView('more')} onClose={onClose} onConfirm={onClose} />
  return <RecordMoreSheet onClose={onClose} onDelete={onDelete} onRename={() => setView('rename')} onShare={() => setView('share')} />
}

export function SystemStatesPreviewPage({ selectedCase, onSelect }: SystemStatesPreviewPageProps) {
  if (!selectedCase) {
    return (
      <main className="journey-page system-catalog">
        <header><span>C · SYSTEM</span><h1>모달 · 시스템 상태</h1><p>항목을 누르면 실제 모바일 크기로 확인할 수 있어요.</p></header>
        <div className="system-catalog__list">
          {systemStateCases.map((item) => (
            <button key={item.id} type="button" aria-label={`${item.code} ${item.title} 미리보기`} onClick={() => onSelect(item.id)}>
              <span className="system-catalog__code">{item.code}</span><span><strong>{item.title}</strong><small>{item.kind}</small></span><b aria-hidden="true">›</b>
            </button>
          ))}
        </div>
      </main>
    )
  }

  const close = () => onSelect(undefined)
  return (
    <main className="journey-page system-preview">
      <button className="system-preview__back" type="button" aria-label="미리보기 목록" onClick={close}>‹</button>
      {selectedCase === 'm03' ? <WalkDurationPage initialDepartureDialogOpen /> : (
        <div className="system-preview__stage">
          {['m01', 'm02', 'm05', 'm06', 'm07', 'm08', 'm09'].includes(selectedCase) && <PreviewBackground />}
          {selectedCase === 'm01' && <LocationPermissionSheet onClose={close} />}
          {selectedCase === 'm02' && <GpsErrorDialog onClose={close} />}
          {selectedCase === 'm05' && <WalkEndDialog onClose={close} onConfirm={close} />}
          {selectedCase === 'm06' && <RecordMorePreview onClose={close} onDelete={() => onSelect('m07')} />}
          {selectedCase === 'm07' && <DeleteRecordDialog onClose={close} onConfirm={close} />}
          {selectedCase === 'm08' && <InviteShareSheet onClose={close} onShareInvite={() => { void shareInvite() }} />}
          {selectedCase === 'm09' && <CourseShareSheet courses={courseShareOptions} onBack={close} onClose={close} onConfirm={close} />}
          {selectedCase === 'o01' && <NetworkOfflineState onRetry={close} />}
          {selectedCase === 'st03' && <CourseNotFoundState onRetryWith35={close} onReset={close} />}
          {selectedCase === 'l01' && <GpsCheckingState />}
          {selectedCase === 'l03' && <RecordSavingState />}
        </div>
      )}
    </main>
  )
}
