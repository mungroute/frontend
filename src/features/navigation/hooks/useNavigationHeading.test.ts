import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useNavigationHeading } from './useNavigationHeading'

describe('useNavigationHeading', () => {
  it('uses the route direction and reaches the full turn bearing', async () => {
    const position = {
      coordinate: { latitude: 37.56, longitude: 126.98 },
      accuracy: 5,
      observedAt: 1,
      heading: 270,
      speed: 1,
    }
    const view = renderHook(
      ({ routeBearing }) => useNavigationHeading(position, [], routeBearing),
      { initialProps: { routeBearing: 0 } },
    )

    await waitFor(() => expect(view.result.current).toBe(0))
    view.rerender({ routeBearing: 90 })

    await waitFor(() => expect(view.result.current).toBe(90))
  })
})
