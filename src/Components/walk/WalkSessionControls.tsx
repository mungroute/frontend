import { Volume2, VolumeX } from 'lucide-react'
import '../../styles/components/walk-session-controls.css'

type CommonWalkSessionControlsProps = {
  onStop?: () => void
  voiceEnabled?: boolean
  onVoiceEnabledChange?: (enabled: boolean) => void
}

type WalkSessionControlsProps = CommonWalkSessionControlsProps & (
  | { mode?: 'active'; onPause?: () => void; onResume?: never }
  | { mode: 'paused'; onResume?: () => void; onPause?: never }
)

const sharedControls = [
  { key: 'stop', label: '산책 종료', icon: '/assets/s07/icon-stop.svg' },
] as const

const activeControls = [{ key: 'pause', label: '일시정지', icon: '/assets/s07/icon-pause.svg' }, ...sharedControls] as const
const pausedControls = [{ key: 'resume', label: '산책 재개', icon: '/assets/st02/icon-resume.svg' }, ...sharedControls] as const

export function WalkSessionControls({ mode = 'active', onPause, onResume, onStop, voiceEnabled = true, onVoiceEnabledChange }: WalkSessionControlsProps) {
  const controls = mode === 'paused' ? pausedControls : activeControls
  const handlers = { pause: onPause, resume: onResume, stop: onStop }

  return (
    <div className="walk-session-controls" aria-label="산책 조작">
      {controls.map((control) => (
        <button key={control.key} className={`walk-session-controls__control walk-session-controls__${control.key}`} type="button" aria-label={control.label} onClick={handlers[control.key]}>
          <img src={control.icon} alt="" />
        </button>
      ))}
      <button
        className={`walk-session-controls__control walk-session-controls__voice${voiceEnabled ? ' walk-session-controls__voice--enabled' : ''}`}
        type="button"
        aria-label={voiceEnabled ? '내비게이션 음성 안내 끄기' : '내비게이션 음성 안내 켜기'}
        aria-pressed={voiceEnabled}
        onClick={() => onVoiceEnabledChange?.(!voiceEnabled)}
      >
        {voiceEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      </button>
    </div>
  )
}
