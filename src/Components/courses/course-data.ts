export type CoursePoint = { x: number; y: number }

export const recommendedShadeHour = 18

export const drawnCourseSummary = {
  distanceKm: 2.4,
  durationMinutes: 36,
}

export type CourseShareOption = { id: string; title: string; meta: string }

export const courseShareOptions: CourseShareOption[] = [
  { id: 'namsan', title: '저녁 남산길', meta: '29분 · 1.8km · 그늘 68%' },
  { id: 'hangang', title: '한강 노을 산책', meta: '29분 · 1.8km · 그늘 68%' },
  { id: 'park', title: '조용한 공원길', meta: '29분 · 1.8km · 그늘 68%' },
]
