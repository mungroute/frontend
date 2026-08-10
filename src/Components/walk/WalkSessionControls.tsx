import { useRef } from 'react'
import '../../styles/components/walk-session-controls.css'

type CommonWalkSessionControlsProps = {
  onStop?: () => void
  onPhoto?: () => void
}

type WalkSessionControlsProps = CommonWalkSessionControlsProps & (
  | { mode?: 'active'; onPause?: () => void; onResume?: never }
  | { mode: 'paused'; onResume?: () => void; onPause?: never }
)

const sharedControls = [
  { key: 'stop', label: '산책 종료', icon: '/assets/s07/icon-stop.svg' },
  { key: 'photo', label: '사진 촬영', icon: '/assets/s07/icon-photo.svg' },
] as const

const activeControls = [{ key: 'pause', label: '일시정지', icon: '/assets/s07/icon-pause.svg' }, ...sharedControls] as const
const pausedControls = [{ key: 'resume', label: '산책 재개', icon: '/assets/st02/icon-resume.svg' }, ...sharedControls] as const

export function WalkSessionControls({ mode = 'active', onPause, onResume, onStop, onPhoto }: WalkSessionControlsProps) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const controls = mode === 'paused' ? pausedControls : activeControls
  const openCamera = () => {
    onPhoto?.()
    photoInputRef.current?.click()
  }
  const handlers = { pause: onPause, resume: onResume, stop: onStop, photo: openCamera }

  return (
    <div className="walk-session-controls" aria-label="산책 조작">
      {controls.map((control) => (
        <button key={control.key} className={`walk-session-controls__control walk-session-controls__${control.key}`} type="button" aria-label={control.label} onClick={handlers[control.key]}>
          <img src={control.icon} alt="" />
        </button>
      ))}
      <input ref={photoInputRef} className="walk-session-controls__photo-input" type="file" accept="image/*" capture="environment" aria-label="산책 사진 선택" />
    </div>
  )
}
