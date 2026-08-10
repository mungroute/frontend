export type CoursePoint = { x: number; y: number }

export const initialCoursePoints: CoursePoint[] = [
  { x: 12.3, y: 85.1 },
  { x: 27.4, y: 66.4 },
  { x: 45.1, y: 72.8 },
  { x: 62.3, y: 51.9 },
  { x: 88.6, y: 40.4 },
]

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
