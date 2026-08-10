import { ErrorStatusPage } from '../Components/system'

export function ServerErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorStatusPage
      code="500"
      leadingDigit="5"
      trailingDigit="0"
      title="잠시 문제가 생겼어요"
      description="서버가 잠시 쉬어가는 중이에요. 조금 뒤 다시 시도해 주세요."
      actionLabel="다시 시도"
      mascotAlt="문제를 확인하는 멍루트 마스코트"
      onAction={onRetry}
    />
  )
}
