import { useState } from 'react'
import { createPortal } from 'react-dom'
import { DistanceModeConfirmDialog } from '../system'
import { Switch } from '../ui'
import '../../styles/components/distance-mode-control.css'

type DistanceModeControlProps = {
  checked?: boolean
  onChange?: (checked: boolean) => void
}

export function DistanceModeControl({ checked, onChange }: DistanceModeControlProps) {
  const [localChecked, setLocalChecked] = useState(true)
  const [pendingChecked, setPendingChecked] = useState<boolean | null>(null)
  const resolvedChecked = checked ?? localChecked
  const pageRoot = pendingChecked === null ? null : document.querySelector('.journey-page')

  const confirmChange = () => {
    if (pendingChecked === null) return
    if (checked === undefined) setLocalChecked(pendingChecked)
    onChange?.(pendingChecked)
    setPendingChecked(null)
  }

  return (
    <div className="walk-distance-mode-control">
      <Switch checked={resolvedChecked} onChange={setPendingChecked} label="거리두기" />
      {pendingChecked !== null && pageRoot && createPortal(
        <DistanceModeConfirmDialog
          nextChecked={pendingChecked}
          onClose={() => setPendingChecked(null)}
          onConfirm={confirmChange}
        />,
        pageRoot,
      )}
    </div>
  )
}
