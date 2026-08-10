import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ShadeTimelinePage } from './ShadeTimelinePage'

describe('ShadeTimelinePage', () => {
  it('shows the recommended shade hour and starts that walk', () => {
    const onWalkAtRecommended = vi.fn()
    render(<ShadeTimelinePage onWalkAtRecommended={onWalkAtRecommended} />)

    expect(screen.getByRole('region', { name: '코스 구간별 그늘 지도' })).toBeInTheDocument()
    expect(screen.getByText('18시 전후가 가장 시원해요')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '18시에 이 코스 걷기' }))
    expect(onWalkAtRecommended).toHaveBeenCalledOnce()
  })
})
