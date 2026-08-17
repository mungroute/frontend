import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ShieldCheck, Users } from 'lucide-react'
import { PresenceModeConfirmDialog } from '../system'
import type { LockedWalkPresenceMode } from '../../api/walks'
import '../../styles/components/distance-mode-control.css'

type PresenceModeControlProps = {
  mode?: LockedWalkPresenceMode | null
  enabled?: boolean
  onChange?: (enabled: boolean) => void
}

export function PresenceModeControl({ mode = 'distance', enabled, onChange }: PresenceModeControlProps) {
  const [localEnabled, setLocalEnabled] = useState(true)
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null)
  const resolvedEnabled = enabled ?? localEnabled
  const pageRoot = pendingEnabled === null ? null : document.querySelector('.journey-page')

  if (!mode) {
    return (
      <div className="walk-presence-mode-control walk-presence-mode-control--plain">
        <span className="walk-presence-mode-control__eyebrow">WALK MODE</span>
        <strong>일반 산책</strong>
        <small>주변 사용자 기능을 사용하지 않아요.</small>
      </div>
    )
  }

  const isDistance = mode === 'distance'
  const label = isDistance ? '거리두기 알림' : '산책 친구 만나기'

  const confirmChange = () => {
    if (pendingEnabled === null) return
    if (enabled === undefined) setLocalEnabled(pendingEnabled)
    onChange?.(pendingEnabled)
    setPendingEnabled(null)
  }

  return (
    <div className={`walk-presence-mode-control walk-presence-mode-control--${mode}`}>
      <button
        type="button"
        role="switch"
        aria-label={`${label} 모드`}
        aria-checked={resolvedEnabled}
        onClick={() => setPendingEnabled(!resolvedEnabled)}
      >
        <span className="walk-presence-mode-control__icon">{isDistance ? <ShieldCheck size={18} /> : <Users size={18} />}</span>
        <span className="walk-presence-mode-control__copy">
          <small>LOCKED MODE</small>
          <strong>{label}</strong>
        </span>
        <span className="walk-presence-mode-control__state">{resolvedEnabled ? 'ON' : 'OFF'}</span>
        <i aria-hidden="true"><b /></i>
      </button>
      {pendingEnabled !== null && pageRoot && createPortal(
        <PresenceModeConfirmDialog
          mode={mode}
          nextEnabled={pendingEnabled}
          onClose={() => setPendingEnabled(null)}
          onConfirm={confirmChange}
        />,
        pageRoot,
      )}
    </div>
  )
}

export function DistanceModeControl({ checked, onChange }: { checked?: boolean; onChange?: (checked: boolean) => void }) {
  return <PresenceModeControl mode="distance" enabled={checked} onChange={onChange} />
}
