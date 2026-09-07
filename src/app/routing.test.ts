import { describe, expect, it } from 'vitest'
import { readDuration, readWalkReturnTo, walkSelectionUrl } from './routing'

describe('app routing contracts', () => {
  it('keeps an allowed same-origin return path and its search parameters', () => {
    expect(readWalkReturnTo(
      '?returnTo=%2Fcourses%2Fdetail%3Fsource%3DWALK%26courseId%3D7',
      'https://mungroute.example',
    )).toBe('/courses/detail?source=WALK&courseId=7')
  })

  it('rejects external and unknown return paths', () => {
    expect(readWalkReturnTo(
      '?returnTo=https%3A%2F%2Fevil.example%2Fcourses%2Fdetail',
      'https://mungroute.example',
    )).toBe('/home')
    expect(readWalkReturnTo('?returnTo=%2Fadmin', 'https://mungroute.example')).toBe('/home')
  })

  it('preserves the walk selection URL contract', () => {
    expect(walkSelectionUrl('/home?tab=course', { duration: 30, source: 'WALK' }))
      .toBe('/walk/dogs?returnTo=%2Fhome%3Ftab%3Dcourse&duration=30&source=WALK')
  })

  it('accepts only supported five-minute duration increments', () => {
    expect(readDuration('?duration=45')).toBe(45)
    expect(readDuration('?duration=46')).toBe(30)
    expect(readDuration('?duration=5')).toBe(30)
  })
})
