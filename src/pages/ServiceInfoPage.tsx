import { ServiceInfoRow } from '../Components/profile/ServiceInfoRow'
import { ManagementPageHeader } from '../Components/ui'
import '../styles/pages/journey-page.css'
import '../styles/pages/extended-profile-pages.css'

export type ServiceInfoSection = 'version' | 'terms' | 'privacy' | 'licenses'

type ServiceInfoPageProps = {
  onBack?: () => void
  onOpen?: (section: ServiceInfoSection) => void
  selectedSection?: ServiceInfoSection
}

const serviceInfoSections: Array<{ id: ServiceInfoSection; title: string; description?: string }> = [
  { id: 'version', title: '앱 버전', description: '1.0.0' },
  { id: 'terms', title: '이용약관' },
  { id: 'privacy', title: '개인정보 처리방침' },
  { id: 'licenses', title: '오픈소스 라이선스' },
]

const serviceInfoDetails: Record<ServiceInfoSection, { title: string; body: string[] }> = {
  version: { title: '앱 버전', body: ['현재 버전 1.0.0', '멍루트의 최신 기능과 안정성 개선이 적용된 버전이에요.'] },
  terms: { title: '이용약관', body: ['멍루트는 안전한 산책 코스 탐색과 기록 관리를 돕는 서비스예요.', '서비스 이용 시 다른 사용자와 반려견의 안전을 함께 배려해 주세요.'] },
  privacy: { title: '개인정보 처리방침', body: ['위치 정보는 산책 기능을 사용하는 동안에만 확인해요.', '정확한 위치는 다른 사용자에게 공개하지 않고 필요한 범위로 흐려서 처리해요.'] },
  licenses: { title: '오픈소스 라이선스', body: ['멍루트는 React, Vite, Lucide 등 오픈소스 소프트웨어를 사용하고 있어요.', '각 프로젝트의 저작권과 라이선스 조건을 준수합니다.'] },
}

export function ServiceInfoPage({ onBack, onOpen, selectedSection }: ServiceInfoPageProps) {
  if (selectedSection) {
    const detail = serviceInfoDetails[selectedSection]
    return (
      <main className="journey-page extended-profile-page service-info-page service-info-page--detail">
        <ManagementPageHeader title={detail.title} onBack={onBack} />
        <section className="service-info-page__detail">
          {detail.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      </main>
    )
  }

  return (
    <main className="journey-page extended-profile-page service-info-page">
      <ManagementPageHeader title="서비스 정보" onBack={onBack} />
      <section className="service-info-page__brand" aria-label="멍루트 서비스 소개">
        <img src="/assets/i01/logo-horizontal.png" alt="멍루트" />
        <strong>멍루트</strong>
        <p>강아지와 더 편안한 산책 경로</p>
      </section>
      <div className="service-info-page__rows">
        {serviceInfoSections.map((section) => <ServiceInfoRow key={section.id} title={section.title} description={section.description} onClick={onOpen ? () => onOpen(section.id) : undefined} />)}
      </div>
      <p className="service-info-page__copyright">© 2026 MungRoute</p>
    </main>
  )
}
