import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SplashPage } from './SplashPage'

describe('SplashPage', () => {
  it('introduces the service and exposes a non-visual loading status', () => {
    render(<SplashPage />)

    expect(screen.getByRole('heading', { name: '멍루트' })).toBeInTheDocument()
    expect(screen.getByText('산책은 길보다 시간이 먼저니까')).toBeInTheDocument()
    expect(screen.getByText('오늘의 시간과 날씨에 맞는 길을 찾아요')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('멍루트를 준비하고 있어요')
  })
})
