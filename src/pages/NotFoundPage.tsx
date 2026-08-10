import { ErrorStatusPage } from '../Components/system'

export function NotFoundPage({ onHome }: { onHome: () => void }) {
  return (
    <ErrorStatusPage
      code="404"
      leadingDigit="4"
      trailingDigit="4"
      title="페이지를 찾지 못했어요"
      description="주소가 바뀌었거나 아직 준비되지 않은 화면이에요."
      actionLabel="홈으로 돌아가기"
      mascotAlt="길을 찾는 멍루트 마스코트"
      onAction={onHome}
    />
  )
}
