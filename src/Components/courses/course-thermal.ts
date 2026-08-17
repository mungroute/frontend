import type { CourseTemperatureGrade } from '../../api/courses'

export const COURSE_REFERENCE_HOURS = [9, 12, 15, 18] as const

export const temperatureColor = (grade: CourseTemperatureGrade) => ({
  LOW: '#20BFA9',
  MODERATE: '#E4B94F',
  HIGH: '#F47B50',
  VERY_HIGH: '#E64E6C',
}[grade])

export const requestedAtForHour = (hour: number) => {
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return `${kstDate}T${String(hour).padStart(2, '0')}:00:00+09:00`
}
