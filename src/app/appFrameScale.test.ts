import { describe, expect, it } from 'vitest'
import { appFrameScale } from './appFrameScale'

describe('appFrameScale', () => {
  it('keeps the design at 1:1 scale when the monitor has enough height', () => {
    expect(appFrameScale(1_080)).toBe(1)
  })

  it('uniformly scales the full frame to leave vertical room on a laptop', () => {
    expect(appFrameScale(696)).toBeCloseTo(648 / 820)
  })
})
