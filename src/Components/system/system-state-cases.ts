export type SystemStateCase = 'm01' | 'm03' | 'm05' | 'm06' | 'm07' | 'm08' | 'm09' | 'o01' | 'm02' | 'st03' | 'l01' | 'l03'

export const systemStateCases: Array<{ id: SystemStateCase; code: string; title: string; kind: string }> = [
  { id: 'm01', code: 'M-01', title: '위치 권한', kind: '모달' },
  { id: 'm03', code: 'M-03', title: '출발 시각', kind: '바텀 시트' },
  { id: 'm05', code: 'M-05', title: '산책 종료 확인', kind: '확인 모달' },
  { id: 'm06', code: 'M-06', title: '기록 더보기', kind: '바텀 시트' },
  { id: 'm07', code: 'M-07', title: '기록 삭제 확인', kind: '경고 모달' },
  { id: 'm08', code: 'M-08', title: '초대 공유', kind: '바텀 시트' },
  { id: 'm09', code: 'M-09', title: '코스 공유', kind: '선택 시트' },
  { id: 'o01', code: 'O-01', title: '네트워크 끊김', kind: '배너 + 시트' },
  { id: 'm02', code: 'M-02', title: 'GPS 오류', kind: '오류 모달' },
  { id: 'st03', code: 'ST-03', title: '추천 코스 없음', kind: '빈 상태' },
  { id: 'l01', code: 'L-01', title: 'GPS 확인 중', kind: '로딩 상태' },
  { id: 'l03', code: 'L-03', title: '기록 저장 중', kind: '로딩 상태' },
]

const systemStateCaseIds = new Set<SystemStateCase>(systemStateCases.map((item) => item.id))
export function isSystemStateCase(value: string | null): value is SystemStateCase {
  return value !== null && systemStateCaseIds.has(value as SystemStateCase)
}
