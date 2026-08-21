import { useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import type { NearbyPresence, SafeDetourResult } from '../../../api/walks'
import { distanceBandLabels, distanceDirectionLabel, distanceTrendDescriptions } from '../../distance-alert/distance-alert-format'

const defaultAlert: NearbyPresence = {
  distanceBand: 'BAND_50_100',
  directionOctant: 7,
  directionSpread: 45,
  directionReference: 'MAP',
  trend: 'APPROACHING',
}

type DistanceAlertOverlayProps = {
  alert?: NearbyPresence
  onRequestDetour?: () => Promise<SafeDetourResult>
  onApplyDetour?: (result: SafeDetourResult) => void
}

export function DistanceAlertOverlay({ alert = defaultAlert, onRequestDetour, onApplyDetour }: DistanceAlertOverlayProps) {
  const [visible, setVisible] = useState(true)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<SafeDetourResult>()
  const [error, setError] = useState<string>()

  if (!visible) return null

  const dismiss = () => {
    if (!checking) setVisible(false)
  }
  const requestDetour = async () => {
    if (!onRequestDetour || checking) return
    setChecking(true)
    setError(undefined)
    try {
      setResult(await onRequestDetour())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '우회 경로를 확인하지 못했어요.')
    } finally {
      setChecking(false)
    }
  }
  return (
    <section
      className="navigation-distance-alert"
      aria-label="주변 접근 알림"
      aria-live="polite"
      role="status"
    >
      <button type="button" className="navigation-distance-alert__dismiss" aria-label="거리두기 알림 닫기" onClick={dismiss}>
        <X aria-hidden="true" />
      </button>
      <img src="/assets/mascot/states/04-distance-alert.png" alt="" />
      <div className="navigation-distance-alert__content">
        <h1>{result ? '안전 경로 안내' : '주변 접근 알림'}</h1>
        {result
          ? <p className={`navigation-distance-alert__result navigation-distance-alert__result--${result.decision.toLowerCase()}`}>{result.message}</p>
          : <>
              <strong>{distanceDirectionLabel(alert)} · {distanceBandLabels[alert.distanceBand]}</strong>
              <p>{checking ? '겹치지 않는 길을 확인하고 있어요.' : error ?? distanceTrendDescriptions[alert.trend]}</p>
              {Boolean(alert.additionalCount) && <p className="navigation-distance-alert__crowd">주변에 {alert.additionalCount}명이 더 감지됐어요.</p>}
            </>}
        {onRequestDetour && !result && (
          <button
            type="button"
            className="navigation-distance-alert__action"
            disabled={checking}
            onClick={(event) => {
              event.stopPropagation()
              void requestDetour()
            }}
          >
            {checking && <LoaderCircle className="navigation-distance-alert__spinner" aria-hidden="true" />}
            {checking ? '경로 확인 중' : error ? '다시 확인' : '다른 길로 안내'}
          </button>
        )}
        {result?.decision === 'DETOUR' && (
          <button
            type="button"
            className="navigation-distance-alert__action"
            onClick={(event) => {
              event.stopPropagation()
              onApplyDetour?.(result)
            }}
          >이 경로로 이동</button>
        )}
      </div>
    </section>
  )
}

